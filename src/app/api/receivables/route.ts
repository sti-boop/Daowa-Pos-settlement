import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

const AR_GROUP = 'Receivables (Money to Receive)';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function agingBucket(days: number): string {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

async function findOrCreateLedger(name: string, groupName: string, balanceType = 'Dr') {
  const existing = await db.ledger.findFirst({ where: { name } });
  if (existing) return existing;
  const group = await db.ledgerGroup.findUnique({ where: { name: groupName } });
  if (!group) {
    try {
      await db.ledgerGroup.create({
        data: { name: groupName, code: '', isPrimary: false, nature: 'Asset', classification: 'Balance Sheet', isReserved: false },
      });
    } catch {
      /* already exists */
    }
  }
  return db.ledger.create({ data: { name, groupName, openingBalance: 0, balanceType, isActive: true } });
}

/**
 * GET /api/receivables — customer-wise outstanding + aging.
 * Outstanding is the authoritative net balance of each per-customer AR ledger;
 * aging is derived by FIFO-allocating receipts against the oldest sales invoices.
 */
export async function GET() {
  try {
    const ledgers = await db.ledger.findMany({
      where: { groupName: AR_GROUP, isActive: true },
      orderBy: { name: 'asc' },
    });
    const entries = await db.voucherEntry.findMany({
      include: { voucher: { include: { voucherType: { select: { prefix: true } } } } },
    });

    const rows: {
      ledgerId: string;
      ledgerName: string;
      customerName: string;
      outstanding: number;
      aging: Record<string, number>;
    }[] = [];

    for (const ledger of ledgers) {
      const les = entries.filter((e) => e.ledgerId === ledger.id);

      // Invoices = debit entries; receipts = credit entries.
      const invoices: { amount: number; date: string }[] = [];
      let payments = 0;
      for (const e of les) {
        const date = e.voucher?.date || todayISO();
        if (e.debit > 0) invoices.push({ amount: e.debit, date });
        if (e.credit > 0) payments += e.credit;
      }

      // FIFO allocate receipts against oldest invoices.
      invoices.sort((a, b) => a.date.localeCompare(b.date));
      let remaining = payments;
      for (const inv of invoices) {
        if (remaining <= 0.0005) break;
        const applied = Math.min(inv.amount, remaining);
        inv.amount -= applied;
        remaining -= applied;
      }

      const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      let outstanding = 0;
      for (const inv of invoices) {
        if (inv.amount > 0.005) {
          outstanding += inv.amount;
          buckets[agingBucket(daysAgo(inv.date))] += inv.amount;
        }
      }
      outstanding = Math.round(outstanding * 100) / 100;
      if (outstanding < 0.005) continue;

      const customerName = ledger.name.startsWith('Customer - ')
        ? ledger.name.slice('Customer - '.length)
        : ledger.name;

      rows.push({
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        customerName,
        outstanding,
        aging: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
      });
    }

    rows.sort((a, b) => b.outstanding - a.outstanding);
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch receivables';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/receivables — receive a customer payment.
 * Posts a Receipt voucher (RV): Dr Cash/Bank/MFS, Cr the customer's AR ledger,
 * then clears the customer's POS due balances and Settlement Hub due orders.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      ledgerName,
      amount,
      method = 'cash',
      bankLedgerName,
      mfsProvider,
      reference,
      notes,
    } = body;

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: 'A positive amount is required' }, { status: 400 });
    }

    // Resolve the receivable ledger: explicit ledgerName wins, then the
    // per-customer "Customer - X" ledger, then the walk-in AR ledger.
    let arLedgerName = ledgerName || (customerName ? `Customer - ${customerName}` : 'Customer Accounts Receivable');
    let arLedger = await db.ledger.findFirst({ where: { name: arLedgerName } });
    if (!arLedger && customerName) {
      arLedgerName = 'Customer Accounts Receivable';
      arLedger = await db.ledger.findFirst({ where: { name: arLedgerName } });
    }
    if (!arLedger) {
      return NextResponse.json(
        { error: `No receivable ledger found for ${customerName || 'walk-in customers'}` },
        { status: 404 }
      );
    }

    // Where the money lands
    let debitLedgerName = 'Counter Cash';
    let debitGroup = 'Cash In Hand';
    if (method === 'bank') {
      debitLedgerName = bankLedgerName || 'MTB Bank';
      debitGroup = 'Cash at Bank';
    } else if (method === 'mfs') {
      const provider = mfsProvider || 'bKash';
      debitLedgerName = `${provider} Merchant`;
      debitGroup = 'Mobile Banking (bKash/Nagad/Rocket)';
    }
    const debitLedger = await findOrCreateLedger(debitLedgerName, debitGroup, 'Dr');

    // Receipt voucher type (prefix RV)
    let vt = await db.voucherType.findUnique({ where: { name: 'Income' } });
    if (!vt) vt = await db.voucherType.create({ data: { name: 'Income', prefix: 'RV' } });

    const voucherNumber = await nextVoucherNumber('RV');
    const voucher = await db.voucher.create({
      data: {
        voucherNumber,
        reference: reference || `RCPT-${Date.now()}`,
        date: todayISO(),
        voucherTypeId: vt.id,
        narration: `Payment received from ${customerName || 'customer'} (${method})${notes ? ` — ${notes}` : ''}`,
        totalAmount: amt,
        entries: {
          create: [
            { ledgerId: debitLedger.id, ledgerName: debitLedger.name, debit: amt, credit: 0 },
            { ledgerId: arLedger.id, ledgerName: arLedger.name, debit: 0, credit: amt },
          ],
        },
      },
      include: { entries: true, voucherType: true },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityName: voucher.voucherNumber,
      description: `Receipt ${voucher.voucherNumber}: ৳${amt} received from ${customerName || 'customer'} via ${method}`,
    });

    // --- Full-stack state sync: clear POS due balances + Settlement Hub orders.
    try {
      const { db: posDb } = await import('@/lib/db');
      const sales = await posDb.sale.findMany({
        where: { paymentMethod: 'due', dueAmount: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      });
      let remaining = amt;
      for (const s of sales) {
        if (remaining <= 0.0005) break;
        const cname = s.customer?.name;
        const matches = customerName ? cname === customerName : !cname;
        if (!matches) continue;
        const pay = Math.min(s.dueAmount, remaining);
        await posDb.sale.update({ where: { id: s.id }, data: { dueAmount: Math.round((s.dueAmount - pay) * 100) / 100 } });
        remaining = Math.round((remaining - pay) * 100) / 100;
      }

      const store = await import('@/lib/store');
      for (const o of store.orders) {
        if (o.paymentMethod !== 'due' || o.status === 'cleared') continue;
        const matches = customerName ? o.customerName === customerName : o.customerName === 'Walk-in Customer';
        if (!matches) continue;
        const fullDue = (o as any).dueAmount ?? o.totalAmount;
        const pay = Math.min(fullDue, amt);
        (o as any).dueAmount = Math.max(0, Math.round((fullDue - pay) * 100) / 100);
        if ((o as any).dueAmount <= 0.0005) {
          o.status = 'cleared';
          o.isPaid = true;
          o.settledAt = new Date().toISOString();
        }
      }
    } catch {
      // Non-fatal — the accounting voucher is the source of truth.
    }

    return NextResponse.json(
      { success: true, voucherNumber, ledgerName: arLedgerName, amount: amt, method },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
