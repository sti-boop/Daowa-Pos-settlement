import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { productKind } from '@/lib/accounting-sync';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

const COGS_LEDGER: Record<string, string> = {
  medicine: 'Medicine Purchase Cost',
  healthcare: 'Healthcare Product Purchase Cost',
  general: 'General Item Purchase Cost',
};
const COGS_GROUP: Record<string, string> = {
  medicine: 'Purchase of Medicines',
  healthcare: 'Purchase of Healthcare Products',
  general: 'Purchase of General Items',
};
const INVENTORY_LEDGER: Record<string, string> = {
  medicine: 'Medicine Stock',
  healthcare: 'Healthcare Products Stock',
  general: 'General Items Stock',
};
const INVENTORY_GROUP = 'Inventory (Stock in Hand)';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
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

async function findOrCreateStockItem(name: string, kind: string, unit: string) {
  const existing = await db.stockItem.findFirst({ where: { name } });
  if (existing) return existing;
  let groupName = 'General Items';
  if (kind === 'medicine') groupName = 'Medicines';
  else if (kind === 'healthcare') groupName = 'Medical Devices';
  let sg = await db.stockGroup.findUnique({ where: { name: groupName } });
  if (!sg) sg = await db.stockGroup.create({ data: { name: groupName, parentName: null } });
  return db.stockItem.create({
    data: {
      name,
      groupName,
      hsnCode: null,
      vatRate: 0,
      unit: unit || 'pcs',
      openingQty: 0,
      openingRate: 0,
      openingValue: 0,
      minStockLevel: 0,
      isActive: true,
    },
  });
}

/**
 * POST /api/purchases — record a supplier purchase.
 * Creates a Purchase voucher (PV): Dr COGS / Cr Supplier payable or Cash/Bank,
 * plus stock-inward transactions, and best-effort restocks the POS product.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      supplierName,
      paidVia = 'credit',
      bankLedgerName,
      reference,
      date,
      items,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one purchase item is required' }, { status: 400 });
    }

    // Classify each item into a COGS/inventory bucket.
    const byKind: Record<string, number> = { medicine: 0, healthcare: 0, general: 0 };
    for (const item of items) {
      const kind = productKind(item.name, item.category, item.generic);
      byKind[kind] += Number(item.quantity || 0) * Number(item.rate || 0);
    }
    const total = round2(byKind.medicine + byKind.healthcare + byKind.general);
    if (total <= 0) {
      return NextResponse.json({ error: 'Purchase total must be positive' }, { status: 400 });
    }

    // Credit side: supplier payable (default), cash, or bank.
    let creditLedgerName = supplierName || 'Supplier';
    let creditGroup = 'Payables (Money to Pay)';
    let creditBalanceType = 'Cr';
    if (paidVia === 'cash') {
      creditLedgerName = 'Counter Cash';
      creditGroup = 'Cash In Hand';
      creditBalanceType = 'Dr';
    } else if (paidVia === 'bank') {
      creditLedgerName = bankLedgerName || 'MTB Bank';
      creditGroup = 'Cash at Bank';
      creditBalanceType = 'Dr';
    }
    const creditLedger = await findOrCreateLedger(creditLedgerName, creditGroup, creditBalanceType);

    // Debit side: COGS ledgers per kind.
    const entries: { ledgerId: string; ledgerName: string; debit: number; credit: number }[] = [];
    for (const kind of Object.keys(byKind)) {
      const cost = round2(byKind[kind]);
      if (cost <= 0) continue;
      const cogs = await findOrCreateLedger(COGS_LEDGER[kind], COGS_GROUP[kind], 'Dr');
      entries.push({ ledgerId: cogs.id, ledgerName: cogs.name, debit: cost, credit: 0 });
    }
    entries.push({ ledgerId: creditLedger.id, ledgerName: creditLedger.name, debit: 0, credit: total });

    let vt = await db.voucherType.findUnique({ where: { name: 'Purchase' } });
    if (!vt) vt = await db.voucherType.create({ data: { name: 'Purchase', prefix: 'PV' } });

    const voucherNumber = await nextVoucherNumber('PV');
    const voucher = await db.voucher.create({
      data: {
        voucherNumber,
        reference: reference || `PO-${Date.now()}`,
        date: date || todayISO(),
        voucherTypeId: vt.id,
        narration: `Purchase from ${supplierName || 'supplier'} (${paidVia})${notes ? ` — ${notes}` : ''}`,
        totalAmount: total,
        entries: { create: entries },
      },
      include: { entries: true, voucherType: true },
    });

    // Stock inward transactions + best-effort POS restock.
    for (const item of items) {
      const kind = productKind(item.name, item.category, item.generic);
      const stockItem = await findOrCreateStockItem(item.name, kind, item.unit);
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      await db.stockTransaction.create({
        data: {
          voucherId: voucher.id,
          stockItemId: stockItem.id,
          itemName: item.name,
          quantity: qty,
          rate,
          value: round2(qty * rate),
          type: 'Inward',
          batchNo: item.batchNo || null,
          expiryDate: item.expiryDate || null,
          godown: item.godown || null,
        },
      });

      try {
        const { db: posDb } = await import('@/lib/db');
        const product = await posDb.product.findFirst({ where: { name: item.name } });
        if (product) {
          await posDb.product.update({
            where: { id: product.id },
            data: { stock: Number(product.stock || 0) + qty, costPrice: rate || product.costPrice },
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    await auditLog({
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityName: voucher.voucherNumber,
      description: `Purchase ${voucher.voucherNumber} from ${supplierName || 'supplier'} (BDT ${total.toFixed(2)})`,
    });

    return NextResponse.json({ success: true, voucherNumber, totalAmount: total }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record purchase';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
