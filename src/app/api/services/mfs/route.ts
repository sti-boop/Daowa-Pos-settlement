import { NextRequest, NextResponse } from 'next/server';
import { systemFees, ensureClearingAccount } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, feePercent = 1.2, accountNumber = '', settleIntervalHours = 24 } = body;

    if (!provider || !provider.trim()) {
      return NextResponse.json(
        { error: 'MFS provider name is required.' },
        { status: 400 }
      );
    }
    const cleanName = provider.trim();
    const exists = systemFees.mfs.some(
      (m) => m.provider.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: `MFS provider '${cleanName}' already exists.` },
        { status: 400 }
      );
    }

    const newMfs = {
      provider: cleanName,
      feePercent: Number(feePercent) || 1.2,
      autoSettle: false,
      settleIntervalHours: Number(settleIntervalHours) || 24,
      accountNumber: accountNumber.trim() || `${cleanName} Merchant Account`,
    };

    systemFees.mfs.push(newMfs);
    ensureClearingAccount(
      `${cleanName} Clearing A/c`,
      `${cleanName} Merchant Balance Pending Transfer`
    );

    return NextResponse.json({
      success: true,
      mfs: systemFees.mfs,
      fees: systemFees,
      message: `MFS provider '${cleanName}' added successfully with ${newMfs.feePercent}% commission rate.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
