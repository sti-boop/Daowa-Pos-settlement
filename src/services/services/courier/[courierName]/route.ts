import { NextRequest, NextResponse } from 'next/server';
import { systemFees } from '@/lib/store';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courierName: string }> }
) {
  try {
    const { courierName: rawName } = await params;
    const courierName = decodeURIComponent(rawName);
    const idx = systemFees.couriers.findIndex(
      (c) => c.courierName.toLowerCase() === courierName.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json({ error: 'Courier service not found.' }, { status: 404 });
    }
    if (systemFees.couriers.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove all courier services. At least one must remain.' },
        { status: 400 }
      );
    }
    const removed = systemFees.couriers.splice(idx, 1)[0];
    return NextResponse.json({
      success: true,
      couriers: systemFees.couriers,
      fees: systemFees,
      message: `Courier service '${removed.courierName}' removed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
