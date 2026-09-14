import { NextResponse } from 'next/server';
import { resetDatabaseState } from '@/lib/store';

export async function POST() {
  resetDatabaseState();
  return NextResponse.json({
    success: true,
    message:
      'Database reset successfully! All orders, settlement records, and EOD history cleared.',
  });
}
