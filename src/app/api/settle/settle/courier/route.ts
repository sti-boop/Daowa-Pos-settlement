import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  systemFees,
  settlementBatches,
  getTargetBank,
  postAuditJournalEntry,
  SettlementBatch,
  CourierName,
} from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courierName, depositAmount, operator = 'Tanvir Ahmed', bankAccountId } = body as {
      courierName: CourierName;
      depositAmount?: number;
      operator?: string;
      bankAccountId?: string;
    };

    const courierOrders = orders.filter(
      (o) =>
        o.deliveryType === 'third_party_courier' &&
        o.courierName === courierName &&
        o.status === 'delivered_pending_payout'
    );

    if (courierOrders.length === 0) {
      return NextResponse.json(
        { error: `No delivered orders awaiting bank payout for ${courierName}.` },
        { status: 400 }
      );
    }

    const { bankAccount, ledgerAccountName } = getTargetBank(bankAccountId);
    const grossAmount = courierOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const feeRule = systemFees.couriers.find((c) => c.courierName === courierName) || {
      baseDeliveryFeeInside: 70,
      codFeePercent: 1.0,
    } as any;

    const totalDeliveryFees = courierOrders.reduce(
      (sum, o) => sum + o.deliveryFee + (o.companyBorneDeliveryCharge || 0),
      0
    );
    // COD charge is now 1% of the WHOLE sale amount (product + delivery fee).
    const totalCodFees = Math.round(
      (courierOrders.reduce((sum, o) => sum + o.totalAmount, 0) * feeRule.codFeePercent) / 100
    );
    const calculatedDeductions = totalDeliveryFees + totalCodFees;
    const calculatedNet = grossAmount - calculatedDeductions;

    const actualNetDeposit = depositAmount ? Number(depositAmount) : calculatedNet;
    const actualDeductions = grossAmount - actualNetDeposit;

    const courierAccName = `${courierName} Clearing A/c`;
    const batchId = `SETTLE-CR-${Date.now().toString().slice(-6)}`;

    const postings = [
      { accountName: ledgerAccountName, debit: actualNetDeposit, credit: 0 },
      { accountName: 'Courier Expense A/c', debit: actualDeductions, credit: 0 },
      { accountName: courierAccName, debit: 0, credit: grossAmount },
    ];

    bankAccount.balance += actualNetDeposit;

    const jnl = postAuditJournalEntry(
      `Settle Courier Bank Deposit`,
      operator,
      `Settled ${courierOrders.length} delivered ${courierName} parcels into ${bankAccount.bankName}. Gross: ৳${grossAmount}, Courier deductions: ৳${actualDeductions}, Net Bank Credit: ৳${actualNetDeposit}.`,
      postings
    );

    for (const o of courierOrders) {
      o.status = 'cleared';
      o.settledAt = new Date().toISOString();
      o.settlementBatchId = batchId;
      o.isPaid = true;
    }

    const newBatch: SettlementBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchId,
      channelType: 'courier',
      channelName: courierName,
      timestamp: new Date().toISOString(),
      orderCount: courierOrders.length,
      grossAmount,
      deductedFees: actualDeductions,
      netBankDeposit: actualNetDeposit,
      bankReference: `${bankAccount.bankName.slice(0, 3).toUpperCase()}-DEP-${Math.floor(
        200000 + Math.random() * 800000
      )}`,
      performedBy: operator,
      journalEntryId: jnl.id,
    };

    settlementBatches.unshift(newBatch);

    return NextResponse.json({
      success: true,
      batch: newBatch,
      message: `Successfully matched and deposited ৳${actualNetDeposit.toLocaleString()} from ${courierName} into ${bankAccount.bankName}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
