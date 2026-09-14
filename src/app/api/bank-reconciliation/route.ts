import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

const BANK_GROUP = 'Cash at Bank';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * GET /api/bank-reconciliation — bank ledgers with book balances, the vouchers
 * that move each bank, and the reconciliation records recorded so far.
 */
export async function GET() {
  try {
    const banks = await db.ledger.findMany({
      where: { groupName: BANK_GROUP, isActive: true },
      orderBy: { name: 'asc' },
    });

    const entries = await db.voucherEntry.findMany({
      include: { voucher: { select: { voucherNumber: true, date: true, narration: true } } },
    });

    const reconciliations = await db.bankReconciliation.findMany({
      orderBy: { date: 'desc' },
    });

    const result = banks.map((bank) => {
      let debit = 0;
      let credit = 0;
      const bankEntries = entries
        .filter((e) => e.ledgerId === bank.id)
        .map((e) => {
          debit += e.debit;
          credit += e.credit;
          return {
            id: e.id,
            voucherId: e.voucherId,
            voucherNumber: e.voucher?.voucherNumber,
            date: e.voucher?.date,
            narration: e.voucher?.narration,
            debit: e.debit,
            credit: e.credit,
          }
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const opening = bank.balanceType === 'Dr' ? bank.openingBalance : -bank.openingBalance;
      const bookBalance = round2(opening + debit - credit);

      // Mark which entries have already been matched in a reconciliation record.
      const matchedIds = new Set<string>();
      for (const rec of reconciliations) {
        if (rec.bankLedgerName === bank.name) {
          for (const id of rec.matchedVoucherIds || []) matchedIds.add(id);
        }
      }

      return {
        ledgerId: bank.id,
        name: bank.name,
        openingBalance: bank.openingBalance,
        bookBalance,
        entries: bankEntries.map((e) => ({ ...e, reconciled: matchedIds.has(e.id) })),
        reconciledCount: bankEntries.filter((e) => matchedIds.has(e.id)).length,
        unreconciledCount: bankEntries.filter((e) => !matchedIds.has(e.id)).length,
      };
    });

    return NextResponse.json({ banks: result, reconciliations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bank reconciliation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/bank-reconciliation — record a bank reconciliation.
 * body: { bankLedgerName, statementBalance, matchedVoucherIds, notes }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankLedgerName, statementBalance, matchedVoucherIds = [], notes } = body;
    if (!bankLedgerName) {
      return NextResponse.json({ error: 'bankLedgerName is required' }, { status: 400 });
    }

    const bank = await db.ledger.findFirst({ where: { name: bankLedgerName } });
    if (!bank) {
      return NextResponse.json({ error: `Bank ledger "${bankLedgerName}" not found` }, { status: 404 });
    }

    // Compute book balance
    const entries = await db.voucherEntry.findMany({ where: { ledgerId: bank.id } });
    let debit = 0;
    let credit = 0;
    for (const e of entries) {
      debit += e.debit;
      credit += e.credit;
    }
    const opening = bank.balanceType === 'Dr' ? bank.openingBalance : -bank.openingBalance;
    const bookBalance = round2(opening + debit - credit);
    const statement = Number(statementBalance ?? bookBalance);
    const difference = round2(bookBalance - statement);

    const rec = await db.bankReconciliation.create({
      data: {
        bankLedgerName,
        statementBalance: statement,
        bookBalance,
        difference,
        matchedVoucherIds,
        notes: notes || '',
        date: todayISO(),
      },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'BankReconciliation',
      entityId: rec.id,
      entityName: bankLedgerName,
      description: `Reconciled ${bankLedgerName}: book ৳${bookBalance.toFixed(2)} vs statement ৳${statement.toFixed(2)} (difference ৳${difference.toFixed(2)})`,
    });

    return NextResponse.json({ success: true, reconciliation: rec }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record reconciliation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
