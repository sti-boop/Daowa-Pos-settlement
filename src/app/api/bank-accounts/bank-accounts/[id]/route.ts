import { NextRequest, NextResponse } from 'next/server';
import { businessBankAccounts } from '@/lib/store';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idx = businessBankAccounts.findIndex((b) => b.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Bank account not found.' }, { status: 404 });
    }
    if (businessBankAccounts[idx].isDefault && businessBankAccounts.length > 1) {
      return NextResponse.json(
        {
          error:
            'Cannot delete the default business bank account. Designate another default first.',
        },
        { status: 400 }
      );
    }
    const removed = businessBankAccounts.splice(idx, 1)[0];
    if (businessBankAccounts.length > 0 && !businessBankAccounts.some((b) => b.isDefault)) {
      businessBankAccounts[0].isDefault = true;
    }
    return NextResponse.json({
      success: true,
      message: `Business bank account ${removed.bankName} removed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
