import { NextResponse } from 'next/server';
import { auditJournal, accounts } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    entries: auditJournal,
    accounts: Object.values(accounts),
    isBalanced: auditJournal.every((e) => e.totalDebit === e.totalCredit),
  });
}
