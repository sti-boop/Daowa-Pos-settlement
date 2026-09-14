import { NextRequest, NextResponse } from 'next/server';
import {
  activeShift,
  setActiveShift,
  accounts,
  postAuditJournalEntry,
  updateActiveShiftExpectedCash,
} from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { countedCash, noteBreakdown, notes, operator = 'Tanvir Ahmed' } = body;

    updateActiveShiftExpectedCash();

    const counted = Number(countedCash);
    const expected = activeShift.expectedCash;
    const discrepancy = counted - expected;

    const postings: { accountName: string; debit: number; credit: number }[] = [];

    // Transfer counted cash to vault
    postings.push({ accountName: 'Main Cash/Vault A/c', debit: counted, credit: 0 });
    // Clear holding account completely
    postings.push({ accountName: 'POS Cash Holding A/c', debit: 0, credit: expected });

    if (discrepancy < 0) {
      // Shortage -> Expense debit
      postings.push({
        accountName: 'Cash Shortage/Overage Expense A/c',
        debit: Math.abs(discrepancy),
        credit: 0,
      });
    } else if (discrepancy > 0) {
      // Overage -> Credit
      postings.push({
        accountName: 'Cash Shortage/Overage Expense A/c',
        debit: 0,
        credit: discrepancy,
      });
    }

    const jnl = postAuditJournalEntry(
      'Close Cash Register (EOD)',
      operator,
      `Day-End shift close for ${activeShift.counterName}. Counted: ৳${counted}, Expected: ৳${expected}, Discrepancy: ৳${discrepancy >= 0 ? '+' : ''}${discrepancy}. Transferred ৳${counted} into Main Vault.`,
      postings
    );

    // Mutate activeShift in place to capture closure details, then snapshot
    activeShift.status = 'closed';
    activeShift.closedAt = new Date().toISOString();
    activeShift.countedCash = counted;
    activeShift.discrepancy = discrepancy;
    activeShift.settledToVaultAmount = counted;
    activeShift.noteBreakdown = noteBreakdown || {};
    activeShift.notes = notes;

    const closedShiftSummary = { ...activeShift };

    // Auto-create next shift for next day with base float ৳2,000
    setActiveShift({
      id: `shift_${Date.now()}`,
      shiftNumber: `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-02`,
      cashierName: operator,
      counterName: 'Pharmacy Counter 01 (Main Branch)',
      startedAt: new Date().toISOString(),
      status: 'active',
      openingFloat: 2000,
      expectedCash: 2000,
      countedCash: 2000,
      discrepancy: 0,
      noteBreakdown: { '1000': 1, '500': 2 },
      settledToVaultAmount: 0,
    });

    // Provide initial float for new shift from vault
    postAuditJournalEntry(
      'Open Next Register Shift',
      operator,
      'Issued ৳2,000 float from Main Vault for new counter shift',
      [
        { accountName: 'POS Cash Holding A/c', debit: 2000, credit: 0 },
        { accountName: 'Main Cash/Vault A/c', debit: 0, credit: 2000 },
      ]
    );

    return NextResponse.json({
      success: true,
      closedShift: closedShiftSummary,
      newShift: activeShift,
      journalEntryId: jnl.id,
      message: `Cash register shift closed. ৳${counted.toLocaleString()} successfully transferred to Main Vault.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
