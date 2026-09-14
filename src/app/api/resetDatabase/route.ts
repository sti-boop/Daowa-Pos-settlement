import { NextResponse } from 'next/server';
import { resetDatabaseState } from '@/lib/store';
import { resetAccountingDB } from '@/lib/accounting-db';

export async function POST() {
  resetDatabaseState();
  resetAccountingDB();
  return NextResponse.json({
    success: true,
    message:
      'Database reset successfully! All orders, settlement records, EOD history and accounting data cleared and re-seeded with the default chart of accounts.',
  });
}
