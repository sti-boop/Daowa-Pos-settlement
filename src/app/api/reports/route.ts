import { db } from '@/lib/accounting-db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: compute closing balance for a ledger within a date range
async function getLedgerBalance(ledgerId: string, toDate: string) {
  const ledger = await db.ledger.findUnique({ where: { id: ledgerId } });
  if (!ledger) return { opening: 0, debit: 0, credit: 0, closing: 0, balanceType: 'Dr' };

  const entries = await db.voucherEntry.findMany({
    where: {
      ledgerId,
      voucher: { date: { lte: toDate } },
    },
  });

  let totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  let totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  let opening = ledger.openingBalance;
  if (ledger.balanceType === 'Cr') opening = -opening;

  const net = opening + totalDebit - totalCredit;
  const balanceType = net >= 0 ? 'Dr' : 'Cr';
  return {
    opening: Math.abs(opening),
    debit: totalDebit,
    credit: totalCredit,
    closing: Math.abs(net),
    balanceType,
  };
}

/**
 * BULK ledger balances — one aggregated query for ALL ledgers at once.
 * Returns Map<ledgerId, { debit, credit }> for entries up to toDate.
 */
async function getBulkLedgerEntryTotals(toDate: string): Promise<Map<string, { debit: number; credit: number }>> {
  const grouped = await db.voucherEntry.groupBy({
    by: ['ledgerId'],
    where: { voucher: { date: { lte: toDate } } },
    _sum: { debit: true, credit: true },
  });
  const map = new Map<string, { debit: number; credit: number }>();
  for (const g of grouped) {
    map.set(g.ledgerId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 });
  }
  return map;
}

/**
 * BULK group totals — replaces the old per-ledger loop in getGroupTotals.
 * Fetches groups + ledgers + ONE aggregated entries query, then folds in memory.
 * fromDate undefined/empty = all entries up to toDate (opening-style totals).
 */
async function getGroupTotals(nature: string, fromDate: string | undefined, toDate: string) {
  const groups = await db.ledgerGroup.findMany({
    where: { nature },
    include: { ledgers: { where: { isActive: true } } },
  });

  // One aggregated query for ALL voucher entries in range
  const hasRange = !!fromDate;
  const grouped = await db.voucherEntry.groupBy({
    by: ['ledgerId'],
    where: hasRange
      ? { voucher: { date: { gte: fromDate, lte: toDate } } }
      : { voucher: { date: { lte: toDate } } },
    _sum: { debit: true, credit: true },
  });
  const entryMap = new Map<string, { debit: number; credit: number }>();
  for (const g of grouped) {
    entryMap.set(g.ledgerId, { debit: g._sum.debit ?? 0, credit: g._sum.credit ?? 0 });
  }

  const result: Record<string, { openingDr: number; openingCr: number; debit: number; credit: number; closingDr: number; closingCr: number }> = {};

  for (const group of groups) {
    let openingDr = 0, openingCr = 0, debit = 0, credit = 0;

    for (const ledger of group.ledgers) {
      const totals = entryMap.get(ledger.id) || { debit: 0, credit: 0 };
      debit += totals.debit;
      credit += totals.credit;

      if (ledger.balanceType === 'Dr') openingDr += ledger.openingBalance;
      else openingCr += ledger.openingBalance;
    }

    const net = (openingDr - openingCr) + (debit - credit);
    result[group.name] = {
      openingDr, openingCr, debit, credit,
      closingDr: net > 0 ? net : 0,
      closingCr: net < 0 ? Math.abs(net) : 0,
    };
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const report = searchParams.get('report') || 'trial-balance';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0];

    switch (report) {
      case 'trial-balance': return trialBalance(to);
      case 'pnl': return profitLoss(from, to);
      case 'balance-sheet': return balanceSheet(to);
      case 'day-book': return dayBook(from, to);
      case 'ledger-report': return ledgerReport(searchParams);
      case 'sales-register': return salesRegister(from, to);
      case 'purchase-register': return purchaseRegister(from, to);
      case 'stock-summary': return stockSummary();
      case 'vat-report': return vatReport(from, to);
      default: return NextResponse.json({ error: 'Unknown report' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function trialBalance(toDate: string) {
  const ledgers = await db.ledger.findMany({ where: { isActive: true }, include: { group: true } });
  const rows = [];

  // ONE aggregated query for all ledger entry totals (replaces 2×N per-ledger queries)
  const entryTotals = await getBulkLedgerEntryTotals(toDate);

  let totalDebit = 0, totalCredit = 0;

  for (const ledger of ledgers) {
    const totals = entryTotals.get(ledger.id) || { debit: 0, credit: 0 };
    let opening = ledger.openingBalance;
    if (ledger.balanceType === 'Cr') opening = -opening;
    const net = opening + totals.debit - totals.credit;
    const closing = Math.abs(net);
    if (closing === 0) continue; // Skip zero-balance ledgers
    const row = {
      ledgerName: ledger.name,
      groupName: ledger.groupName,
      nature: ledger.group?.nature || '',
      debit: 0,
      credit: 0,
    };
    if (net >= 0) {
      row.debit = parseFloat(closing.toFixed(2));
      totalDebit += row.debit;
    } else {
      row.credit = parseFloat(closing.toFixed(2));
      totalCredit += row.credit;
    }
    rows.push(row);
  }

  return NextResponse.json({ rows, totalDebit: parseFloat(totalDebit.toFixed(2)), totalCredit: parseFloat(totalCredit.toFixed(2)) });
}

async function profitLoss(fromDate: string, toDate: string) {
  const [income, expense] = await Promise.all([
    getGroupTotals('Income', fromDate || undefined, toDate),
    getGroupTotals('Expense', fromDate || undefined, toDate),
  ]);

  let totalIncome = 0, totalExpense = 0;
  const incomeRows: { group: string; amount: number }[] = [];
  const expenseRows: { group: string; amount: number }[] = [];

  for (const [name, data] of Object.entries(income)) {
    const net = data.credit - data.debit + (data.openingCr - data.openingDr);
    if (net !== 0) {
      incomeRows.push({ group: name, amount: parseFloat(Math.abs(net).toFixed(2)) });
      totalIncome += Math.abs(net);
    }
  }

  for (const [name, data] of Object.entries(expense)) {
    const net = data.debit - data.credit + (data.openingDr - data.openingCr);
    if (net !== 0) {
      expenseRows.push({ group: name, amount: parseFloat(Math.abs(net).toFixed(2)) });
      totalExpense += Math.abs(net);
    }
  }

  const netProfit = totalIncome - totalExpense;
  return NextResponse.json({
    fromDate, toDate,
    income: incomeRows, expense: expenseRows,
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    totalExpense: parseFloat(totalExpense.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
  });
}

async function balanceSheet(toDate: string) {
  // Parallel: all natures + the single bulk entries aggregation reused via empty-from getGroupTotals
  const [assets, liabilities, equity] = await Promise.all([
    getGroupTotals('Asset', undefined, toDate),
    getGroupTotals('Liability', undefined, toDate),
    getGroupTotals('Equity', undefined, toDate),
  ]);

  let totalAssets = 0, totalLiabilities = 0;
  const assetRows: { group: string; amount: number; subRows: { name: string; amount: number }[] }[] = [];
  const liabilityRows: { group: string; amount: number; subRows: { name: string; amount: number }[] }[] = [];

  // Compute P&L surplus/deficit inline (avoids NextResponse round-trip re-serialization)
  const [incomeForPnl, expenseForPnl] = await Promise.all([
    getGroupTotals('Income', undefined, toDate),
    getGroupTotals('Expense', undefined, toDate),
  ]);
  let pnlIncome = 0, pnlExpense = 0;
  for (const data of Object.values(incomeForPnl)) {
    const net = data.credit - data.debit + (data.openingCr - data.openingDr);
    if (net !== 0) pnlIncome += Math.abs(net);
  }
  for (const data of Object.values(expenseForPnl)) {
    const net = data.debit - data.credit + (data.openingDr - data.openingCr);
    if (net !== 0) pnlExpense += Math.abs(net);
  }
  const surplusDeficit = pnlIncome - pnlExpense;

  for (const [name, data] of Object.entries(assets)) {
    const net = (data.openingDr - data.openingCr) + (data.debit - data.credit);
    if (net !== 0) {
      assetRows.push({
        group: name,
        amount: parseFloat(Math.abs(net).toFixed(2)),
        subRows: [],
      });
      totalAssets += Math.abs(net);
    }
  }

  for (const [name, data] of Object.entries(liabilities)) {
    const net = (data.openingCr - data.openingDr) + (data.credit - data.debit);
    if (net !== 0) {
      liabilityRows.push({
        group: name,
        amount: parseFloat(Math.abs(net).toFixed(2)),
        subRows: [],
      });
      totalLiabilities += Math.abs(net);
    }
  }

  // Add Equity groups to liabilities side
  for (const [name, data] of Object.entries(equity)) {
    const net = (data.openingCr - data.openingDr) + (data.credit - data.debit);
    if (net !== 0) {
      liabilityRows.push({
        group: name,
        amount: parseFloat(Math.abs(net).toFixed(2)),
        subRows: [],
      });
      totalLiabilities += Math.abs(net);
    }
  }

  // Add P&L to liabilities (skip if zero)
  if (surplusDeficit !== 0) {
    liabilityRows.push({
      group: surplusDeficit >= 0 ? 'Surplus (P&L)' : 'Deficit (P&L)',
      amount: parseFloat(Math.abs(surplusDeficit).toFixed(2)),
      subRows: [],
    });
    totalLiabilities += Math.abs(surplusDeficit);
  }

  return NextResponse.json({
    toDate,
    assets: assetRows,
    liabilities: liabilityRows,
    totalAssets: parseFloat(totalAssets.toFixed(2)),
    totalLiabilities: parseFloat(totalLiabilities.toFixed(2)),
    difference: parseFloat(Math.abs(totalAssets - totalLiabilities).toFixed(2)),
  });
}

async function dayBook(fromDate: string, toDate: string) {
  const vouchers = await db.voucher.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    include: {
      voucherType: true,
      entries: { include: { ledger: { select: { name: true } } } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  const rows = vouchers.map(v => ({
    id: v.id,
    date: v.date,
    voucherType: v.voucherType.name,
    voucherNumber: v.voucherNumber,
    narration: v.narration,
    debitTotal: v.entries.reduce((s, e) => s + e.debit, 0),
    creditTotal: v.entries.reduce((s, e) => s + e.credit, 0),
    entries: v.entries.map(e => ({
      ledgerName: e.ledgerName,
      debit: e.debit,
      credit: e.credit,
    })),
  }));

  const totalDebit = rows.reduce((s, r) => s + r.debitTotal, 0);
  const totalCredit = rows.reduce((s, r) => s + r.creditTotal, 0);

  return NextResponse.json({ rows, totalDebit, totalCredit, fromDate, toDate });
}

async function ledgerReport(searchParams: URLSearchParams) {
  const ledgerId = searchParams.get('ledgerId');
  if (!ledgerId) return NextResponse.json({ error: 'ledgerId required' }, { status: 400 });
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || new Date().toISOString().split('T')[0];

  const ledger = await db.ledger.findUnique({ where: { id: ledgerId }, include: { group: true } });
  if (!ledger) return NextResponse.json({ error: 'Ledger not found' }, { status: 404 });

  const dateFilter: Record<string, unknown> = {};
  if (from && to) dateFilter.date = { gte: from, lte: to };

  const entries = await db.voucherEntry.findMany({
    where: { ledgerId, voucher: dateFilter as never },
    include: { voucher: { include: { voucherType: true } } },
    orderBy: { voucher: { date: 'desc' } },
  });

  // Compute running balance
  let running = ledger.openingBalance * (ledger.balanceType === 'Cr' ? -1 : 1);

  // Add entries before 'from' date
  if (from) {
    const priorEntries = await db.voucherEntry.findMany({
      where: { ledgerId, voucher: { date: { lt: from } } },
    });
    for (const e of priorEntries) {
      running += e.debit - e.credit;
    }
  }

  const rows = entries.map(e => {
    running += e.debit - e.credit;
    return {
      date: e.voucher.date,
      voucherType: e.voucher.voucherType.name,
      voucherNumber: e.voucher.voucherNumber,
      narration: e.voucher.narration,
      debit: e.debit,
      credit: e.credit,
      balance: Math.abs(running),
      balanceType: running >= 0 ? 'Dr' : 'Cr',
    };
  });

  const closingBalance = Math.abs(running);

  return NextResponse.json({
    ledger: { name: ledger.name, group: ledger.groupName, nature: ledger.group?.nature },
    openingBalance: ledger.openingBalance,
    openingType: ledger.balanceType,
    from, to,
    entries: rows,
    totalDebit: rows.reduce((s, r) => s + r.debit, 0),
    totalCredit: rows.reduce((s, r) => s + r.credit, 0),
    closingBalance: parseFloat(closingBalance.toFixed(2)),
    closingType: running >= 0 ? 'Dr' : 'Cr',
  });
}

async function salesRegister(fromDate: string, toDate: string) {
  const vt = await db.voucherType.findUnique({ where: { name: 'Sales' } });
  if (!vt) return NextResponse.json({ rows: [], total: 0, totalTax: 0 });

  const vouchers = await db.voucher.findMany({
    where: { voucherTypeId: vt.id, date: { gte: fromDate, lte: toDate } },
    include: {
      entries: { include: { ledger: { select: { name: true } } } },
      stockEntries: true,
    },
    orderBy: { date: 'desc' },
  });

  const rows = vouchers.map(v => ({
    id: v.id,
    date: v.date,
    voucherNumber: v.voucherNumber,
    party: v.entries.find(e => e.credit > 0)?.ledgerName || '',
    amount: v.totalAmount,
    tax: v.entries.reduce((s, e) => s + e.taxAmount, 0),
    items: v.stockEntries.map(s => ({ name: s.itemName, qty: s.quantity, rate: s.rate, value: s.value })),
  }));

  return NextResponse.json({
    rows,
    total: parseFloat(rows.reduce((s, r) => s + r.amount, 0).toFixed(2)),
    totalTax: parseFloat(rows.reduce((s, r) => s + r.tax, 0).toFixed(2)),
    fromDate, toDate,
  });
}

async function purchaseRegister(fromDate: string, toDate: string) {
  const vt = await db.voucherType.findUnique({ where: { name: 'Purchase' } });
  if (!vt) return NextResponse.json({ rows: [], total: 0, totalTax: 0 });

  const vouchers = await db.voucher.findMany({
    where: { voucherTypeId: vt.id, date: { gte: fromDate, lte: toDate } },
    include: {
      entries: { include: { ledger: { select: { name: true } } } },
      stockEntries: true,
    },
    orderBy: { date: 'desc' },
  });

  const rows = vouchers.map(v => ({
    id: v.id,
    date: v.date,
    voucherNumber: v.voucherNumber,
    party: v.entries.find(e => e.debit > 0)?.ledgerName || '',
    amount: v.totalAmount,
    tax: v.entries.reduce((s, e) => s + e.taxAmount, 0),
    items: v.stockEntries.map(s => ({ name: s.itemName, qty: s.quantity, rate: s.rate, value: s.value })),
  }));

  return NextResponse.json({
    rows,
    total: parseFloat(rows.reduce((s, r) => s + r.amount, 0).toFixed(2)),
    totalTax: parseFloat(rows.reduce((s, r) => s + r.tax, 0).toFixed(2)),
    fromDate, toDate,
  });
}

async function stockSummary() {
  const items = await db.stockItem.findMany({
    where: { isActive: true },
    include: {
      group: true,
      transactions: true,
    },
  });

  const rows = items.map(item => {
    const inwardQty = item.transactions.filter(t => t.type === 'Inward').reduce((s, t) => s + t.quantity, 0);
    const outwardQty = item.transactions.filter(t => t.type === 'Outward').reduce((s, t) => s + t.quantity, 0);
    const closingQty = item.openingQty + inwardQty - outwardQty;
    const avgRate = closingQty > 0 ? (item.openingValue + item.transactions.reduce((s, t) => s + t.value, 0)) / closingQty : 0;

    return {
      id: item.id,
      name: item.name,
      group: item.groupName,
      hsnCode: item.hsnCode,
      unit: item.unit,
      openingQty: item.openingQty,
      inwardQty,
      outwardQty,
      closingQty: parseFloat(closingQty.toFixed(2)),
      closingValue: parseFloat((closingQty * avgRate).toFixed(2)),
      minStockLevel: item.minStockLevel,
      isLow: closingQty <= item.minStockLevel,
    };
  });

  const totalValue = rows.reduce((s, r) => s + r.closingValue, 0);
  const lowStockItems = rows.filter(r => r.isLow);

  return NextResponse.json({
    rows,
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalItems: rows.length,
    lowStockCount: lowStockItems.length,
    lowStockItems,
  });
}

async function vatReport(fromDate: string, toDate: string) {
  const vouchers = await db.voucher.findMany({
    where: { date: { gte: fromDate, lte: toDate } },
    include: { entries: true, voucherType: true },
  });

  let outputVAT = 0, inputVAT = 0;

  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.taxAmount === 0) continue;
      if (v.voucherType.name === 'Sales' || v.voucherType.name === 'CreditNote') {
        outputVAT += e.taxAmount;
      } else if (v.voucherType.name === 'Purchase' || v.voucherType.name === 'DebitNote') {
        inputVAT += e.taxAmount;
      }
    }
  }

  return NextResponse.json({
    fromDate, toDate,
    outputVAT: parseFloat(outputVAT.toFixed(2)),
    inputVAT: parseFloat(inputVAT.toFixed(2)),
    netPayable: parseFloat(Math.max(0, outputVAT - inputVAT).toFixed(2)),
    netRefund: parseFloat(Math.max(0, inputVAT - outputVAT).toFixed(2)),
  });
}