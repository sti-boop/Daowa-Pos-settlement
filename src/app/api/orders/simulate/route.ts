import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  systemFees,
  setOrders,
  isMfsMethod,
  getMfsProviderForMethod,
  ensureClearingAccount,
  postAuditJournalEntry,
  updateActiveShiftExpectedCash,
  HealthcareOrder,
} from '@/lib/store';

// Helper: resolve the appropriate clearing/holding ledger account for a payment method.
function resolveClearingAccount(
  paymentMethod: string,
  deliveryType: string,
  courierName?: string
): { accountName: string; label: string } {
  if (paymentMethod === 'cash') {
    return { accountName: 'POS Cash Holding A/c', label: 'POS Cash Holding A/c' };
  }
  if (paymentMethod === 'due') {
    return { accountName: 'Customer Accounts Receivable', label: 'Customer Accounts Receivable' };
  }
  if (deliveryType === 'own_rider') {
    return { accountName: 'Daowa Rider Clearing A/c', label: 'Daowa Rider Clearing A/c' };
  }
  if (deliveryType === 'third_party_courier') {
    const courier = courierName || systemFees.couriers[0]?.courierName || 'Steadfast';
    const clearingAcc = `${courier} Clearing A/c`;
    ensureClearingAccount(clearingAcc, `${courier} Delivered Funds Pending Payout`);
    return { accountName: clearingAcc, label: clearingAcc };
  }
  if (isMfsMethod(paymentMethod)) {
    const providerName = getMfsProviderForMethod(paymentMethod);
    const clearingAcc = `${providerName} Clearing A/c`;
    ensureClearingAccount(clearingAcc, `${providerName} Merchant Balance Pending Transfer`);
    return { accountName: clearingAcc, label: clearingAcc };
  }
  if (paymentMethod.startsWith('card_')) {
    return { accountName: 'Card Clearing A/c', label: 'Card Clearing A/c' };
  }
  return { accountName: 'POS Cash Holding A/c', label: 'POS Cash Holding A/c' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      deliveryType,
      paymentMethod,
      riderName,
      courierName,
      items,
      deliveryFee = 0,
      isDueSale = false,
      saleType,
      notes,
      freeDelivery = false,
      splitPayment,
    } = body;

    const productAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );

    // ---- FREE DELIVERY LOGIC ----
    // Own rider + free delivery: customer pays 0, no revenue, no expense.
    // Courier + free delivery: customer pays 0 delivery, but company pays the
    // courier's delivery charge (booked as Courier Expense at sale time).
    let effectiveDeliveryFee = Number(deliveryFee);
    let companyBorneDeliveryCharge = 0;
    if (freeDelivery) {
      effectiveDeliveryFee = 0;
      if (deliveryType === 'third_party_courier') {
        // Company absorbs the courier's base delivery charge as an expense.
        const courier = courierName || systemFees.couriers[0]?.courierName || 'Steadfast';
        const feeRule = systemFees.couriers.find((c) => c.courierName === courier);
        companyBorneDeliveryCharge = feeRule?.baseDeliveryFeeInside || 70;
      }
    }

    const totalAmount = productAmount + effectiveDeliveryFee;
    const orderNumber = `DAOWA-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Determine if this is a split payment
    const isSplitPayment =
      splitPayment &&
      splitPayment.method1 &&
      splitPayment.method2 &&
      Number(splitPayment.amount1) > 0 &&
      Number(splitPayment.amount2) > 0;

    const effectivePaymentMethod = isSplitPayment ? splitPayment.method1 : paymentMethod;

    // Status: only a pure cash POS sale (no due, no split) is immediately completed.
    let status: any = 'delivered_pending_payout';
    const isPureCashPosSale =
      deliveryType === 'pos_counter' &&
      paymentMethod === 'cash' &&
      !isDueSale &&
      !isSplitPayment;
    if (isPureCashPosSale) {
      status = 'completed';
    }

    // Sale type is now fully decoupled from delivery type. The frontend
    // sends an explicit saleType. If missing, default by delivery type.
    const determinedSaleType: 'online' | 'offline' =
      saleType === 'online' || saleType === 'offline'
        ? saleType
        : deliveryType === 'pos_counter'
        ? 'offline'
        : 'online';

    // Build a human-readable payment descriptor for the audit narration
    let paymentDescriptor = effectivePaymentMethod.toUpperCase();
    if (isSplitPayment) {
      paymentDescriptor = `SPLIT: ${splitPayment.method1.toUpperCase()} ৳${Number(
        splitPayment.amount1
      ).toLocaleString()} + ${splitPayment.method2.toUpperCase()} ৳${Number(
        splitPayment.amount2
      ).toLocaleString()}`;
    } else if (paymentMethod === 'due') {
      paymentDescriptor = 'DUE (Customer Accounts Receivable)';
    }
    const freeDeliveryTag = freeDelivery ? ' [FREE DELIVERY]' : '';

    const newOrder: HealthcareOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      customerName: customerName || 'Walk-in Healthcare Customer',
      customerPhone: customerPhone || '01700-000000',
      deliveryType,
      paymentMethod: effectivePaymentMethod,
      saleType: determinedSaleType,
      notes:
        notes ||
        (determinedSaleType === 'online'
          ? 'Online prescription delivery sale'
          : 'Walk-in OTC pharmacy counter sale'),
      riderName:
        deliveryType === 'own_rider' ? riderName || 'Rider Tareq' : undefined,
      courierName:
        deliveryType === 'third_party_courier'
          ? courierName || 'Steadfast'
          : undefined,
      consignmentId:
        deliveryType === 'third_party_courier'
          ? `${courierName?.slice(0, 2).toUpperCase() || 'SF'}-POS-${Math.floor(
              10000 + Math.random() * 90000
            )}`
          : undefined,
      items,
      productAmount,
      deliveryFee: effectiveDeliveryFee,
      totalAmount,
      status,
      isPaid: isPureCashPosSale,
      freeDelivery: freeDelivery || undefined,
      companyBorneDeliveryCharge: companyBorneDeliveryCharge || undefined,
    };

    setOrders([newOrder, ...orders]);

    // ---- BACKGROUND DOUBLE-ENTRY POSTING ----
    const postings: { accountName: string; debit: number; credit: number }[] = [];

    if (isSplitPayment) {
      const amt1 = Number(splitPayment.amount1);
      const amt2 = Number(splitPayment.amount2);
      const { accountName: acc1 } = resolveClearingAccount(
        splitPayment.method1,
        deliveryType,
        courierName
      );
      const { accountName: acc2 } = resolveClearingAccount(
        splitPayment.method2,
        deliveryType,
        courierName
      );
      postings.push({ accountName: acc1, debit: amt1, credit: 0 });
      if (acc2 !== acc1) {
        postings.push({ accountName: acc2, debit: amt2, credit: 0 });
      } else {
        postings[0].debit += amt2;
      }
    } else if (paymentMethod === 'cash') {
      if (isDueSale) {
        const cashPortion = Math.round(totalAmount / 2);
        const duePortion = totalAmount - cashPortion;
        postings.push({ accountName: 'POS Cash Holding A/c', debit: cashPortion, credit: 0 });
        postings.push({
          accountName: 'Customer Accounts Receivable',
          debit: duePortion,
          credit: 0,
        });
      } else {
        postings.push({ accountName: 'POS Cash Holding A/c', debit: totalAmount, credit: 0 });
      }
    } else if (paymentMethod === 'due') {
      postings.push({
        accountName: 'Customer Accounts Receivable',
        debit: totalAmount,
        credit: 0,
      });
    } else {
      const { accountName } = resolveClearingAccount(
        paymentMethod,
        deliveryType,
        courierName
      );
      postings.push({ accountName, debit: totalAmount, credit: 0 });
    }

    // Credit Revenue (product only)
    postings.push({
      accountName: 'Medicine Sales Revenue A/c',
      debit: 0,
      credit: productAmount,
    });

    // Delivery fee revenue only when customer actually pays for delivery
    if (effectiveDeliveryFee > 0) {
      postings.push({
        accountName: 'Delivery Fee Revenue A/c',
        debit: 0,
        credit: effectiveDeliveryFee,
      });
    }

    // Free delivery with courier: company absorbs the courier's delivery charge
    // as an expense. Debit Courier Expense, Credit the Courier Clearing A/c so
    // the net courier clearing reflects what the courier owes (product only).
    if (freeDelivery && deliveryType === 'third_party_courier' && companyBorneDeliveryCharge > 0) {
      const courier = courierName || systemFees.couriers[0]?.courierName || 'Steadfast';
      const courierAccName = `${courier} Clearing A/c`;
      ensureClearingAccount(courierAccName, `${courier} Delivered Funds Pending Payout`);
      postings.push({
        accountName: 'Courier Expense A/c',
        debit: companyBorneDeliveryCharge,
        credit: 0,
      });
      postings.push({
        accountName: courierAccName,
        debit: 0,
        credit: companyBorneDeliveryCharge,
      });
    }

    const jnl = postAuditJournalEntry(
      'POS Medicine Sale Approval',
      'System Automated Rule',
      `Medicine Sale ${orderNumber} (${paymentDescriptor}${freeDeliveryTag}) for ${customerName || 'Walk-in Customer'}`,
      postings
    );

    updateActiveShiftExpectedCash();

    return NextResponse.json({
      success: true,
      order: newOrder,
      journalEntryId: jnl.id,
      message: `Order ${orderNumber} created. Clearing account updated automatically.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to simulate sale' },
      { status: 500 }
    );
  }
}
