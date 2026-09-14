import { NextRequest, NextResponse } from 'next/server';
import {
  orders,
  systemFees,
  settlementBatches,
  accounts,
  isMfsMethod,
  getMfsProviderForMethod,
  ensureClearingAccount,
  getTargetBank,
  postAuditJournalEntry,
  updateActiveShiftExpectedCash,
  SettlementBatch,
} from '@/lib/store';

// Supported individual settlement methods. 'auto' uses the order's original
// payment channel; the rest let the operator settle via any channel.
type SettlementMethod =
  | 'auto'
  | 'mfs'
  | 'courier'
  | 'rider'
  | 'card'
  | 'cash'
  | 'due';

// Resolve the default settlement method for an order based on its original
// payment channel (used when settlementMethod === 'auto' or is omitted).
function resolveDefaultMethod(order: any): SettlementMethod {
  if (isMfsMethod(order.paymentMethod)) return 'mfs';
  if (order.deliveryType === 'third_party_courier') return 'courier';
  if (order.deliveryType === 'own_rider') return 'rider';
  if (order.paymentMethod === 'card' || order.paymentMethod.startsWith('card_')) return 'card';
  if (order.paymentMethod === 'due') return 'due';
  return 'cash';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, operator = 'Tanvir Ahmed', bankAccountId, settlementMethod = 'auto', settlementAmount } = body;

    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'cleared') {
      return NextResponse.json(
        { error: `Order ${order.orderNumber} is already settled.` },
        { status: 400 }
      );
    }

    const { bankAccount, ledgerAccountName } = getTargetBank(bankAccountId);
    const batchId = `INDIV-${Date.now().toString().slice(-6)}`;

    // Determine the effective settlement method.
    const method: SettlementMethod =
      settlementMethod === 'auto' || !settlementMethod
        ? resolveDefaultMethod(order)
        : (settlementMethod as SettlementMethod);

    let channelType: 'mfs' | 'courier' | 'rider' | 'card' = 'mfs';
    let channelName = order.paymentMethod;
    let grossAmount = order.totalAmount;
    let deductedFees = 0;
    let netBankDeposit = order.totalAmount;
    let bankReference = `${bankAccount.bankName.slice(0, 3).toUpperCase()}-IND-${Math.floor(
      100000 + Math.random() * 900000
    )}`;
    const postings: { accountName: string; debit: number; credit: number }[] = [];
    let settlementActionLabel = 'Individual Settlement';

    if (method === 'mfs') {
      // ---- MFS settlement: transfer merchant balance to bank with MFS fee ----
      channelType = 'mfs';
      const provider = getMfsProviderForMethod(order.paymentMethod) || 'bKash';
      channelName = provider;
      settlementActionLabel = `Individual ${provider} Settlement`;
      const feeRule =
        systemFees.mfs.find((m) => m.provider.toLowerCase() === provider.toLowerCase()) ||
        ({ feePercent: 1.15 } as any);
      deductedFees = Math.round((grossAmount * feeRule.feePercent) / 100);
      netBankDeposit = grossAmount - deductedFees;
      const mfsAccName = `${provider} Clearing A/c`;
      ensureClearingAccount(mfsAccName, `${provider} Merchant Balance Pending Transfer`);

      postings.push({ accountName: ledgerAccountName, debit: netBankDeposit, credit: 0 });
      postings.push({ accountName: 'MFS Charge Expense A/c', debit: deductedFees, credit: 0 });
      postings.push({ accountName: mfsAccName, debit: 0, credit: grossAmount });

      bankAccount.balance += netBankDeposit;

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Settled individual ${provider} Order #${order.orderNumber} (${order.customerName}) to ${bankAccount.bankName} (#${bankAccount.accountNumber}). Gross: ৳${grossAmount}, Gateway Fee (${feeRule.feePercent}%): ৳${deductedFees}, Net Credited: ৳${netBankDeposit}.`,
        postings
      );
    } else if (method === 'courier') {
      // ---- Courier COD settlement: deposit courier COD to bank with deductions ----
      channelType = 'courier';
      const courier = order.courierName || 'Steadfast';
      channelName = courier;
      settlementActionLabel = `Individual Courier Settlement`;
      const feeRule =
        systemFees.couriers.find((c) => c.courierName === courier) ||
        ({ codFeePercent: 1.0 } as any);
      // Gross = totalAmount (product only — delivery charge doesn't touch company)
      grossAmount = order.totalAmount;
      // Delivery deduction = companyBorneDeliveryCharge ONLY (free delivery expense).
      // For normal courier: delivery charge doesn't touch company → 0 deduction
      const deliveryDeduction = order.companyBorneDeliveryCharge || 0;
      // COD = 1% of total collectable (product + delivery charge courier collects from customer)
      const collectableAmount = order.totalAmount + (order.deliveryFee || 0) + (order.companyBorneDeliveryCharge || 0);
      const codDeduction = Math.round((collectableAmount * feeRule.codFeePercent) / 100);
      deductedFees = deliveryDeduction + codDeduction;
      netBankDeposit = grossAmount - deductedFees;
      const courierAccName = `${courier} Clearing A/c`;
      ensureClearingAccount(courierAccName, `${courier} Delivered Funds Pending Payout`);

      postings.push({ accountName: ledgerAccountName, debit: netBankDeposit, credit: 0 });
      postings.push({ accountName: 'Courier Expense A/c', debit: deductedFees, credit: 0 });
      postings.push({ accountName: courierAccName, debit: 0, credit: grossAmount });

      bankAccount.balance += netBankDeposit;

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Settled individual ${courier} Consignment for Order #${order.orderNumber} (${order.customerName}) into ${bankAccount.bankName}. Gross COD: ৳${grossAmount}, Courier Charges: ৳${deductedFees}, Net Credited: ৳${netBankDeposit}.`,
        postings
      );
    } else if (method === 'rider') {
      // ---- Rider cash collection: receive cash into Main Vault ----
      channelType = 'rider';
      const rider = order.riderName || 'Rider Tareq';
      channelName = rider;
      settlementActionLabel = `Individual Rider Cash Collection`;
      deductedFees = 0;
      netBankDeposit = grossAmount;
      bankReference = `VAULT-IND-${Math.floor(1000 + Math.random() * 9000)}`;

      postings.push({ accountName: 'Main Cash/Vault A/c', debit: grossAmount, credit: 0 });
      postings.push({ accountName: 'Daowa Rider Clearing A/c', debit: 0, credit: grossAmount });

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Received cash from ${rider} for individual Order #${order.orderNumber} (${order.customerName}). Deposited ৳${grossAmount} into Main Cash Vault.`,
        postings
      );
    } else if (method === 'card') {
      // ---- Card gateway settlement: payout card batch to bank with fee ----
      channelType = 'card';
      channelName = 'Card POS Gateway';
      settlementActionLabel = `Individual Card Settlement`;
      const feeRule = systemFees.cards[0] || ({ feePercent: 2.0 } as any);
      deductedFees = Math.round((grossAmount * feeRule.feePercent) / 100);
      netBankDeposit = grossAmount - deductedFees;

      postings.push({ accountName: ledgerAccountName, debit: netBankDeposit, credit: 0 });
      postings.push({ accountName: 'Card Gateway Expense A/c', debit: deductedFees, credit: 0 });
      postings.push({ accountName: 'Card Clearing A/c', debit: 0, credit: grossAmount });

      bankAccount.balance += netBankDeposit;

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Settled individual Card Order #${order.orderNumber} into ${bankAccount.bankName}. Gross: ৳${grossAmount}, Fee (${feeRule.feePercent}%): ৳${deductedFees}, Net: ৳${netBankDeposit}.`,
        postings
      );
    } else if (method === 'due') {
      // ---- Due / Accounts Receivable clearance ----
      channelType = 'rider';
      channelName = 'Customer Accounts Receivable';
      settlementActionLabel = `Individual Due Clearance`;
      deductedFees = 0;
      netBankDeposit = grossAmount;
      bankReference = `DUE-CLR-${Math.floor(1000 + Math.random() * 9000)}`;

      // Debit POS Cash Holding (cash received from customer) / Credit AR
      // Support partial settlement: if settlementAmount is provided, settle only that amount
      const fullDue = (order as any).dueAmount || grossAmount;
      const dueToSettle = settlementAmount ? Math.min(Number(settlementAmount), fullDue) : fullDue;
      const remainingDue = fullDue - dueToSettle;
      
      postings.push({ accountName: 'POS Cash Holding A/c', debit: dueToSettle, credit: 0 });
      postings.push({ accountName: 'Customer Accounts Receivable', debit: 0, credit: dueToSettle });

      // Update order due amount
      (order as any).dueAmount = remainingDue;

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Cleared due for Order #${order.orderNumber} (${order.customerName}). Customer paid ৳${dueToSettle}${remainingDue > 0 ? ` (partial). Remaining due: ৳${remainingDue}` : ' (fully)'}.`,
        postings
      );
    } else {
      // ---- Cash reconciliation (POS counter / general cash) ----
      channelType = 'rider';
      channelName = 'POS Cash Register';
      settlementActionLabel = `Individual Cash Reconciliation`;
      deductedFees = 0;
      netBankDeposit = grossAmount;
      bankReference = `CASH-REC-${Math.floor(1000 + Math.random() * 9000)}`;

      // If the order was originally a Due sale, clear the AR balance with the cash received.
      if (order.paymentMethod === 'due') {
        postings.push({ accountName: 'POS Cash Holding A/c', debit: grossAmount, credit: 0 });
        postings.push({ accountName: 'Customer Accounts Receivable', debit: 0, credit: grossAmount });
      } else if (
        accounts['Customer Accounts Receivable'] &&
        accounts['Customer Accounts Receivable'].balance > 0
      ) {
        const recClear = Math.min(
          accounts['Customer Accounts Receivable'].balance,
          Math.round(grossAmount / 2)
        );
        postings.push({ accountName: 'POS Cash Holding A/c', debit: recClear, credit: 0 });
        postings.push({
          accountName: 'Customer Accounts Receivable',
          debit: 0,
          credit: recClear,
        });
      } else {
        postings.push({ accountName: 'Main Cash/Vault A/c', debit: grossAmount, credit: 0 });
        postings.push({ accountName: 'POS Cash Holding A/c', debit: 0, credit: grossAmount });
      }

      postAuditJournalEntry(
        settlementActionLabel,
        operator,
        `Reconciled cash for Order #${order.orderNumber} (${order.customerName}). ৳${grossAmount} accounted into vault/register.`,
        postings
      );
    }

    // Mark order status — clear due for ALL settlement methods (including COD)
    // When an order is settled, the due amount is cleared:
    // - For COD: courier collected cash from customer → due cleared
    // - For MFS/Card: gateway confirmed payment → due cleared
    // - For Due/Cash: customer paid → due cleared
    // - For Courier/Rider: collected → due cleared
    if ((order as any).dueAmount && (order as any).dueAmount > 0) {
      (order as any).dueAmount = 0;  // Clear the due — settled means paid
    }
    order.status = 'cleared';
    order.isPaid = true;
    order.settledAt = new Date().toISOString();
    order.settlementBatchId = batchId;

    // Update the customer's due info in the POS Prisma database
    // The settlement hub uses an in-memory store, but when settling,
    // we should also update the corresponding Sale record in Prisma
    // so the POS shows updated due/payment status.
    try {
      const { db } = await import('@/lib/db');
      await db.sale.update({
        where: { id: order.id },
        data: {
          clearingStatus: 'SETTLED',
          dueAmount: 0,
          status: 'completed',
        },
      });
    } catch (prismaErr) {
      // Non-fatal — the in-memory store is the source of truth for settlement
      console.error('Prisma sale update failed (non-fatal):', prismaErr);
    }

    const newBatch: SettlementBatch = {
      id: `batch_${Date.now()}`,
      batchNumber: batchId,
      channelType,
      channelName,
      timestamp: new Date().toISOString(),
      orderCount: 1,
      grossAmount,
      deductedFees,
      netBankDeposit,
      bankReference,
      performedBy: operator,
      journalEntryId: postings.length > 0 ? `jnl_ind_${Date.now()}` : '',
    };

    settlementBatches.unshift(newBatch);
    updateActiveShiftExpectedCash();

    const destLabel =
      method === 'rider' || method === 'cash' || method === 'due'
        ? method === 'due'
          ? 'Cash Register (cleared AR)'
          : 'Main Vault / Register'
        : bankAccount.bankName;

    // Build response message
    let dueClearedInfo = '';
    if (order.paymentMethod === 'due' || (order as any).dueAmount === 0 && order.paymentMethod !== 'cash') {
      dueClearedInfo = ` Due cleared.`;
    }

    return NextResponse.json({
      success: true,
      order,
      batch: newBatch,
      message: `Order ${order.orderNumber} settled via ${channelName} (${method.toUpperCase()}). Net: ৳${netBankDeposit.toLocaleString()} credited to ${destLabel}.${dueClearedInfo}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
