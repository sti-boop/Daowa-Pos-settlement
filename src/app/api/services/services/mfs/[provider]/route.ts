import { NextRequest, NextResponse } from 'next/server';
import { systemFees } from '@/lib/store';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await params;
    const provider = decodeURIComponent(rawProvider);
    const idx = systemFees.mfs.findIndex(
      (m) => m.provider.toLowerCase() === provider.toLowerCase()
    );
    if (idx === -1) {
      return NextResponse.json({ error: 'MFS provider not found.' }, { status: 404 });
    }
    if (systemFees.mfs.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove all MFS providers. At least one must remain.' },
        { status: 400 }
      );
    }
    const removed = systemFees.mfs.splice(idx, 1)[0];
    return NextResponse.json({
      success: true,
      mfs: systemFees.mfs,
      fees: systemFees,
      message: `MFS provider '${removed.provider}' removed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
