import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  systemFees,
  settlementBatches,
  getTargetBank,
  postAuditJournalEntry,
  SettlementBatch,
  MFSProvider,
} from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, operator = 'Tanvir Ahmed', bankAccountId } = body as {
      provider: MFSProvider;
      operator?: string;
      bankAccountId?: string;
    };

    const providerKey = provider.toLowerCase();
    const mfsOrders = orders.filter(
      (o) => o.paymentMethod === providerKey && o.status === 'delivered_pending_payout'
    );

    if (mfsOrders.length === 0) {
      return NextResponse.json(
        { error: `No pending payouts found for ${provider}.` },
        { status: 400 }
      );
    }

    const { bankAccount, ledgerAccountName } = getTargetBank(bankAccountId);
    const grossAmount = mfsOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const feeRule = systemFees.mfs.find((m) => m.provider === provider) || {
      feePercent: 1.15,
    } as any;
    const deductedFees = Math.round((grossAmount * feeRule.feePercent) / 100);
    const netBankDeposit = grossAmount - deductedFees;

    const mfsAccName = `${provider} Clearing A/c`;
    const batchId = `SETTLE-MFS-${Date.now().toString().slice(-6)}`;

    const postings = [
      { accountName: ledgerAccountName, debit: netBankDeposit, credit: 0 },
      { accountName: 'MFS Charge Expense A/c', debit: deductedFees, credit: 0 },
      { accountName: mfsAccName, debit: 0, credit: grossAmount },
    ];

    bankAccount.balance += netBankDeposit;

    const jnl = postAuditJournalEntry(
      `Settle ${provider} to Bank`,
      operator,
      `Settled ${mfsOrders.length} ${provider} collections to ${bankAccount.bankName} (#${bankAccount.accountNumber}). Gross: ৳${grossAmount}, Fees: ৳${deductedFees}, Net Deposit: ৳${netBankDeposit}.`,
      postings
    );

    for (const o of mfsOrders) {
      o.status = 'cleared';
      o.settledAt = new Date().toISOString();
      o.settlementBatchId = batchId;
    }

    const newBatch: SettlementBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchId,
      channelType: 'mfs',
      channelName: provider,
      timestamp: new Date().toISOString(),
      orderCount: mfsOrders.length,
      grossAmount,
      deductedFees,
      netBankDeposit,
      bankReference: `${bankAccount.bankName.slice(0, 3).toUpperCase()}-EFT-${Math.floor(
        100000 + Math.random() * 900000
      )}`,
      performedBy: operator,
      journalEntryId: jnl.id,
    };

    settlementBatches.unshift(newBatch);

    return NextResponse.json({
      success: true,
      batch: newBatch,
      message: `Successfully transferred ৳${netBankDeposit.toLocaleString()} from ${provider} to ${bankAccount.bankName}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
