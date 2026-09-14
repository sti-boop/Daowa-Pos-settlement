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
    const feeRule = systemFees.couriers.find((c) => c.courierName === courierName) || {
      baseDeliveryFeeInside: 70,
      codFeePercent: 1.0,
    } as any;

    // Gross = totalAmount (product only — delivery charge doesn't touch company
    // for third-party courier; it's between courier and customer)
    const grossAmount = courierOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Delivery deduction = companyBorneDeliveryCharge ONLY (free delivery expense).
    // For normal third-party courier: delivery charge doesn't touch company → 0 deduction
    const totalDeliveryFees = courierOrders.reduce(
      (sum, o) => sum + (o.companyBorneDeliveryCharge || 0),
      0
    );

    // COD = 1% of total collectable (product + delivery charge courier collects from customer).
    // deliveryFee is tracked for COD calculation but NOT deducted from company's gross.
    const totalCollectable = courierOrders.reduce(
      (sum, o) => sum + o.totalAmount + (o.deliveryFee || 0) + (o.companyBorneDeliveryCharge || 0),
      0
    );
    const totalCodFees = Math.round((totalCollectable * feeRule.codFeePercent) / 100);

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
      `Settled ${courierOrders.length} delivered ${courierName} parcels into ${bankAccount.bankName}. Gross: ৳${grossAmount}, Courier deductions (COD + free delivery expense): ৳${actualDeductions}, Net Bank Credit: ৳${actualNetDeposit}.`,
      postings
    );

    for (const o of courierOrders) {
      o.status = 'cleared';
      o.settledAt = new Date().toISOString();
      o.settlementBatchId = batchId;
      o.isPaid = true;
      if ((o as any).dueAmount) (o as any).dueAmount = 0;
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
      bankReference: `${bankAccount.bankName.slice(0, 3).toUpperCase()}-DEP-${Math.floor(200000 + Math.random() * 800000)}`,
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
