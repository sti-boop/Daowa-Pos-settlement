import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function netByNature(nature: string, toDate: string): Promise<number> {
  const groups = await db.ledgerGroup.findMany({ where: { nature }, include: { ledgers: true } });
  const ledgers = groups.flatMap((g) => g.ledgers || []);
  const ledgerIds = ledgers.map((l) => l.id);

  let openingDr = 0;
  let openingCr = 0;
  for (const l of ledgers) {
    if (l.balanceType === 'Dr') openingDr += Number(l.openingBalance || 0);
    else openingCr += Number(l.openingBalance || 0);
  }

  let dr = 0;
  let cr = 0;
  if (ledgerIds.length > 0) {
    const entries = await db.voucherEntry.findMany({
      where: { ledgerId: { in: ledgerIds } },
      include: { voucher: { select: { date: true } } },
    });
    for (const e of entries) {
      if (e.voucher?.date && e.voucher.date > toDate) continue;
      dr += e.debit;
      cr += e.credit;
    }
  }

  if (nature === 'Income') return (openingCr - openingDr) + (cr - dr);
  return (openingDr - openingCr) + (dr - cr);
}

/**
 * POST /api/year-end — close the fiscal year by transferring the P&L result
 * to Retained Earnings. Runs once per fiscal year (guard reference).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const company = await db.company.findFirst();
    const fyEnd = body.asOfDate || company?.fYearEnd?.split('T')[0] || todayISO();
    const toDate = body.asOfDate || todayISO();

    const reference = `YEAR-END-${fyEnd}`;
    const existing = await db.voucher.findFirst({ where: { reference } });
    if (existing) {
      return NextResponse.json(
        { error: `Year-end for ${fyEnd} already closed (${existing.voucherNumber}).` },
        { status: 400 }
      );
    }

    const income = await netByNature('Income', toDate);
    const expense = await netByNature('Expense', toDate);
    const net = round2(income - expense);

    let pnlLedger = await db.ledger.findFirst({ where: { name: 'Profit & Loss A/c' } });
    if (!pnlLedger) {
      await db.ledger.create({
        data: { name: 'Profit & Loss A/c', groupName: 'Capital', openingBalance: 0, balanceType: 'Cr', isActive: true },
      });
      pnlLedger = await db.ledger.findFirst({ where: { name: 'Profit & Loss A/c' } });
    }
    let retained = await db.ledger.findFirst({ where: { name: 'Retained Earnings A/c' } });
    if (!retained) {
      await db.ledger.create({
        data: { name: 'Retained Earnings A/c', groupName: 'Retained Earnings', openingBalance: 0, balanceType: 'Cr', isActive: true },
      });
      retained = await db.ledger.findFirst({ where: { name: 'Retained Earnings A/c' } });
    }

    if (Math.abs(net) < 0.005) {
      return NextResponse.json({ error: 'Nothing to close — net result is zero.' }, { status: 400 });
    }

    const entries =
      net > 0
        ? [
            { ledgerId: pnlLedger.id, ledgerName: pnlLedger.name, debit: net, credit: 0 },
            { ledgerId: retained.id, ledgerName: retained.name, debit: 0, credit: net },
          ]
        : [
            { ledgerId: retained.id, ledgerName: retained.name, debit: -net, credit: 0 },
            { ledgerId: pnlLedger.id, ledgerName: pnlLedger.name, debit: 0, credit: -net },
          ];

    const vt = await db.voucherType.findUnique({ where: { name: 'Journal' } });
    const voucherNumber = await nextVoucherNumber('JV');
    const voucher = await db.voucher.create({
      data: {
        voucherNumber,
        reference,
        date: toDate,
        voucherTypeId: vt.id,
        narration:
          net > 0
            ? `Year-end close — net profit ৳${net.toFixed(2)} transferred to Retained Earnings`
            : `Year-end close — net loss ৳${(-net).toFixed(2)} transferred to Retained Earnings`,
        totalAmount: Math.abs(net),
        entries: { create: entries },
      },
      include: { entries: true },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityName: voucher.voucherNumber,
      description: `Year-end close ${voucher.voucherNumber} (net ${net >= 0 ? 'profit' : 'loss'} ৳${Math.abs(net).toFixed(2)})`,
    });

    return NextResponse.json({
      success: true,
      voucherNumber,
      income: round2(income),
      expense: round2(expense),
      netProfit: net,
      fiscalYearEnd: fyEnd,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Year-end close failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
