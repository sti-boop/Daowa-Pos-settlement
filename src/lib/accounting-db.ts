// @ts-nocheck
// Daowa Accounting — in-memory data engine (Prisma-like API).
//
// The sandbox cannot download the native Prisma query engine (binaries.prisma.sh
// is unreachable), so the accounting app runs on this resilient in-memory store
// that mirrors the Prisma query surface used by the accounting API routes.
// It shares a single process with the POS app, which is what makes live
// POS → Accounting sync possible (see src/lib/accounting-sync.ts).

import {
  DEFAULT_GROUPS,
  DEFAULT_VOUCHER_TYPES,
  DEFAULT_LEDGERS,
  DEFAULT_STOCK_GROUPS,
  DEFAULT_STOCK_ITEMS,
} from './accounting-seed-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function cmp(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  const na = a instanceof Date ? a.getTime() : Number(a);
  const nb = b instanceof Date ? b.getTime() : Number(b);
  return na - nb;
}

// ---------------------------------------------------------------------------
// In-memory store + seed
// ---------------------------------------------------------------------------

interface Store {
  company: Map<string, any>;
  ledgerGroups: Map<string, any>;
  ledgers: Map<string, any>;
  voucherTypes: Map<string, any>;
  vouchers: Map<string, any>;
  voucherEntries: Map<string, any>;
  recurringJournals: Map<string, any>;
  recurringEntries: Map<string, any>;
  stockGroups: Map<string, any>;
  stockItems: Map<string, any>;
  stockTransactions: Map<string, any>;
  auditLogs: Map<string, any>;
  fixedAssets: Map<string, any>;
  bankReconciliations: Map<string, any>;
  // implicit m2m: recurringJournal <-> voucher
  rjVouchers: Map<string, Set<string>>; // recurringJournalId -> voucherIds
  seeded: boolean;
}

function createStore(): Store {
  return {
    company: new Map(),
    ledgerGroups: new Map(),
    ledgers: new Map(),
    voucherTypes: new Map(),
    vouchers: new Map(),
    voucherEntries: new Map(),
    recurringJournals: new Map(),
    recurringEntries: new Map(),
    stockGroups: new Map(),
    stockItems: new Map(),
    stockTransactions: new Map(),
    auditLogs: new Map(),
    fixedAssets: new Map(),
    bankReconciliations: new Map(),
    rjVouchers: new Map(),
    seeded: false,
  };
}

const globalStore = globalThis as unknown as { __daowa_accounting_store?: Store };

export function getAccountingStore(): Store {
  if (!globalStore.__daowa_accounting_store) {
    globalStore.__daowa_accounting_store = createStore();
    seedIfEmpty(globalStore.__daowa_accounting_store);
  }
  return globalStore.__daowa_accounting_store;
}

function seedIfEmpty(store: Store) {
  if (store.seeded) return;
  store.seeded = true;

  if (!store.company.has('company_1')) {
    store.company.set('company_1', {
      id: 'company_1',
      name: 'Daowa Healthcare',
      address: 'Daowa.net Healthcare Store',
      phone: '',
      email: 'info@daowa.net',
      bin: '',
      tin: '',
      fYearStart: '2025-07-01',
      fYearEnd: '2026-06-30',
      currency: 'BDT',
      logo: '',
      inventoryValue: 0,
      inventoryValueUpdatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  for (const g of DEFAULT_GROUPS) {
    if (!Array.from(store.ledgerGroups.values()).some((x) => x.name === g.name)) {
      const rec = {
        id: uid('grp'),
        ...g,
        parentName: g.parentName ?? null,
        isPrimary: g.isPrimary ?? false,
        nature: g.nature ?? 'Asset',
        classification: g.classification ?? 'Balance Sheet',
        subCategory: g.subCategory ?? '',
        affectsGrossProfit: g.affectsGrossProfit ?? false,
        isTaxRelated: g.isTaxRelated ?? false,
        isReserved: g.isReserved ?? false,
        notes: g.notes ?? '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.ledgerGroups.set(rec.id, rec);
    }
  }

  for (const vt of DEFAULT_VOUCHER_TYPES) {
    if (!Array.from(store.voucherTypes.values()).some((x) => x.name === vt.name)) {
      const rec = { id: uid('vt'), name: vt.name, prefix: vt.prefix, numbering: 'Manual', createdAt: new Date() };
      store.voucherTypes.set(rec.id, rec);
    }
  }

  for (const l of DEFAULT_LEDGERS) {
    if (!Array.from(store.ledgers.values()).some((x) => x.name === l.name)) {
      const rec = {
        id: uid('ldg'),
        name: l.name,
        groupName: l.groupName,
        openingBalance: l.openingBalance ?? 0,
        balanceType: l.balanceType ?? 'Dr',
        bin: null,
        phone: null,
        email: null,
        address: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.ledgers.set(rec.id, rec);
    }
  }

  for (const sg of DEFAULT_STOCK_GROUPS) {
    if (!Array.from(store.stockGroups.values()).some((x) => x.name === sg.name)) {
      const rec = { id: uid('sg'), name: sg.name, parentName: sg.parentName ?? null, createdAt: new Date(), updatedAt: new Date() };
      store.stockGroups.set(rec.id, rec);
    }
  }

  for (const si of DEFAULT_STOCK_ITEMS) {
    if (!Array.from(store.stockItems.values()).some((x) => x.name === si.name)) {
      const rec = {
        id: uid('si'),
        name: si.name,
        groupName: si.groupName,
        hsnCode: si.hsnCode ?? null,
        vatRate: si.vatRate ?? 0,
        unit: si.unit ?? 'Nos',
        openingQty: si.openingQty ?? 0,
        openingRate: si.openingRate ?? 0,
        openingValue: si.openingValue ?? 0,
        minStockLevel: si.minStockLevel ?? 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.stockItems.set(rec.id, rec);
    }
  }
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

type ModelName =
  | 'company' | 'ledgerGroup' | 'ledger' | 'voucherType' | 'voucher'
  | 'voucherEntry' | 'recurringJournal' | 'recurringEntry' | 'stockGroup'
  | 'stockItem' | 'stockTransaction' | 'auditLog' | 'fixedAsset'
  | 'bankReconciliation';

function rel(model: ModelName, key: string, rec: any, store: Store): any[] | any {
  const arr = <T,>(m: Map<string, T>) => Array.from(m.values());
  switch (model) {
    case 'ledgerGroup':
      if (key === 'ledgers') return arr(store.ledgers).filter((l) => l.groupName === rec.name);
      if (key === 'children') return arr(store.ledgerGroups).filter((g) => g.parentName === rec.name);
      if (key === 'parent') return arr(store.ledgerGroups).find((g) => g.name === rec.parentName) || null;
      break;
    case 'ledger':
      if (key === 'group') return arr(store.ledgerGroups).find((g) => g.name === rec.groupName) || null;
      if (key === 'entries') return arr(store.voucherEntries).filter((e) => e.ledgerId === rec.id);
      if (key === 'recurringEntries') return arr(store.recurringEntries).filter((e) => e.ledgerId === rec.id);
      break;
    case 'voucherType':
      if (key === 'vouchers') return arr(store.vouchers).filter((v) => v.voucherTypeId === rec.id);
      break;
    case 'voucher':
      if (key === 'voucherType') return arr(store.voucherTypes).find((vt) => vt.id === rec.voucherTypeId) || null;
      if (key === 'entries') return arr(store.voucherEntries).filter((e) => e.voucherId === rec.id);
      if (key === 'stockEntries') return arr(store.stockTransactions).filter((t) => t.voucherId === rec.id);
      if (key === 'recurringJournals') {
        const ids = Array.from(store.rjVouchers.entries())
          .filter(([, vids]) => vids.has(rec.id))
          .map(([rjId]) => rjId);
        return ids.map((id) => store.recurringJournals.get(id)).filter(Boolean);
      }
      break;
    case 'voucherEntry':
      if (key === 'voucher') return store.vouchers.get(rec.voucherId) || null;
      if (key === 'ledger') return store.ledgers.get(rec.ledgerId) || null;
      break;
    case 'recurringJournal':
      if (key === 'entries') return arr(store.recurringEntries).filter((e) => e.recurringJournalId === rec.id);
      if (key === 'vouchers') {
        const vids = store.rjVouchers.get(rec.id) || new Set();
        return Array.from(vids).map((id) => store.vouchers.get(id)).filter(Boolean);
      }
      break;
    case 'recurringEntry':
      if (key === 'ledger') return store.ledgers.get(rec.ledgerId) || null;
      if (key === 'recurringJournal') return store.recurringJournals.get(rec.recurringJournalId) || null;
      break;
    case 'stockGroup':
      if (key === 'parent') return arr(store.stockGroups).find((g) => g.name === rec.parentName) || null;
      if (key === 'children') return arr(store.stockGroups).filter((g) => g.parentName === rec.name);
      if (key === 'items') return arr(store.stockItems).filter((i) => i.groupName === rec.name);
      break;
    case 'stockItem':
      if (key === 'group') return arr(store.stockGroups).find((g) => g.name === rec.groupName) || null;
      if (key === 'transactions') return arr(store.stockTransactions).filter((t) => t.stockItemId === rec.id);
      break;
    case 'stockTransaction':
      if (key === 'voucher') return store.vouchers.get(rec.voucherId) || null;
      if (key === 'stockItem') return store.stockItems.get(rec.stockItemId) || null;
      break;
  }
  return undefined;
}

function relModel(model: ModelName, key: string): ModelName | null {
  const map: Record<string, ModelName> = {
    'ledgerGroup.ledgers': 'ledger', 'ledgerGroup.children': 'ledgerGroup', 'ledgerGroup.parent': 'ledgerGroup',
    'ledger.group': 'ledgerGroup', 'ledger.entries': 'voucherEntry', 'ledger.recurringEntries': 'recurringEntry',
    'voucherType.vouchers': 'voucher',
    'voucher.voucherType': 'voucherType', 'voucher.entries': 'voucherEntry', 'voucher.stockEntries': 'stockTransaction', 'voucher.recurringJournals': 'recurringJournal',
    'voucherEntry.voucher': 'voucher', 'voucherEntry.ledger': 'ledger',
    'recurringJournal.entries': 'recurringEntry', 'recurringJournal.vouchers': 'voucher',
    'recurringEntry.ledger': 'ledger', 'recurringEntry.recurringJournal': 'recurringJournal',
    'stockGroup.parent': 'stockGroup', 'stockGroup.children': 'stockGroup', 'stockGroup.items': 'stockItem',
    'stockItem.group': 'stockGroup', 'stockItem.transactions': 'stockTransaction',
    'stockTransaction.voucher': 'voucher', 'stockTransaction.stockItem': 'stockItem',
  };
  return map[`${model}.${key}`] || null;
}

// ---------------------------------------------------------------------------
// Where matching
// ---------------------------------------------------------------------------

function scalarMatches(val: any, cond: any): boolean {
  if (cond === null) return val === null || val === undefined;
  if (cond === undefined) return true;
  if (typeof cond === 'object' && cond !== null && !(cond instanceof Date)) {
    if ('in' in cond) return Array.isArray(cond.in) && cond.in.includes(val);
    if ('notIn' in cond) return !(Array.isArray(cond.notIn) && cond.notIn.includes(val));
    if ('not' in cond) return !scalarMatches(val, cond.not);
    if ('contains' in cond) {
      return String(val ?? '').toLowerCase().includes(String(cond.contains ?? '').toLowerCase());
    }
    if ('startsWith' in cond) return String(val ?? '').startsWith(String(cond.startsWith));
    if ('endsWith' in cond) return String(val ?? '').endsWith(String(cond.endsWith));
    if ('gt' in cond) return cmp(val, cond.gt) > 0;
    if ('gte' in cond) return cmp(val, cond.gte) >= 0;
    if ('lt' in cond) return cmp(val, cond.lt) < 0;
    if ('lte' in cond) return cmp(val, cond.lte) <= 0;
    // plain object equality fallback
    return JSON.stringify(val) === JSON.stringify(cond);
  }
  if (cond instanceof Date && val instanceof Date) return val.getTime() === cond.getTime();
  return val === cond;
}

function matches(rec: any, where: any, model: ModelName, store: Store): boolean {
  if (!where || typeof where !== 'object') return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(cond as any[]).some((w) => matches(rec, w, model, store))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!(cond as any[]).every((w) => matches(rec, w, model, store))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matches(rec, cond, model, store)) return false;
      continue;
    }

    const related = rel(model, key, rec, store);
    if (related !== undefined) {
      const rm = relModel(model, key);
      if (!rm) return false;
      if (cond && typeof cond === 'object' && 'some' in cond) {
        const list = Array.isArray(related) ? related : related ? [related] : [];
        if (!list.some((r) => matches(r, cond.some, rm, store))) return false;
      } else if (cond && typeof cond === 'object' && 'every' in cond) {
        const list = Array.isArray(related) ? related : related ? [related] : [];
        if (!list.every((r) => matches(r, cond.every, rm, store))) return false;
      } else if (cond && typeof cond === 'object' && 'none' in cond) {
        const list = Array.isArray(related) ? related : related ? [related] : [];
        if (list.some((r) => matches(r, cond.none, rm, store))) return false;
      } else if (cond && typeof cond === 'object' && 'is' in cond) {
        const target = Array.isArray(related) ? related : related ? [related] : [];
        if (cond.is === null) {
          if (target.length !== 0) return false;
        } else if (!target.some((r) => matches(r, cond.is, rm, store))) return false;
      } else {
        // nested relation object → filter on related record(s)
        const list = Array.isArray(related) ? related : related ? [related] : [];
        if (!list.some((r) => matches(r, cond, rm, store))) return false;
      }
      continue;
    }

    if (!scalarMatches(rec[key], cond)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// orderBy / select / include / aggregate / groupBy
// ---------------------------------------------------------------------------

function sortList(list: any[], orderBy: any, model: ModelName, store: Store): any[] {
  if (!orderBy) return list;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...list];
  sorted.sort((x, y) => {
    for (const o of orders) {
      const [key, dir] = Object.entries(o)[0];
      if (dir && typeof dir === 'object') {
        const [subKey, subDir] = Object.entries(dir)[0];
        const rx = rel(model, key, x, store);
        const ry = rel(model, key, y, store);
        const xv = Array.isArray(rx) ? rx[0]?.[subKey] : rx?.[subKey];
        const yv = Array.isArray(ry) ? ry[0]?.[subKey] : ry?.[subKey];
        const c = cmp(xv, yv);
        if (c !== 0) return subDir === 'desc' ? -c : c;
      } else {
        const c = cmp(x[key], y[key]);
        if (c !== 0) return dir === 'desc' ? -c : c;
      }
    }
    return 0;
  });
  return sorted;
}

function applySelect(rec: any, select: any, model: ModelName, store: Store): any {
  if (select === true || !select) return { ...rec };
  const out: any = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === false) continue;
    if (v === true) {
      out[k] = rec[k];
      continue;
    }
    if (v && typeof v === 'object') {
      const related = rel(model, k, rec, store);
      const rm = relModel(model, k);
      if (related !== undefined && rm) {
        const list = Array.isArray(related) ? related : related ? [related] : [];
        out[k] = list.map((r) => applySelect(r, v, rm, store));
      } else {
        out[k] = rec[k];
      }
      continue;
    }
    out[k] = rec[k];
  }
  return out;
}

function applyInclude(rec: any, include: any, model: ModelName, store: Store): any {
  const out: any = {};
  for (const [k, spec] of Object.entries(include)) {
    if (k === '_count') {
      const countSel = spec && typeof spec === 'object' && spec.select ? spec.select : spec;
      out._count = {};
      if (countSel && typeof countSel === 'object') {
        for (const relName of Object.keys(countSel)) {
          const r = rel(model, relName, rec, store);
          out._count[relName] = Array.isArray(r) ? r.length : r ? 1 : 0;
        }
      }
      continue;
    }
    const related = rel(model, k, rec, store);
    if (related === undefined) {
      out[k] = rec[k];
      continue;
    }
    const rm = relModel(model, k);
    const isMany = Array.isArray(related);
    let list = isMany ? [...related] : related ? [related] : [];
    if (spec && typeof spec === 'object' && rm) {
      if (spec.where) list = list.filter((r) => matches(r, spec.where, rm, store));
      if (spec.orderBy) list = sortList(list, spec.orderBy, rm, store);
      if (spec.skip) list = list.slice(spec.skip);
      if (spec.take) list = list.slice(0, spec.take);
      list = list.map((r) => {
        let rr: any = { ...r };
        if (spec.include) rr = { ...rr, ...applyInclude(r, spec.include, rm, store) };
        if (spec.select) rr = applySelect(r, spec.select, rm, store);
        return rr;
      });
    }
    out[k] = isMany ? list : list[0] || null;
  }
  return out;
}

function computeAggregate(list: any[], args: any): any {
  let filtered = list;
  const model = (args as any)?.__model;
  const store = (args as any)?.__store;
  if (args?.where && model && store) filtered = filtered.filter((i) => matches(i, args.where, model, store));
  const result: any = {};
  if (args?._count) {
    if (typeof args._count === 'boolean') result._count = filtered.length;
    else if (typeof args._count === 'object') {
      result._count = {};
      for (const k of Object.keys(args._count)) result._count[k] = filtered.filter((i) => i[k] != null).length;
    }
  }
  for (const agg of ['_sum', '_avg', '_min', '_max']) {
    if (args?.[agg]) {
      result[agg] = {};
      for (const k of Object.keys(args[agg])) {
        const vals = filtered.map((i) => i[k]).filter((v) => v != null && !isNaN(Number(v)));
        const nums = vals.map(Number);
        if (agg === '_sum') result._sum[k] = nums.reduce((a, b) => a + b, 0);
        if (agg === '_avg') result._avg[k] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
        if (agg === '_min') result._min[k] = nums.length ? Math.min(...nums) : null;
        if (agg === '_max') result._max[k] = nums.length ? Math.max(...nums) : null;
      }
    }
  }
  return result;
}

function computeGroupBy(list: any[], args: any): any[] {
  const model = args?.__model;
  const store = args?.__store;
  let filtered = list;
  if (args?.where && model && store) filtered = filtered.filter((i) => matches(i, args.where, model, store));
  const byKeys: string[] = Array.isArray(args?.by) ? args.by : [args?.by];
  const groups = new Map<string, any[]>();
  for (const item of filtered) {
    const key = byKeys.map((k) => String(item[k] ?? 'null')).join(':::');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const result: any[] = [];
  for (const [, groupItems] of groups.entries()) {
    const sample = groupItems[0];
    const row: any = {};
    for (const k of byKeys) row[k] = sample[k];
    if (args?._count) {
      if (typeof args._count === 'boolean') row._count = groupItems.length;
      else if (typeof args._count === 'object') {
        row._count = {};
        for (const k of Object.keys(args._count)) row._count[k] = groupItems.filter((i) => i[k] != null).length;
      }
    }
    for (const agg of ['_sum', '_avg', '_min', '_max']) {
      if (args?.[agg]) {
        row[agg] = {};
        for (const k of Object.keys(args[agg])) {
          const vals = groupItems.map((i) => i[k]).filter((v) => v != null && !isNaN(Number(v)));
          const nums = vals.map(Number);
          if (agg === '_sum') row._sum[k] = nums.reduce((a, b) => a + b, 0);
          if (agg === '_avg') row._avg[k] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
          if (agg === '_min') row._min[k] = nums.length ? Math.min(...nums) : null;
          if (agg === '_max') row._max[k] = nums.length ? Math.max(...nums) : null;
        }
      }
    }
    result.push(row);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Generic model handler factory
// ---------------------------------------------------------------------------

function modelStore(store: Store, model: ModelName): Map<string, any> {
  const map: Record<ModelName, Map<string, any>> = {
    company: store.company,
    ledgerGroup: store.ledgerGroups,
    ledger: store.ledgers,
    voucherType: store.voucherTypes,
    voucher: store.vouchers,
    voucherEntry: store.voucherEntries,
    recurringJournal: store.recurringJournals,
    recurringEntry: store.recurringEntries,
    stockGroup: store.stockGroups,
    stockItem: store.stockItems,
    stockTransaction: store.stockTransactions,
    auditLog: store.auditLogs,
    fixedAsset: store.fixedAssets,
    bankReconciliation: store.bankReconciliations,
  };
  return map[model];
}

const UNIQUE_NAMES: Partial<Record<ModelName, string>> = {
  ledgerGroup: 'name',
  voucherType: 'name',
  stockGroup: 'name',
};

function throwUniqueIfNeeded(model: ModelName, data: any, store: Store, excludeId?: string) {
  const uniqueField = UNIQUE_NAMES[model];
  if (!uniqueField || data[uniqueField] === undefined) return;
  const clash = Array.from(modelStore(store, model).values()).some(
    (r) => r[uniqueField] === data[uniqueField] && r.id !== excludeId
  );
  if (clash) throw new Error(`Unique constraint failed on the fields: (\`${uniqueField}\`)`);
}

function makeHandler(model: ModelName, store: Store, opts?: { idPrefix?: string }) {
  const mstore = modelStore(store, model);
  const idPrefix = opts?.idPrefix || model;

  const applyReturn = (rec: any, args: any) => {
    let out: any = { ...rec };
    if (args?.include) out = { ...out, ...applyInclude(rec, args.include, model, store) };
    if (args?.select) out = applySelect(rec, args.select, model, store);
    return out;
  };

  return {
    findMany: async (args?: any) => {
      let list = Array.from(mstore.values());
      if (args?.where) list = list.filter((i) => matches(i, args.where, model, store));
      if (args?.orderBy) list = sortList(list, args.orderBy, model, store);
      if (args?.skip) list = list.slice(args.skip);
      if (args?.take) list = list.slice(0, args.take);
      return list.map((r) => applyReturn(r, args));
    },
    findUnique: async (args: any) => {
      const where = args?.where || {};
      let rec: any = null;
      if (where.id) rec = mstore.get(where.id) || null;
      else if (where.name !== undefined) rec = Array.from(mstore.values()).find((r) => r.name === where.name) || null;
      else if (where.code !== undefined) rec = Array.from(mstore.values()).find((r) => r.code === where.code) || null;
      if (!rec) return null;
      return applyReturn(rec, args);
    },
    findFirst: async (args?: any) => {
      const list = await makeHandler(model, store, opts).findMany(args);
      return list[0] || null;
    },
    create: async (args: any) => {
      const data = args?.data || {};
      throwUniqueIfNeeded(model, data, store);
      const rec: any = {
        id: data.id || uid(idPrefix),
        ...data,
        createdAt: data.createdAt ? toDate(data.createdAt) : new Date(),
        updatedAt: new Date(),
      };
      if (model === 'ledger' && rec.isActive === undefined) rec.isActive = true;
      if (data.createdAt) rec.createdAt = toDate(data.createdAt);
      if (data.updatedAt) rec.updatedAt = toDate(data.updatedAt);
      mstore.set(rec.id, rec);
      return applyReturn(rec, args);
    },
    update: async (args: any) => {
      const where = args?.where || {};
      const rec = mstore.get(where.id);
      if (!rec) {
        // allow update by name fallback
        const byName = where.name !== undefined ? Array.from(mstore.values()).find((r) => r.name === where.name) : null;
        if (!byName) throw new Error(`${model} ${where.id} not found`);
        Object.assign(byName, args?.data || {});
        byName.updatedAt = new Date();
        return applyReturn(byName, args);
      }
      Object.assign(rec, args?.data || {});
      if (args?.data?.inventoryValueUpdatedAt) rec.inventoryValueUpdatedAt = toDate(args.data.inventoryValueUpdatedAt);
      if (args?.data?.lastExecuted) rec.lastExecuted = toDate(args.data.lastExecuted);
      rec.updatedAt = new Date();
      mstore.set(rec.id, rec);
      return applyReturn(rec, args);
    },
    delete: async (args: any) => {
      const where = args?.where || {};
      let key: string | null = null;
      if (where.id && mstore.has(where.id)) key = where.id;
      else if (where.name !== undefined) {
        const found = Array.from(mstore.values()).find((r) => r.name === where.name);
        if (found) key = found.id;
      }
      const rec = key ? mstore.get(key) : null;
      if (key) mstore.delete(key);
      return rec || null;
    },
    deleteMany: async (args?: any) => {
      const where = args?.where;
      if (!where || Object.keys(where).length === 0) {
        const count = mstore.size;
        mstore.clear();
        return { count };
      }
      let count = 0;
      for (const [id, r] of Array.from(mstore.entries())) {
        if (matches(r, where, model, store)) {
          mstore.delete(id);
          count++;
        }
      }
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(mstore.values());
      if (args?.where) list = list.filter((i) => matches(i, args.where, model, store));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(mstore.values());
      return computeAggregate(list, { ...args, __model: model, __store: store });
    },
    groupBy: async (args: any) => {
      const list = Array.from(mstore.values());
      return computeGroupBy(list, { ...args, __model: model, __store: store });
    },
  };
}

// ---------------------------------------------------------------------------
// Custom create/update for models with nested relation writes
// ---------------------------------------------------------------------------

function nestedEntryCreate(data: any, parentIdField: string, parentId: string, store: Store, idPrefix: string): any[] {
  const created: any[] = [];
  for (const e of data.entries?.create || []) {
    const rec = {
      id: uid(idPrefix),
      [parentIdField]: parentId,
      ledgerId: e.ledgerId,
      ledgerName: e.ledgerName,
      debit: e.debit ?? 0,
      credit: e.credit ?? 0,
      taxRate: e.taxRate ?? 0,
      taxAmount: e.taxAmount ?? 0,
    };
    store.voucherEntries.set(rec.id, rec);
    created.push(rec);
  }
  return created;
}

function nestedStockCreate(data: any, voucherId: string, store: Store): any[] {
  const created: any[] = [];
  for (const s of data.stockEntries?.create || []) {
    const rec = {
      id: uid('stk'),
      voucherId,
      stockItemId: s.stockItemId,
      itemName: s.itemName,
      quantity: s.quantity ?? 0,
      rate: s.rate ?? 0,
      value: s.value ?? 0,
      type: s.type,
      batchNo: s.batchNo ?? null,
      expiryDate: s.expiryDate ?? null,
      godown: s.godown ?? null,
      createdAt: new Date(),
    };
    store.stockTransactions.set(rec.id, rec);
    created.push(rec);
  }
  return created;
}

// ---------------------------------------------------------------------------
// Build the proxy
// ---------------------------------------------------------------------------

function buildProxy(store: Store) {
  const base = (model: ModelName, opts?: any) => makeHandler(model, store, opts);

  // voucher — custom create/update to handle nested entries & stockEntries
  const voucherHandler = base('voucher');
  const vCreate = voucherHandler.create;
  voucherHandler.create = async (args: any) => {
    const data = args?.data || {};
    const vtId = data.voucherTypeId;
    const rec = {
      id: data.id || uid('vou'),
      voucherNumber: data.voucherNumber ?? `V-${Math.floor(Math.random() * 100000)}`,
      date: data.date,
      voucherTypeId: vtId,
      narration: data.narration ?? null,
      totalAmount: data.totalAmount ?? 0,
      reference: data.reference ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.vouchers.set(rec.id, rec);
    const entries = nestedEntryCreate(data, 'voucherId', rec.id, store, 've');
    const stockEntries = nestedStockCreate(data, rec.id, store);
    let out: any = { ...rec, entries, stockEntries };
    if (args?.include) {
      const inc = { ...args.include };
      delete inc.entries;
      delete inc.stockEntries;
      out = { ...out, ...applyInclude(rec, inc, 'voucher', store) };
    }
    return out;
  };

  const vUpdate = voucherHandler.update;
  voucherHandler.update = async (args: any) => {
    const data = args?.data || {};
    const rec = store.vouchers.get(args?.where?.id);
    if (!rec) throw new Error(`voucher ${args?.where?.id} not found`);
    Object.assign(rec, {
      voucherNumber: data.voucherNumber ?? rec.voucherNumber,
      date: data.date ?? rec.date,
      narration: data.narration ?? rec.narration,
      totalAmount: data.totalAmount ?? rec.totalAmount,
      reference: data.reference ?? rec.reference,
      updatedAt: new Date(),
    });
    const entries = nestedEntryCreate(data, 'voucherId', rec.id, store, 've');
    const stockEntries = data.stockEntries ? nestedStockCreate(data, rec.id, store) : undefined;
    let out: any = { ...rec, entries, stockEntries };
    if (args?.include) {
      const inc = { ...args.include };
      delete inc.entries;
      delete inc.stockEntries;
      out = { ...out, ...applyInclude(rec, inc, 'voucher', store) };
    }
    return out;
  };

  // recurringJournal — custom create/update for nested entries
  const rjHandler = base('recurringJournal');
  const rjCreate = rjHandler.create;
  rjHandler.create = async (args: any) => {
    const data = args?.data || {};
    const rec = {
      id: data.id || uid('rj'),
      name: data.name,
      scheduleType: data.scheduleType ?? 'Monthly',
      frequency: data.frequency ?? 1,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      nextDate: data.nextDate ?? data.startDate,
      narration: data.narration ?? '',
      voucherTypeName: data.voucherTypeName ?? 'Journal',
      isActive: data.isActive ?? true,
      lastExecuted: null,
      executionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.recurringJournals.set(rec.id, rec);
    const entries: any[] = [];
    for (const e of data.entries?.create || []) {
      const er = {
        id: uid('re'),
        recurringJournalId: rec.id,
        ledgerId: e.ledgerId,
        ledgerName: e.ledgerName,
        debit: e.debit ?? 0,
        credit: e.credit ?? 0,
        taxRate: e.taxRate ?? 0,
        taxAmount: e.taxAmount ?? 0,
      };
      store.recurringEntries.set(er.id, er);
      entries.push(er);
    }
    let out: any = { ...rec, entries };
    if (args?.include) {
      const inc = { ...args.include };
      delete inc.entries;
      out = { ...out, ...applyInclude(rec, inc, 'recurringJournal', store) };
    }
    return out;
  };
  const rjUpdate = rjHandler.update;
  rjHandler.update = async (args: any) => {
    const data = args?.data || {};
    const rec = store.recurringJournals.get(args?.where?.id);
    if (!rec) throw new Error(`recurringJournal ${args?.where?.id} not found`);
    const { entries, ...fields } = data;
    Object.assign(rec, fields, { updatedAt: new Date() });
    if (fields.lastExecuted) rec.lastExecuted = toDate(fields.lastExecuted);
    const newEntries: any[] = [];
    if (entries?.create) {
      for (const e of entries.create) {
        const er = {
          id: uid('re'),
          recurringJournalId: rec.id,
          ledgerId: e.ledgerId,
          ledgerName: e.ledgerName,
          debit: e.debit ?? 0,
          credit: e.credit ?? 0,
          taxRate: e.taxRate ?? 0,
          taxAmount: e.taxAmount ?? 0,
        };
        store.recurringEntries.set(er.id, er);
        newEntries.push(er);
      }
    }
    let out: any = { ...rec, entries: newEntries };
    if (args?.include) {
      const inc = { ...args.include };
      delete inc.entries;
      out = { ...out, ...applyInclude(rec, inc, 'recurringJournal', store) };
    }
    return out;
  };

  const proxy: any = {
    company: base('company'),
    ledgerGroup: base('ledgerGroup', { idPrefix: 'grp' }),
    ledger: base('ledger', { idPrefix: 'ldg' }),
    voucherType: base('voucherType', { idPrefix: 'vt' }),
    voucher: voucherHandler,
    voucherEntry: base('voucherEntry', { idPrefix: 've' }),
    recurringJournal: rjHandler,
    recurringEntry: base('recurringEntry', { idPrefix: 're' }),
    stockGroup: base('stockGroup', { idPrefix: 'sg' }),
    stockItem: base('stockItem', { idPrefix: 'si' }),
    stockTransaction: base('stockTransaction', { idPrefix: 'stk' }),
    auditLog: base('auditLog', { idPrefix: 'al' }),
    fixedAsset: base('fixedAsset', { idPrefix: 'fa' }),
    bankReconciliation: base('bankReconciliation', { idPrefix: 'br' }),
    $transaction: async (fnOrArray: any) => {
      if (typeof fnOrArray === 'function') return fnOrArray(proxy);
      if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
      return fnOrArray;
    },
    $disconnect: async () => {},
  };
  return proxy;
}

// ---------------------------------------------------------------------------
// Public db
// ---------------------------------------------------------------------------

export const db: any = buildProxy(getAccountingStore());

export function resetAccountingDB() {
  const store = getAccountingStore();
  // Clear every collection in place so the already-built `db` proxy (which
  // closes over this store object) immediately sees fresh, empty data.
  for (const key of Object.keys(store)) {
    const v = (store as any)[key];
    if (v instanceof Map) v.clear();
    else if (v instanceof Set) v.clear();
  }
  store.seeded = false;
  seedIfEmpty(store);
}

export function getAccountingDb(): any {
  return db;
}
