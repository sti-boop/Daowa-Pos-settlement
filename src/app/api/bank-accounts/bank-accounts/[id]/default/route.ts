import { NextRequest, NextResponse } from 'next/server';
import { businessBankAccounts } from '@/lib/store';

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const target = businessBankAccounts.find((b) => b.id === id);
    if (!target) {
      return NextResponse.json({ error: 'Bank account not found.' }, { status: 404 });
    }
    businessBankAccounts.forEach((b) => {
      b.isDefault = b.id === id;
    });
    return NextResponse.json({
      success: true,
      bankAccounts: businessBankAccounts,
      message: `${target.bankName} (#${target.accountNumber}) set as default settlement bank account.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
