import { NextRequest, NextResponse } from 'next/server';
import { systemFees, setSystemFees, syncClearingAccountsWithFees } from '@/lib/store';

export async function GET() {
  return NextResponse.json(systemFees);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    setSystemFees(body);
    syncClearingAccountsWithFees();
    return NextResponse.json({
      success: true,
      fees: systemFees,
      message: 'Fee rules updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
