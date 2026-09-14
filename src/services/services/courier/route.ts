import { NextRequest, NextResponse } from 'next/server';
import { systemFees, ensureClearingAccount } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      courierName,
      baseDeliveryFeeInside = 70,
      baseDeliveryFeeOutside = 130,
      codFeePercent = 1.0,
      returnCharge = 50,
    } = body;

    if (!courierName || !courierName.trim()) {
      return NextResponse.json({ error: 'Courier name is required.' }, { status: 400 });
    }
    const cleanName = courierName.trim();
    const exists = systemFees.couriers.some(
      (c) => c.courierName.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: `Courier '${cleanName}' already exists.` },
        { status: 400 }
      );
    }

    const newCourier = {
      courierName: cleanName,
      baseDeliveryFeeInside: Number(baseDeliveryFeeInside) || 70,
      baseDeliveryFeeOutside: Number(baseDeliveryFeeOutside) || 130,
      codFeePercent: Number(codFeePercent) || 1.0,
      returnCharge: Number(returnCharge) || 50,
      isActive: true,
    };

    systemFees.couriers.push(newCourier);
    ensureClearingAccount(
      `${cleanName} Clearing A/c`,
      `${cleanName} Delivered Funds Pending Payout`
    );

    return NextResponse.json({
      success: true,
      couriers: systemFees.couriers,
      fees: systemFees,
      message: `Courier service '${cleanName}' added successfully. Clearing ledger account established.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
