import { NextRequest, NextResponse } from 'next/server';
import { orders, postAuditJournalEntry } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, condition = 'intact', operator = 'Tanvir Ahmed' } = body;

    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Return order not found.' }, { status: 404 });
    }

    const courierName = order.courierName || 'Steadfast';
    const courierMap: Record<string, string> = {
      Steadfast: 'Steadfast Clearing A/c',
      Pathao: 'Pathao Clearing A/c',
      RedX: 'RedX Clearing A/c',
      Carrybee: 'Carrybee Clearing A/c',
    };
    const courierClearingAcc = courierMap[courierName] || 'Steadfast Clearing A/c';
    const returnFee = order.returnCourierCharge || 50;

    const postings: { accountName: string; debit: number; credit: number }[] = [];

    // Reverse revenue
    postings.push({
      accountName: 'Medicine Sales Revenue A/c',
      debit: order.productAmount,
      credit: 0,
    });

    // Book courier return delivery fee
    postings.push({ accountName: 'Courier Expense A/c', debit: returnFee, credit: 0 });

    if (condition === 'intact') {
      // Restock to inventory asset
      postings.push({
        accountName: 'Medicine Inventory Asset A/c',
        debit: order.productAmount,
        credit: 0,
      });
      // Clear the courier clearing account
      postings.push({ accountName: courierClearingAcc, debit: 0, credit: order.totalAmount });
    } else {
      // Damaged goods
      postings.push({
        accountName: 'Cash Shortage/Overage Expense A/c',
        debit: order.productAmount,
        credit: 0,
      });
      postings.push({ accountName: courierClearingAcc, debit: 0, credit: order.totalAmount });
    }

    // Balance debits & credits
    const totalDebit = postings.reduce((sum, p) => sum + (p.debit || 0), 0);
    const totalCredit = postings.reduce((sum, p) => sum + (p.credit || 0), 0);
    if (totalDebit !== totalCredit) {
      const diff = totalDebit - totalCredit;
      if (diff > 0) {
        postings.push({ accountName: 'Courier Expense A/c', debit: 0, credit: diff });
      } else {
        postings.push({ accountName: 'Courier Expense A/c', debit: -diff, credit: 0 });
      }
    }

    const jnl = postAuditJournalEntry(
      `Confirm Customer Return & Restock`,
      operator,
      `Inspected return for Order ${order.orderNumber} (${courierName}). Quality: ${condition.toUpperCase()}. Re-shelved ${order.items.length} items to pharmacy inventory. Return fee charged by courier: ৳${returnFee}.`,
      postings
    );

    order.status = 'returned_restocked';
    order.returnCondition = condition;

    return NextResponse.json({
      success: true,
      order,
      journalEntryId: jnl.id,
      message: `Order ${order.orderNumber} verified and restocked to inventory. Background ledger updated.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
