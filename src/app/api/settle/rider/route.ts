import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  settlementBatches,
  postAuditJournalEntry,
  SettlementBatch,
} from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { riderName, collectedAmount, operator = 'Tanvir Ahmed' } = body;

    const riderOrders = orders.filter(
      (o) =>
        o.deliveryType === 'own_rider' &&
        o.riderName === riderName &&
        o.status === 'delivered_pending_payout'
    );

    if (riderOrders.length === 0) {
      return NextResponse.json(
        { error: `No pending delivered orders for ${riderName}.` },
        { status: 400 }
      );
    }

    const totalPending = riderOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const amountToReceive = collectedAmount ? Number(collectedAmount) : totalPending;

    const batchId = `RIDER-${Date.now().toString().slice(-6)}`;

    const postings = [
      { accountName: 'Main Cash/Vault A/c', debit: amountToReceive, credit: 0 },
      { accountName: 'Daowa Rider Clearing A/c', debit: 0, credit: amountToReceive },
    ];

    const jnl = postAuditJournalEntry(
      `Receive Rider Cash Collection`,
      operator,
      `Received ৳${amountToReceive.toLocaleString()} cash from ${riderName} for ${riderOrders.length} completed medicine deliveries. Transferred straight to store vault.`,
      postings
    );

    for (const o of riderOrders) {
      o.status = 'cleared';
    if ((o as any).dueAmount) (o as any).dueAmount = 0;
      o.settledAt = new Date().toISOString();
      o.settlementBatchId = batchId;
      o.isPaid = true;
    }

    const newBatch: SettlementBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchId,
      channelType: 'rider',
      channelName: riderName,
      timestamp: new Date().toISOString(),
      orderCount: riderOrders.length,
      grossAmount: amountToReceive,
      deductedFees: 0,
      netBankDeposit: amountToReceive,
      bankReference: `VAULT-RECEIPT-${Math.floor(1000 + Math.random() * 9000)}`,
      performedBy: operator,
      journalEntryId: jnl.id,
    };

    settlementBatches.unshift(newBatch);

    return NextResponse.json({
      success: true,
      batch: newBatch,
      message: `Received ৳${amountToReceive.toLocaleString()} from ${riderName}. Safely deposited into Main Cash Vault.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
