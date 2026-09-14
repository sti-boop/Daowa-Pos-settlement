import { NextResponse } from 'next/server';
import { accounts, activeShift, updateActiveShiftExpectedCash } from '@/lib/store';

export async function GET() {
  updateActiveShiftExpectedCash();
  return NextResponse.json({
    activeShift,
    posHoldingBalance: accounts['POS Cash Holding A/c'].balance,
    vaultBalance: accounts['Main Cash/Vault A/c'].balance,
  });
}
