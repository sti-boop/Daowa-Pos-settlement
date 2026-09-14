import { db } from '@/lib/accounting-db';
import { NextRequest, NextResponse } from 'next/server';

/** Resolve date range + label from ?period= param */
function resolvePeriod(period: string | null): { from: string; to: string; label: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const iso = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'last-month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(first), to: iso(last), label: 'Last Month' };
  }

  if (period === 'fy' || period === 'last-fy') {
    // Bangladesh fiscal year: Jul 1 – Jun 30. Current FY = the one containing today.
    const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1; // FY starts July (month idx 6)
    const startYear = period === 'last-fy' ? y - 1 : y;
    const label = `FY ${String(startYear % 100).padStart(2, '0')}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    return { from: `${startYear}-07-01`, to: `${startYear + 1}-06-30`, label };
  }

  if (period === 'all') {
    return { from: '1970-01-01', to: today, label: 'All Time' };
  }

  // Default: this month
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: iso(first), to: today, label: 'This Month' };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { from: periodFrom, to: periodTo, label: periodLabel } = resolvePeriod(searchParams.get('period'));
    const today = new Date().toISOString().split('T')[0];

    // Company info
    const company = await db.company.findFirst();

    // Voucher type lookup (single query)
    const voucherTypes = await db.voucherType.findMany({
      where: { name: { in: ['Income', 'Expense', 'Sales'] } },
      select: { id: true, name: true },
    });
    const vtMap = Object.fromEntries(voucherTypes.map(v => [v.name, v.id]));
    const incomeVTId = vtMap['Income'];
    const expenseVTId = vtMap['Expense'];
    const salesVTId = vtMap['Sales'];

    // Count vouchers + sum income/expenses in the selected period
    const [vouchersThisMonth, incomeSum, expenseSum] = await Promise.all([
      db.voucher.count({ where: { date: { gte: periodFrom, lte: periodTo } } }),
      incomeVTId
        ? db.voucher.aggregate({
            _sum: { totalAmount: true },
            where: { voucherTypeId: incomeVTId, date: { gte: periodFrom, lte: periodTo } },
          }).then(r => r._sum.totalAmount ?? 0)
        : Promise.resolve(0),
      expenseVTId
        ? db.voucher.aggregate({
            _sum: { totalAmount: true },
            where: { voucherTypeId: expenseVTId, date: { gte: periodFrom, lte: periodTo } },
          }).then(r => r._sum.totalAmount ?? 0)
        : Promise.resolve(0),
    ]);

    // Ledger count
    const ledgerCount = await db.ledger.count({ where: { isActive: true } });

    // Cash balances — use aggregate on voucher entries instead of N+1
    async function computeCashBalance(groupName: string) {
      const ledgers = await db.ledger.findMany({
        where: { groupName, isActive: true },
        select: { id: true, openingBalance: true, balanceType: true },
      });
      if (ledgers.length === 0) return 0;
      const ledgerIds = ledgers.map(l => l.id);
      const entrySums = await db.voucherEntry.groupBy({
        by: ['ledgerId'],
        where: { ledgerId: { in: ledgerIds } },
        _sum: { debit: true, credit: true },
      });
      const sumMap = Object.fromEntries(
        entrySums.map(e => [e.ledgerId, (e._sum.debit ?? 0) - (e._sum.credit ?? 0)])
      );
      let total = 0;
      for (const l of ledgers) {
        const net = l.openingBalance + (sumMap[l.id] ?? 0);
        total += l.balanceType === 'Dr' ? net : -net;
      }
      return total;
    }

    const [cashInHand, cashAtBank] = await Promise.all([
      computeCashBalance('Cash In Hand'),
      computeCashBalance('Cash at Bank'),
    ]);

    // Recent vouchers
    const recentVouchers = await db.voucher.findMany({
      take: 10,
      include: { voucherType: true, entries: { take: 2 } },
      orderBy: { createdAt: 'desc' },
    });

    // Monthly income trend — aggregate instead of loading all vouchers.
    // FY periods show all months of that fiscal year; other periods show last 6 months.
    const monthlySales: { month: string; amount: number }[] = [];
    const isFyPeriod = searchParams.get('period') === 'fy' || searchParams.get('period') === 'last-fy';
    if (incomeVTId) {
      const trendFrom = isFyPeriod ? periodFrom : new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split('T')[0];
      const trendTo = isFyPeriod ? periodTo : today;

      const monthlyAgg = await db.voucher.groupBy({
        by: ['date'],
        where: { voucherTypeId: incomeVTId, date: { gte: trendFrom, lte: trendTo } },
        _sum: { totalAmount: true },
      });

      const monthMap = new Map<string, number>();
      for (const row of monthlyAgg) {
        const d = new Date(row.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(key, (monthMap.get(key) ?? 0) + (row._sum.totalAmount ?? 0));
      }

      // Build month list: FY → Jul..Jun of that FY; else → last 6 months
      const months: Date[] = [];
      if (isFyPeriod) {
        const startYear = parseInt(periodFrom.slice(0, 4), 10);
        for (let m = 6; m <= 17; m++) {
          months.push(new Date(startYear, m, 1)); // month idx 6 = July
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          months.push(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1));
        }
      }

      for (const d of months) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('en-BD', { month: 'short', year: '2-digit' });
        monthlySales.push({ month: monthLabel, amount: parseFloat((monthMap.get(key) ?? 0).toFixed(2)) });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthlySales.push({ month: d.toLocaleDateString('en-BD', { month: 'short', year: '2-digit' }), amount: 0 });
      }
    }

    // Top income sources — single query with groupBy (respects selected period)
    const topItems: { name: string; qty: number; value: number }[] = [];
    const relevantVTIds = [incomeVTId, salesVTId].filter((id): id is string => !!id);
    if (relevantVTIds.length > 0) {
      const creditEntries = await db.voucherEntry.groupBy({
        by: ['ledgerName'],
        where: { voucherId: { in:
          (await db.voucher.findMany({
            where: { voucherTypeId: { in: relevantVTIds }, date: { gte: periodFrom, lte: periodTo } },
            select: { id: true },
          })).map(v => v.id) }, credit: { gt: 0 } },
        _sum: { credit: true },
        _count: true,
      });
      topItems.push(
        ...creditEntries
          .map(e => ({ name: e.ledgerName, qty: 0, value: e._sum.credit ?? 0 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      );
    }

    // Receivables — aggregate approach
    const debtorGroups = await db.ledgerGroup.findMany({
      where: { name: { contains: 'Debtors' } },
      include: { ledgers: { where: { isActive: true }, select: { id: true, openingBalance: true } } },
    });
    let totalReceivables = 0;
    const debtorLedgerIds = debtorGroups.flatMap(g => g.ledgers.map(l => l.id));
    totalReceivables += debtorGroups.reduce((s, g) => s + g.ledgers.reduce((ss, l) => ss + l.openingBalance, 0), 0);
    if (debtorLedgerIds.length > 0) {
      const debtorEntrySums = await db.voucherEntry.groupBy({
        by: ['ledgerId'],
        where: { ledgerId: { in: debtorLedgerIds } },
        _sum: { debit: true, credit: true },
      });
      const debtorSumMap = Object.fromEntries(
        debtorEntrySums.map(e => [e.ledgerId, (e._sum.debit ?? 0) - (e._sum.credit ?? 0)])
      );
      totalReceivables += Object.values(debtorSumMap).reduce((s, v) => s + v, 0);
    }

    // Payables — aggregate approach
    const creditorGroups = await db.ledgerGroup.findMany({
      where: { name: { contains: 'Creditors' } },
      include: { ledgers: { where: { isActive: true }, select: { id: true, openingBalance: true } } },
    });
    let totalPayables = 0;
    const creditorLedgerIds = creditorGroups.flatMap(g => g.ledgers.map(l => l.id));
    totalPayables += creditorGroups.reduce((s, g) => s + g.ledgers.reduce((ss, l) => ss + l.openingBalance, 0), 0);
    if (creditorLedgerIds.length > 0) {
      const creditorEntrySums = await db.voucherEntry.groupBy({
        by: ['ledgerId'],
        where: { ledgerId: { in: creditorLedgerIds } },
        _sum: { debit: true, credit: true },
      });
      const creditorSumMap = Object.fromEntries(
        creditorEntrySums.map(e => [e.ledgerId, (e._sum.credit ?? 0) - (e._sum.debit ?? 0)])
      );
      totalPayables += Object.values(creditorSumMap).reduce((s, v) => s + v, 0);
    }

    // Inventory value — managed externally (separate backend software), stored on the company record
    const inventory = {
      value: company?.inventoryValue ?? 0,
      updatedAt: company?.inventoryValueUpdatedAt ?? null,
    };

    return NextResponse.json({
      periodLabel,
      periodFrom,
      periodTo,
      company,
      vouchersThisMonth,
      salesThisMonth: parseFloat(incomeSum.toFixed(2)),
      purchaseThisMonth: parseFloat(expenseSum.toFixed(2)),
      ledgerCount,
      cashInHand: parseFloat(Math.max(0, cashInHand).toFixed(2)),
      cashAtBank: parseFloat(Math.max(0, cashAtBank).toFixed(2)),
      recentVouchers,
      monthlySales,
      topItems,
      totalReceivables: parseFloat(Math.max(0, totalReceivables).toFixed(2)),
      totalPayables: parseFloat(Math.max(0, totalPayables).toFixed(2)),
      inventory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Dashboard fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
