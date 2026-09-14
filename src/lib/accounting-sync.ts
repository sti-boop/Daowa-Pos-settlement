// @ts-nocheck
// Daowa POS → Accounting live sync bridge.
//
// Both apps share one Node process (the Accounting app is merged into this
// repository), so we can write directly into the accounting store whenever the
// POS creates data. This keeps a real-time, always-balanced double-entry mirror
// of POS activity inside the Accounting system.
//
// Voucher numbering follows the accounting module (`SV-2026-0001`, `JV-2026-0001`,
// `CNV-2026-0001`, …). Money-in is recorded at GROSS in the clearing / merchant /
// cash ledger at sale time; gateway & courier fees are recognised at settlement
// time (when the money actually hits the bank), exactly mirroring the
// Settlement Hub's double-entry engine.

import { db as posDb } from './db';
import { db as accDb } from './accounting-db';
import { nextVoucherNumber } from './accounting-numbering';

// Serialize all sync writes so voucher numbers are allocated strictly in order
// (multiple fire-and-forget settlement postings would otherwise race).
let syncChain: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = syncChain.then(fn, fn);
  syncChain = next.then(() => undefined, () => undefined);
  return next;
}

// ---------------------------------------------------------------------------
// Ledger / group helpers
// ---------------------------------------------------------------------------

async function findLedgerByName(name: string) {
  return accDb.ledger.findFirst({ where: { name } });
}

async function findOrCreateLedger(name: string, groupName: string, balanceType = 'Dr') {
  const existing = await findLedgerByName(name);
  if (existing) return existing;
  // ensure the group exists
  const group = await accDb.ledgerGroup.findUnique({ where: { name: groupName } });
  if (!group) {
    try {
      await accDb.ledgerGroup.create({
        data: { name: groupName, code: '', isPrimary: false, nature: 'Asset', classification: 'Balance Sheet', isReserved: false },
      });
    } catch {
      /* already exists */
    }
  }
  return accDb.ledger.create({ data: { name, groupName, openingBalance: 0, balanceType, isActive: true } });
}

async function findOrCreateVoucherType(name: string, prefix: string) {
  const vt = await accDb.voucherType.findUnique({ where: { name } });
  if (vt) return vt;
  return accDb.voucherType.create({ data: { name, prefix } });
}

async function findOrCreateStockGroup(name: string) {
  const g = await accDb.stockGroup.findUnique({ where: { name } });
  if (g) return g;
  return accDb.stockGroup.create({ data: { name, parentName: null } });
}

// ---------------------------------------------------------------------------
// Payment method → accounting ledger mapping
// ---------------------------------------------------------------------------

const MFS_LEDGERS: Record<string, string> = {
  bkash: 'bKash Merchant',
  nagad: 'Nagad Merchant',
  rocket: 'Rocket Merchant',
  upay: 'Upay Merchant',
};

function isMfs(method: string) {
  return method === 'bkash' || method === 'nagad' || method === 'rocket' || method === 'upay';
}

function titleCase(s: string): string {
  return (s || '').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

// Classify a sold item into one of the three revenue/inventory/COGS buckets.
type ProductKind = 'medicine' | 'healthcare' | 'general';

export function productKind(name?: string, category?: string, generic?: string): ProductKind {
  const n = `${name || ''} ${generic || ''} ${category || ''}`.toLowerCase();
  const cat = (category || '').toLowerCase();
  // Healthcare devices / consumables
  if (/mask|band|thermometer|saline|ors|glucometer|device|monitor|oximeter|surgical|syringe|glove|diabetic|blood|test kit|diaper|wipe/.test(n)) {
    return 'healthcare';
  }
  // Medicine (clinical) categories
  if (/analgesic|antibiotic|antacid|antihistamine|antidiabetic|diabetes|vitamin|supplement|cough|fever|capsule|tablet|syrup|drops|injection|ointment|cream|antifungal|antiviral|anti.?parasitic|steroid|cardio|gastric|ulcer|pain|allergy|antibacterial/.test(cat)) {
    return 'medicine';
  }
  // Medicine name heuristics
  if (
    /paracetamol|napa|ace|amoxicillin|azithromycin|ciprofloxacin|cetirizine|metformin|omeprazole|seclo|maxpro|losec|omez|vitamin|syrup|tablet|cap|mg/.test(n) &&
    !/savlon|dettol|sanitizer|mask|band|thermometer|diaper|wipe/.test(n)
  ) {
    return 'medicine';
  }
  return 'general';
}

// Ledger name for the sales revenue of a product kind
function salesLedgerForKind(kind: ProductKind): string {
  if (kind === 'medicine') return 'Shop Medicine Sales';
  if (kind === 'healthcare') return 'Shop Healthcare Sales';
  return 'Shop General Sales';
}

// COA group name for a sales revenue ledger (healthcare/general were wrongly
// filed under 'Medicine Sales' before — now each goes to its own group).
function groupForRevenueLedger(name: string): string {
  if (/Healthcare/.test(name)) return 'Healthcare Product Sales';
  if (/General/.test(name)) return 'General Item Sales';
  return 'Medicine Sales';
}

// COGS + inventory ledgers/groups per product kind
const COGS_LEDGER: Record<ProductKind, string> = {
  medicine: 'Medicine Purchase Cost',
  healthcare: 'Healthcare Product Purchase Cost',
  general: 'General Item Purchase Cost',
};
const COGS_GROUP: Record<ProductKind, string> = {
  medicine: 'Purchase of Medicines',
  healthcare: 'Purchase of Healthcare Products',
  general: 'Purchase of General Items',
};
const INVENTORY_LEDGER: Record<ProductKind, string> = {
  medicine: 'Medicine Stock',
  healthcare: 'Healthcare Products Stock',
  general: 'General Items Stock',
};
const INVENTORY_GROUP = 'Inventory (Stock in Hand)';

function salesLedgerForProduct(name: string, category?: string, generic?: string): string {
  return salesLedgerForKind(productKind(name, category, generic));
}

function groupForDebitLedger(name: string): string {
  if (name === 'Counter Cash') return 'Cash In Hand';
  if (name === 'Cash in Safe/Vault') return 'Cash In Hand';
  if (/^.*Bank$/.test(name)) return 'Cash at Bank';
  if (/bKash|Nagad|Rocket|Upay Merchant/.test(name)) return 'Mobile Banking (bKash/Nagad/Rocket)';
  if (/Clearing A\/c|Card Clearing/.test(name)) return 'Clearing Accounts';
  if (/Receivable/.test(name)) return 'Receivables (Money to Receive)';
  if (/Customer - /.test(name)) return 'Receivables (Money to Receive)';
  if (/Cash Out Charge/.test(name)) return 'bKash/Nagad Cash Out Charges';
  return 'Miscellaneous Expenses';
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Split rounding into Income (customer paid extra → credit) vs Expense
// (customer paid less → debit), matching the Settlement Hub's two accounts.
const ROUNDING_INCOME = { ledger: 'Rounding Income', group: 'Round Off', balanceType: 'Cr' };
const ROUNDING_EXPENSE = { ledger: 'Rounding Expense', group: 'Round Off', balanceType: 'Dr' };

async function pushRoundingAdjustment(
  push: (ledgerId: string, ledgerName: string, debit: number, credit: number) => void,
  diff: number,
) {
  const d = round2(diff);
  if (Math.abs(d) <= 0.0001) return;
  if (d > 0) {
    const rec = await findOrCreateLedger(ROUNDING_INCOME.ledger, ROUNDING_INCOME.group, ROUNDING_INCOME.balanceType);
    push(rec.id, rec.name, 0, d);
  } else {
    const rec = await findOrCreateLedger(ROUNDING_EXPENSE.ledger, ROUNDING_EXPENSE.group, ROUNDING_EXPENSE.balanceType);
    push(rec.id, rec.name, -d, 0);
  }
}

// ---------------------------------------------------------------------------
// Sync: POS catalog (products → stock items, customers → ledgers)
// ---------------------------------------------------------------------------

export async function syncPosCatalogToAccounting() {
  const products = await posDb.product.findMany({});
  const customers = await posDb.customer.findMany({});

  const stats = { products: 0, customers: 0, stockGroups: 0 };

  for (const p of products) {
    const groupName = p.category || 'General Items';
    await findOrCreateStockGroup(groupName);
    const existing = await accDb.stockItem.findFirst({ where: { name: p.name } });
    if (!existing) {
      await accDb.stockItem.create({
        data: {
          name: p.name,
          groupName,
          hsnCode: null,
          vatRate: 0,
          unit: p.unit || 'pcs',
          openingQty: p.stock ?? 0,
          openingRate: p.costPrice ?? 0,
          openingValue: (p.stock ?? 0) * (p.costPrice ?? 0),
          minStockLevel: 0,
          isActive: true,
        },
      });
      stats.products++;
    }
  }

  for (const c of customers) {
    const ledgerName = `Customer - ${c.name}`;
    const existing = await findLedgerByName(ledgerName);
    if (!existing) {
      await findOrCreateLedger(ledgerName, 'Receivables (Money to Receive)', 'Dr');
      stats.customers++;
    }
  }

  // Update inventory value from POS stock valuation
  await refreshInventoryValue();

  return stats;
}

export async function refreshInventoryValue() {
  const products = await posDb.product.findMany({});
  const value = products.reduce((sum: number, p: any) => sum + (p.stock || 0) * (p.costPrice || 0), 0);
  const company = await accDb.company.findFirst();
  if (company) {
    await accDb.company.update({
      where: { id: company.id },
      data: { inventoryValue: Math.round(value * 100) / 100, inventoryValueUpdatedAt: new Date() },
    });
  }
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sync: POS sale → Accounting Sales voucher (+ stock outward)
// ---------------------------------------------------------------------------

interface PosSaleForSync {
  id?: string;
  invoiceNo: string;
  customerId?: string | null;
  customerName?: string | null;
  subtotal: number;
  totalDiscount?: number;
  deliveryCharge?: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount?: number;
  dueAmount?: number;
  isDelivery?: boolean;
  deliveryPartnerCode?: string;
  freeDelivery?: boolean;
  saleItems?: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  splitPayments?: { method: string; amount: number }[];
  createdAt?: Date | string;
}

// Resolve per-product metadata (category / generic / cost price) once per item.
interface ResolvedItem {
  kind: ProductKind;
  costPrice: number;
  category?: string;
  generic?: string;
}

async function resolveItem(name: string): Promise<ResolvedItem> {
  try {
    const p = await posDb.product.findFirst({ where: { name } });
    return {
      kind: productKind(name, p?.category, p?.generic),
      costPrice: Number(p?.costPrice || 0),
      category: p?.category,
      generic: p?.generic,
    };
  } catch {
    return { kind: productKind(name), costPrice: 0 };
  }
}

// One-time opening-stock posting so inventory ledgers reflect the true stock
// valuation before COGS begins flowing. Computed as "current POS stock value +
// cost of sales not yet mirrored into accounting", so it stays consistent no
// matter whether this runs before or after sales have already synced.
async function ensureOpeningStock() {
  const marker = 'OPENING-STOCK';
  const existing = await accDb.voucher.findFirst({ where: { reference: marker } });
  if (existing) return;

  const products = await posDb.product.findMany({});
  const byKind: Record<ProductKind, number> = { medicine: 0, healthcare: 0, general: 0 };
  for (const p of products) {
    const cost = Number(p.costPrice || 0) * Number(p.stock || 0);
    byKind[productKind(p.name, p.category, p.generic)] += cost;
  }

  // Add back cost of sales not yet posted to accounting (their COGS will be
  // posted when the sale is synced), so opening + future COGS = current stock.
  const sales = await posDb.sale.findMany({ include: { saleItems: true } });
  for (const s of sales) {
    const mirrored = await accDb.voucher.findFirst({ where: { reference: s.invoiceNo } });
    if (mirrored) continue;
    for (const si of s.saleItems || []) {
      const cost = await posDb.product.findFirst({ where: { name: si.productName } })
        .then((p) => Number(p?.costPrice || 0) * Number(si.quantity || 0))
        .catch(() => 0);
      byKind[productKind(si.productName, undefined, undefined)] += cost;
    }
  }

  const total = round2(byKind.medicine + byKind.healthcare + byKind.general);
  if (total <= 0) return;

  const capital = await findOrCreateLedger("Owner's Capital A/c", "Owner's Capital", 'Cr');
  const entries: { ledgerId: string; ledgerName: string; debit: number; credit: number }[] = [];
  for (const kind of ['medicine', 'healthcare', 'general'] as ProductKind[]) {
    const value = round2(byKind[kind]);
    if (value <= 0) continue;
    const inv = await findOrCreateLedger(INVENTORY_LEDGER[kind], INVENTORY_GROUP, 'Dr');
    entries.push({ ledgerId: inv.id, ledgerName: inv.name, debit: value, credit: 0 });
  }
  entries.push({ ledgerId: capital.id, ledgerName: capital.name, debit: 0, credit: total });

  const journalType = await findOrCreateVoucherType('Journal', 'JV');
  const voucherNumber = await nextVoucherNumber('JV');
  await accDb.voucher.create({
    data: {
      voucherNumber,
      reference: marker,
      date: new Date().toISOString().split('T')[0],
      voucherTypeId: journalType.id,
      narration: 'Opening inventory valuation (auto from POS stock)',
      totalAmount: total,
      entries: { create: entries },
    },
  });
}

async function syncPosSaleToAccountingImpl(sale: PosSaleForSync) {
  // Post opening inventory once before any COGS flows.
  await ensureOpeningStock();

  const salesType = await findOrCreateVoucherType('Sales', 'SV');
  const today = new Date().toISOString().split('T')[0];

  const subtotal = Number(sale.subtotal || 0);
  const totalDiscount = Number(sale.totalDiscount || 0);
  const deliveryCharge = Number(sale.deliveryCharge || 0);
  const grandTotal = Number(sale.grandTotal || 0);
  const productAmount = round2(subtotal - totalDiscount);

  const entries: { ledgerId: string; ledgerName: string; debit: number; credit: number }[] = [];
  const push = (ledgerId: string, ledgerName: string, debit: number, credit: number) =>
    entries.push({ ledgerId, ledgerName, debit: round2(debit), credit: round2(credit) });

  // --- Determine how much money comes into the business and through which channel.
  // Third-party courier: company receives only the product amount (delivery charge
  // is between courier & customer). Own rider: company receives product + delivery.
  let debitAmount = grandTotal;
  let deliveryIncome = 0;
  if (sale.isDelivery) {
    if (sale.deliveryPartnerCode && sale.deliveryPartnerCode !== 'daowa_rider') {
      debitAmount = productAmount;
    } else {
      debitAmount = grandTotal;
      if (!sale.freeDelivery) deliveryIncome = deliveryCharge;
    }
  }

  const customerLedgerName = sale.customerName ? `Customer - ${sale.customerName}` : 'Customer Accounts Receivable';

  // --- Build debit (money-in) lines at GROSS — fees are recognised at settlement.
  const debitLines: { name: string; amount: number }[] = [];
  const addLine = (name: string, amount: number) => {
    if (amount > 0) debitLines.push({ name, amount: round2(amount) });
  };

  if (sale.paymentMethod === 'split' && Array.isArray(sale.splitPayments) && sale.splitPayments.length > 0) {
    for (const sp of sale.splitPayments) {
      if (sp.method === 'cash') addLine('Counter Cash', sp.amount);
      else if (isMfs(sp.method)) addLine(MFS_LEDGERS[sp.method] || 'Counter Cash', sp.amount);
      else if (sp.method === 'card') addLine('Card Clearing A/c', sp.amount);
      else addLine('Counter Cash', sp.amount);
    }
  } else if (sale.isDelivery) {
    if (sale.deliveryPartnerCode === 'daowa_rider') {
      addLine('Daowa Rider Clearing A/c', debitAmount);
    } else {
      const courier = sale.deliveryPartnerCode ? titleCase(sale.deliveryPartnerCode) : 'Courier';
      addLine(`${courier} Clearing A/c`, debitAmount);
    }
  } else if (sale.paymentMethod === 'due') {
    addLine(customerLedgerName, debitAmount);
  } else if (isMfs(sale.paymentMethod)) {
    addLine(MFS_LEDGERS[sale.paymentMethod] || 'Counter Cash', debitAmount);
  } else if (sale.paymentMethod === 'card') {
    addLine('Card Clearing A/c', debitAmount);
  } else {
    // cash or cod-at-counter → cash
    addLine('Counter Cash', debitAmount);
  }

  for (const dl of debitLines) {
    const ledger = await findOrCreateLedger(dl.name, groupForDebitLedger(dl.name));
    push(ledger.id, ledger.name, dl.amount, 0);
  }

  // --- Credit side: revenue split by product category, plus delivery income.
  const catTotals: Record<string, number> = {};
  const items = sale.saleItems || [];
  for (const item of items) {
    const resolved = await resolveItem(item.productName);
    const ledgerName = salesLedgerForKind(resolved.kind);
    catTotals[ledgerName] = (catTotals[ledgerName] || 0) + Number(item.subtotal || 0);
  }
  const totalCatSubtotal = Object.values(catTotals).reduce((a, b) => a + b, 0);

  for (const [ledgerName, sub] of Object.entries(catTotals)) {
    const share = totalCatSubtotal > 0 ? productAmount * (sub / totalCatSubtotal) : productAmount;
    const ledger = await findOrCreateLedger(ledgerName, groupForRevenueLedger(ledgerName), 'Cr');
    push(ledger.id, ledger.name, 0, share);
  }
  if (Object.keys(catTotals).length === 0) {
    const revenueLedger = await findOrCreateLedger('Shop General Sales', 'General Item Sales', 'Cr');
    push(revenueLedger.id, revenueLedger.name, 0, productAmount);
  }

  if (deliveryIncome > 0) {
    const deliveryLedger = await findOrCreateLedger('Delivery Charges Collected', 'Delivery Income', 'Cr');
    push(deliveryLedger.id, deliveryLedger.name, 0, deliveryIncome);
  }

  // --- COGS + inventory relief (matching concept: sold goods leave inventory
  // at cost and become Cost of Goods Sold). Returns reverse this later.
  const cogsTotals: Record<ProductKind, number> = { medicine: 0, healthcare: 0, general: 0 };
  for (const item of items) {
    const resolved = await resolveItem(item.productName);
    cogsTotals[resolved.kind] += resolved.costPrice * Number(item.quantity || 0);
  }
  for (const kind of ['medicine', 'healthcare', 'general'] as ProductKind[]) {
    const cost = round2(cogsTotals[kind]);
    if (cost <= 0) continue;
    const cogsLedger = await findOrCreateLedger(COGS_LEDGER[kind], COGS_GROUP[kind], 'Dr');
    const invLedger = await findOrCreateLedger(INVENTORY_LEDGER[kind], INVENTORY_GROUP, 'Dr');
    push(cogsLedger.id, cogsLedger.name, cost, 0);
    push(invLedger.id, invLedger.name, 0, cost);
  }

  // --- Force balance via Rounding Income / Rounding Expense accounts
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  await pushRoundingAdjustment(push, totalDebit - totalCredit);

  // --- Create the voucher (sequential accounting numbering, reference = POS invoice)
  const voucherNumber = await nextVoucherNumber('SV');
  const voucher = await accDb.voucher.create({
    data: {
      voucherNumber,
      reference: sale.invoiceNo,
      date: today,
      voucherTypeId: salesType.id,
      narration: `POS sale ${sale.invoiceNo} (${sale.paymentMethod}${sale.isDelivery ? ', delivery' : ''})`,
      totalAmount: grandTotal,
      entries: { create: entries },
    },
  });

  // Stock outward for each line item
  for (const item of items) {
    const stockItem = await findOrCreateStockItemFromProduct(item.productName);
    if (stockItem) {
      await accDb.stockTransaction.create({
        data: {
          voucherId: voucher.id,
          stockItemId: stockItem.id,
          itemName: item.productName,
          quantity: item.quantity,
          rate: item.unitPrice,
          value: round2(item.subtotal),
          type: 'Outward',
          batchNo: null,
          expiryDate: null,
          godown: null,
        },
      });
    }
  }

  await refreshInventoryValue();

  return { voucher, entries };
}

async function findOrCreateStockItemFromProduct(productName: string) {
  const existing = await accDb.stockItem.findFirst({ where: { name: productName } });
  if (existing) return existing;

  let groupName = 'General Items';
  try {
    const p = await posDb.product.findFirst({ where: { name: productName } });
    if (p?.category) groupName = p.category;
  } catch {
    /* ignore */
  }
  await findOrCreateStockGroup(groupName);
  return accDb.stockItem.create({
    data: {
      name: productName,
      groupName,
      hsnCode: null,
      vatRate: 0,
      unit: 'pcs',
      openingQty: 0,
      openingRate: 0,
      openingValue: 0,
      minStockLevel: 0,
      isActive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Sync: POS return → Accounting Credit Note voucher (+ stock inward)
// ---------------------------------------------------------------------------

async function syncPosReturnToAccountingImpl(sale: any, returnItems: { productName: string; quantity: number; unitPrice: number; refundAmount: number }[], totalRefund: number, reason?: string) {
  const noteType = await findOrCreateVoucherType('Credit Note', 'CNV');
  const today = new Date().toISOString().split('T')[0];

  const entries: { ledgerId: string; ledgerName: string; debit: number; credit: number }[] = [];
  const push = (ledgerId: string, ledgerName: string, debit: number, credit: number) =>
    entries.push({ ledgerId, ledgerName, debit: round2(debit), credit: round2(credit) });

  // Debit: reverse the revenue (split by product category)
  const catTotals: Record<string, number> = {};
  const cogsTotals: Record<ProductKind, number> = { medicine: 0, healthcare: 0, general: 0 };
  for (const item of returnItems) {
    const resolved = await resolveItem(item.productName);
    const ledgerName = salesLedgerForKind(resolved.kind);
    catTotals[ledgerName] = (catTotals[ledgerName] || 0) + Number(item.refundAmount || 0);
    cogsTotals[resolved.kind] += resolved.costPrice * Number(item.quantity || 0);
  }
  for (const [ledgerName, amt] of Object.entries(catTotals)) {
    const ledger = await findOrCreateLedger(ledgerName, groupForRevenueLedger(ledgerName), 'Cr');
    push(ledger.id, ledger.name, amt, 0);
  }

  // Re-stock inventory and reverse COGS for the returned goods (at cost).
  for (const kind of ['medicine', 'healthcare', 'general'] as ProductKind[]) {
    const cost = round2(cogsTotals[kind]);
    if (cost <= 0) continue;
    const invLedger = await findOrCreateLedger(INVENTORY_LEDGER[kind], INVENTORY_GROUP, 'Dr');
    const cogsLedger = await findOrCreateLedger(COGS_LEDGER[kind], COGS_GROUP[kind], 'Dr');
    push(invLedger.id, invLedger.name, cost, 0);
    push(cogsLedger.id, cogsLedger.name, 0, cost);
  }

  // Credit: refund back through the original payment channel
  let refundLedgerName = 'Counter Cash';
  const pm = (sale?.paymentMethod || 'cash').toLowerCase();
  if (pm === 'due') refundLedgerName = sale?.customerName ? `Customer - ${sale.customerName}` : 'Customer Accounts Receivable';
  else if (isMfs(pm)) refundLedgerName = MFS_LEDGERS[pm] || 'Counter Cash';
  else if (pm === 'card') refundLedgerName = 'Card Clearing A/c';
  const refundLedger = await findOrCreateLedger(refundLedgerName, groupForDebitLedger(refundLedgerName));
  push(refundLedger.id, refundLedger.name, 0, totalRefund);

  // Balance via Rounding Income / Rounding Expense
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  await pushRoundingAdjustment(push, totalDebit - totalCredit);

  const voucherNumber = await nextVoucherNumber('CNV');
  const voucher = await accDb.voucher.create({
    data: {
      voucherNumber,
      reference: sale?.invoiceNo ? `RET-${sale.invoiceNo}` : `RET-${Date.now()}`,
      date: today,
      voucherTypeId: noteType.id,
      narration: `Return against ${sale?.invoiceNo || 'sale'}${reason ? ` — ${reason}` : ''}`,
      totalAmount: totalRefund,
      entries: { create: entries },
    },
  });

  // Stock inward for returned items
  for (const item of returnItems) {
    const stockItem = await findOrCreateStockItemFromProduct(item.productName);
    if (stockItem) {
      await accDb.stockTransaction.create({
        data: {
          voucherId: voucher.id,
          stockItemId: stockItem.id,
          itemName: item.productName,
          quantity: item.quantity,
          rate: item.unitPrice,
          value: round2(item.refundAmount),
          type: 'Inward',
          batchNo: null,
          expiryDate: null,
          godown: null,
        },
      });
    }
  }

  await refreshInventoryValue();

  return { voucher, entries };
}

// ---------------------------------------------------------------------------
// Sync: Settlement Hub journal → Accounting Journal voucher
// ---------------------------------------------------------------------------

// Maps Settlement Hub account names onto the accounting chart of accounts so
// the clearing balances created at sale time net to zero at settlement time.
const SETTLEMENT_LEDGER_MAP: Record<string, { ledger: string; group: string }> = {
  'POS Cash Holding A/c': { ledger: 'Counter Cash', group: 'Cash In Hand' },
  'Main Cash/Vault A/c': { ledger: 'Cash in Safe/Vault', group: 'Cash In Hand' },
  'MTB Bank A/c': { ledger: 'MTB Bank', group: 'Cash at Bank' },
  'BRAC Bank A/c': { ledger: 'BRAC Bank', group: 'Cash at Bank' },
  'City Bank A/c': { ledger: 'City Bank', group: 'Cash at Bank' },
  'bKash Clearing A/c': { ledger: 'bKash Merchant', group: 'Mobile Banking (bKash/Nagad/Rocket)' },
  'Nagad Clearing A/c': { ledger: 'Nagad Merchant', group: 'Mobile Banking (bKash/Nagad/Rocket)' },
  'Rocket Clearing A/c': { ledger: 'Rocket Merchant', group: 'Mobile Banking (bKash/Nagad/Rocket)' },
  'Upay Clearing A/c': { ledger: 'Upay Merchant', group: 'Mobile Banking (bKash/Nagad/Rocket)' },
  'Card Clearing A/c': { ledger: 'Card Clearing A/c', group: 'Clearing Accounts' },
  'Daowa Rider Clearing A/c': { ledger: 'Daowa Rider Clearing A/c', group: 'Clearing Accounts' },
  'Steadfast Clearing A/c': { ledger: 'Steadfast Clearing A/c', group: 'Clearing Accounts' },
  'Pathao Clearing A/c': { ledger: 'Pathao Clearing A/c', group: 'Clearing Accounts' },
  'RedX Clearing A/c': { ledger: 'RedX Clearing A/c', group: 'Clearing Accounts' },
  'Carrybee Clearing A/c': { ledger: 'Carrybee Clearing A/c', group: 'Clearing Accounts' },
  'Paperfly Clearing A/c': { ledger: 'Paperfly Clearing A/c', group: 'Clearing Accounts' },
  'Customer Accounts Receivable': { ledger: 'Customer Accounts Receivable', group: 'Receivables (Money to Receive)' },
  'Medicine Inventory Asset A/c': { ledger: 'Medicine Stock', group: 'Inventory (Stock in Hand)' },
  'Medicine Sales Revenue A/c': { ledger: 'Shop Medicine Sales', group: 'Medicine Sales' },
  'Delivery Fee Revenue A/c': { ledger: 'Delivery Charges Collected', group: 'Delivery Income' },
  'Courier Expense A/c': { ledger: 'Courier Charges', group: 'Delivery & Packaging Cost' },
  'MFS Charge Expense A/c': { ledger: 'bKash Cash Out Charge', group: 'bKash/Nagad Cash Out Charges' },
  'Card Gateway Expense A/c': { ledger: 'Bank Charges', group: 'Bank Charges & Interest' },
  'Cash Shortage/Overage Expense A/c': { ledger: 'Cash Shortage/Overage', group: 'Cash Shortage / Overage' },
  'Rounding Income A/c': { ledger: 'Rounding Income', group: 'Round Off' },
  'Rounding Expense A/c': { ledger: 'Rounding Expense', group: 'Round Off' },
};

// Detect which MFS provider a settlement journal belongs to, so the cash-out
// charge lands on the correct provider ledger (bKash/Nagad/Rocket/Upay).
function mfsProviderFromContext(context?: string): string | null {
  const text = (context || '').toLowerCase();
  const match = /(bkash|nagad|rocket|upay)/.exec(text);
  return match ? match[1] : null;
}

const MFS_DISPLAY_NAMES: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  upay: 'Upay',
};

function ledgerForSettlementAccount(accountName: string, context?: string): { ledger: string; group: string } {
  // Provider-aware MFS charge: "Settle bKash to Bank" → bKash Cash Out Charge.
  if (accountName === 'MFS Charge Expense A/c') {
    const provider = mfsProviderFromContext(context);
    if (provider) {
      const name = MFS_DISPLAY_NAMES[provider] || provider;
      return { ledger: `${name} Cash Out Charge`, group: 'bKash/Nagad Cash Out Charges' };
    }
  }
  const mapped = SETTLEMENT_LEDGER_MAP[accountName];
  if (mapped) return mapped;
  // Fallback: reuse the settlement account name, guess group by account kind.
  if (/Clearing A\/c/.test(accountName)) return { ledger: accountName, group: 'Clearing Accounts' };
  if (/^Customer - /.test(accountName)) return { ledger: accountName, group: 'Receivables (Money to Receive)' };
  if (/Expense/.test(accountName)) return { ledger: accountName, group: 'Miscellaneous Expenses' };
  if (/Revenue|Sales|Income/.test(accountName)) return { ledger: accountName, group: 'Medicine Sales' };
  if (/Bank/.test(accountName)) return { ledger: accountName, group: 'Cash at Bank' };
  return { ledger: accountName, group: 'Miscellaneous Expenses' };
}

async function syncSettlementPostingsToAccountingImpl(entry: {
  id?: string;
  referenceNumber?: string;
  userAction?: string;
  operator?: string;
  narration?: string;
  postings: { accountName: string; debit: number; credit: number }[];
}) {
  if (!entry || !Array.isArray(entry.postings) || entry.postings.length === 0) return null;
  // Sale postings already produce a Sales voucher; resets are not business events.
  if (/Sale Approval|Database Reset/i.test(entry.userAction || '')) return null;

  // Prefer the unique journal entry id for dedupe (referenceNumber can collide
  // when several journals are posted in the same millisecond, e.g. EOD close).
  const reference = entry.id || entry.referenceNumber || `JNL-${Date.now()}`;
  const existing = await accDb.voucher.findFirst({ where: { reference } });
  if (existing) return existing;

  const journalType = await findOrCreateVoucherType('Journal', 'JV');
  const today = new Date().toISOString().split('T')[0];

  const entries: { ledgerId: string; ledgerName: string; debit: number; credit: number }[] = [];
  const push = (ledgerId: string, ledgerName: string, debit: number, credit: number) =>
    entries.push({ ledgerId, ledgerName, debit: round2(debit), credit: round2(credit) });

  for (const p of entry.postings) {
    const debit = Number(p.debit || 0);
    const credit = Number(p.credit || 0);
    if (debit === 0 && credit === 0) continue;
    const { ledger, group } = ledgerForSettlementAccount(p.accountName, `${entry.userAction || ''} ${entry.narration || ''}`);
    const rec = await findOrCreateLedger(ledger, group, debit > 0 ? 'Dr' : 'Cr');
    push(rec.id, rec.name, debit, credit);
  }

  // Force balance (should already balance, but guard against float drift)
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  await pushRoundingAdjustment(push, totalDebit - totalCredit);

  const voucherNumber = await nextVoucherNumber('JV');
  const voucher = await accDb.voucher.create({
    data: {
      voucherNumber,
      reference,
      date: today,
      voucherTypeId: journalType.id,
      narration: entry.narration || entry.userAction || 'Settlement journal',
      totalAmount: round2(Math.max(totalDebit, totalCredit)),
      entries: { create: entries },
    },
  });

  return { voucher, entries };
}

// ---------------------------------------------------------------------------
// Serialized public API (guarantees in-order voucher numbering)
// ---------------------------------------------------------------------------

export function syncPosSaleToAccounting(sale: PosSaleForSync) {
  return serialized(() => syncPosSaleToAccountingImpl(sale));
}

export function syncPosReturnToAccounting(
  sale: any,
  returnItems: { productName: string; quantity: number; unitPrice: number; refundAmount: number }[],
  totalRefund: number,
  reason?: string
) {
  return serialized(() => syncPosReturnToAccountingImpl(sale, returnItems, totalRefund, reason));
}

export function syncSettlementPostingsToAccounting(entry: {
  id?: string;
  referenceNumber?: string;
  userAction?: string;
  operator?: string;
  narration?: string;
  postings: { accountName: string; debit: number; credit: number }[];
}) {
  return serialized(() => syncSettlementPostingsToAccountingImpl(entry));
}

// ---------------------------------------------------------------------------
// Full-sync entry point
// ---------------------------------------------------------------------------

export async function runFullSync() {
  const catalog = await syncPosCatalogToAccounting();

  // Sync existing POS sales (most recent 200) into accounting vouchers.
  const sales = await posDb.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  let salesSynced = 0;
  let skipped = 0;
  for (const s of sales) {
    const exists = await accDb.voucher.findFirst({ where: { reference: s.invoiceNo } });
    if (exists) {
      skipped++;
      continue;
    }
    await syncPosSaleToAccounting({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerId: s.customerId,
      customerName: s.customer?.name,
      subtotal: s.subtotal,
      totalDiscount: s.totalDiscount,
      deliveryCharge: s.deliveryCharge,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      receivedAmount: s.receivedAmount,
      dueAmount: s.dueAmount,
      isDelivery: s.isDelivery,
      deliveryPartnerCode: s.deliveryPartnerCode,
      freeDelivery: s.freeDelivery,
      saleItems: (s.saleItems || []).map((si: any) => ({
        productName: si.productName,
        quantity: si.quantity,
        unitPrice: si.unitPrice,
        subtotal: si.subtotal,
      })),
      splitPayments: s.splitPayments || undefined,
      createdAt: s.createdAt,
    });
    salesSynced++;
  }

  const inventoryValue = await refreshInventoryValue();

  return {
    catalog,
    salesSynced,
    salesSkipped: skipped,
    inventoryValue,
    ledgerCount: await accDb.ledger.count({}),
    voucherCount: await accDb.voucher.count({}),
  };
}
