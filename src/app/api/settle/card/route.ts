import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  systemFees,
  settlementBatches,
  getTargetBank,
  postAuditJournalEntry,
  SettlementBatch,
} from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider = 'Visa / Mastercard', operator = 'Tanvir Ahmed', bankAccountId } = body;

    const cardOrders = orders.filter(
      (o) => (o.paymentMethod === 'card' || o.paymentMethod.startsWith('card_')) && o.status === 'delivered_pending_payout'
    );

    if (cardOrders.length === 0) {
      return NextResponse.json(
        { error: 'No pending card payments awaiting bank payout.' },
        { status: 400 }
      );
    }

    const { bankAccount, ledgerAccountName } = getTargetBank(bankAccountId);
    const grossAmount = cardOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const feeRule = systemFees.cards[0] || ({ feePercent: 2.0 } as any);
    const deductedFees = Math.round((grossAmount * feeRule.feePercent) / 100);
    const netBankDeposit = grossAmount - deductedFees;

    const batchId = `CARD-PAYOUT-${Date.now().toString().slice(-6)}`;

    const postings = [
      { accountName: ledgerAccountName, debit: netBankDeposit, credit: 0 },
      { accountName: 'Card Gateway Expense A/c', debit: deductedFees, credit: 0 },
      { accountName: 'Card Clearing A/c', debit: 0, credit: grossAmount },
    ];

    bankAccount.balance += netBankDeposit;

    const jnl = postAuditJournalEntry(
      `Confirm Card Gateway Bank Payout`,
      operator,
      `Settled ${cardOrders.length} Card transactions batch into ${bankAccount.bankName} (#${bankAccount.accountNumber}). Gross: ৳${grossAmount}, Processing Fee (${feeRule.feePercent}%): ৳${deductedFees}, Net Credited: ৳${netBankDeposit}.`,
      postings
    );

    for (const o of cardOrders) {
      o.status = 'cleared';
    if ((o as any).dueAmount) (o as any).dueAmount = 0;
      o.settledAt = new Date().toISOString();
      o.settlementBatchId = batchId;
    }

    const newBatch: SettlementBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchId,
      channelType: 'card',
      channelName: provider,
      timestamp: new Date().toISOString(),
      orderCount: cardOrders.length,
      grossAmount,
      deductedFees,
      netBankDeposit,
      bankReference: `${bankAccount.bankName.slice(0, 3).toUpperCase()}-CARD-${Math.floor(
        100000 + Math.random() * 900000
      )}`,
      performedBy: operator,
      journalEntryId: jnl.id,
    };

    settlementBatches.unshift(newBatch);

    return NextResponse.json({
      success: true,
      batch: newBatch,
      message: `Deposited ৳${netBankDeposit.toLocaleString()} card batch payout into ${bankAccount.bankName}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
