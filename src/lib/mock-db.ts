// @ts-nocheck
// In-memory fallback database for Daowa POS when PostgreSQL is offline or unconfigured

export interface ProductItem {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  generic: string | null;
  unitPrice: number;
  costPrice: number | null;
  stock: number;
  unit: string;
  image?: string | null;
  batchNo: string | null;
  expiryDate: Date | null;
  createdAt: Date;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  loyaltyPoints: number;
  createdAt: Date;
}

export interface SaleItemData {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  itemDiscount: number;
  itemDiscountType: string;
  subtotal: number;
}

export interface SplitPaymentData {
  id: string;
  saleId: string;
  method: string;
  amount: number;
}

export interface SaleData {
  id: string;
  invoiceNo: string;
  customerId: string | null;
  subtotal: number;
  totalDiscount: number;
  discountType: string;
  discountValue: number;
  deliveryCharge: number;
  roundingAdjust: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  dueAmount: number;
  status: string;
  isDelivery: boolean;
  deliveryPartnerId: string | null;
  clearingStatus: string;
  createdAt: Date;
  saleItems?: SaleItemData[];
  splitPayments?: SplitPaymentData[];
  customer?: CustomerItem | null;
  journalEntries?: JournalEntryItem[];
  returns?: ReturnItem[];
}

export interface HoldOrderItem {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  itemsJson: string;
  discountType: string;
  discountValue: number;
  deliveryCharge: number;
  note?: string | null;
  createdAt: Date;
}

export interface ReturnItem {
  id: string;
  saleId: string;
  saleItemId: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason: string;
  status: string;
  createdAt: Date;
}

export interface ShiftItem {
  id: string;
  cashierName: string;
  openingCash: number;
  note?: string | null;
  closingCash?: number | null;
  totalSales?: number | null;
  totalRevenue?: number | null;
  status: string;
  openedAt: Date;
  closedAt?: Date | null;
}

export interface PaymentProviderConfigItem {
  id: string;
  name: string;
  code: string;
  type: string;
  serviceCharge: number;
  minCharge: number;
  settlementInterval: string;
  isActive: boolean;
  createdAt: Date;
  clearingAccounts?: ClearingAccountItem[];
}

export interface ClearingAccountItem {
  id: string;
  providerConfigId: string;
  name: string;
  accountCode: string;
  pendingBalance: number;
  settledBalance: number;
  createdAt: Date;
  providerConfig?: PaymentProviderConfigItem | null;
  settlements?: SettlementData[];
}

export interface SettlementItemData {
  id: string;
  settlementId: string;
  saleId: string;
  saleAmount: number;
  serviceCharge: number;
  netAmount: number;
  status: string;
  sale?: SaleData | null;
}

export interface SettlementData {
  id: string;
  clearingAccountId: string;
  providerConfigId: string;
  amount: number;
  status: string;
  reference?: string | null;
  note?: string | null;
  settledAt?: Date | null;
  createdAt: Date;
  clearingAccount?: ClearingAccountItem | null;
  providerConfig?: PaymentProviderConfigItem | null;
  items?: SettlementItemData[];
  journalEntries?: JournalEntryItem[];
}

export interface JournalEntryItem {
  id: string;
  saleId?: string | null;
  clearingId?: string | null;
  settlementId?: string | null;
  accountType: string;
  entryType: string;
  amount: number;
  description: string;
  createdAt: Date;
  sale?: { id: string; invoiceNo: string; paymentMethod: string; grandTotal: number } | null;
  clearing?: { id: string; name: string; accountCode: string } | null;
  settlement?: { id: string; amount: number; status: string; reference?: string | null } | null;
}

const initialProducts: ProductItem[] = [
  { id: 'p1', name: 'Napa Extra 500mg', barcode: '8901001001', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 2.0, costPrice: 1.2, stock: 500, unit: 'pcs', batchNo: 'NAP-24-01', expiryDate: new Date('2027-06-30'), createdAt: new Date() },
  { id: 'p2', name: 'Ace 500mg', barcode: '8901001002', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 1.5, costPrice: 0.8, stock: 600, unit: 'pcs', batchNo: 'ACE-24-01', expiryDate: new Date('2027-05-15'), createdAt: new Date() },
  { id: 'p3', name: 'Paracip 500mg', barcode: '8901001003', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 1.8, costPrice: 1.0, stock: 400, unit: 'pcs', batchNo: 'PAR-24-01', expiryDate: new Date('2027-07-20'), createdAt: new Date() },
  { id: 'p4', name: 'Xcel Paracetamol 500mg', barcode: '8901001004', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 2.5, costPrice: 1.5, stock: 350, unit: 'pcs', batchNo: 'XCL-24-01', expiryDate: new Date('2027-04-10'), createdAt: new Date() },
  { id: 'p5', name: 'Napa Syrup 120ml (Pediatric)', barcode: '8901001005', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 60.0, costPrice: 40.0, stock: 80, unit: 'bottles', batchNo: 'NAPS-24-01', expiryDate: new Date('2027-03-15'), createdAt: new Date() },
  { id: 'p6', name: 'Fast Syrup 60ml (Kids)', barcode: '8901001006', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 45.0, costPrice: 28.0, stock: 100, unit: 'bottles', batchNo: 'FST-24-01', expiryDate: new Date('2027-08-25'), createdAt: new Date() },
  { id: 'p7', name: 'Seclo 20mg', barcode: '8901001010', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 8.0, costPrice: 5.0, stock: 300, unit: 'pcs', batchNo: 'SEC-24-01', expiryDate: new Date('2027-02-28'), createdAt: new Date() },
  { id: 'p8', name: 'Maxpro 20mg', barcode: '8901001011', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 10.0, costPrice: 6.5, stock: 250, unit: 'pcs', batchNo: 'MXP-24-01', expiryDate: new Date('2027-03-15'), createdAt: new Date() },
  { id: 'p9', name: 'Losec 20mg', barcode: '8901001012', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 15.0, costPrice: 10.0, stock: 120, unit: 'pcs', batchNo: 'LOS-24-01', expiryDate: new Date('2027-01-20'), createdAt: new Date() },
  { id: 'p10', name: 'Omez 20mg', barcode: '8901001013', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 7.5, costPrice: 4.5, stock: 280, unit: 'pcs', batchNo: 'OMZ-24-01', expiryDate: new Date('2027-04-30'), createdAt: new Date() },
  { id: 'p11', name: 'Ciprofloxacin 500mg (Beximco)', barcode: '8901001020', category: 'Antibiotic', generic: 'Ciprofloxacin', unitPrice: 12.0, costPrice: 8.0, stock: 150, unit: 'pcs', batchNo: 'CIP-24-01', expiryDate: new Date('2026-09-20'), createdAt: new Date() },
  { id: 'p12', name: 'Amoxicillin 500mg Cap', barcode: '8901001030', category: 'Antibiotic', generic: 'Amoxicillin', unitPrice: 8.5, costPrice: 6.0, stock: 200, unit: 'pcs', batchNo: 'AMX-24-01', expiryDate: new Date('2026-06-30'), createdAt: new Date() },
  { id: 'p13', name: 'Azithromycin 500mg', barcode: '8901001040', category: 'Antibiotic', generic: 'Azithromycin', unitPrice: 35.0, costPrice: 25.0, stock: 100, unit: 'pcs', batchNo: 'AZI-24-01', expiryDate: new Date('2026-03-15'), createdAt: new Date() },
  { id: 'p14', name: 'Cetirizine 10mg', barcode: '8901001050', category: 'Antihistamine', generic: 'Cetirizine', unitPrice: 3.0, costPrice: 1.5, stock: 350, unit: 'pcs', batchNo: 'CET-24-01', expiryDate: new Date('2027-05-25'), createdAt: new Date() },
  { id: 'p15', name: 'Metformin 500mg', barcode: '8901001090', category: 'Antidiabetic', generic: 'Metformin', unitPrice: 5.0, costPrice: 3.0, stock: 400, unit: 'pcs', batchNo: 'MFT-24-01', expiryDate: new Date('2027-04-20'), createdAt: new Date() },
  { id: 'p16', name: 'Vitamin C 500mg', barcode: '8901003001', category: 'Vitamin', generic: 'Ascorbic Acid', unitPrice: 5.0, costPrice: 3.0, stock: 300, unit: 'pcs', batchNo: 'VTC-24-01', expiryDate: new Date('2027-08-30'), createdAt: new Date() },
  { id: 'p17', name: 'Surgical Mask (Box 50)', barcode: '8901007001', category: 'Medical Supply', generic: null, unitPrice: 120.0, costPrice: 80.0, stock: 40, unit: 'boxes', batchNo: 'MSK-24-01', expiryDate: new Date('2028-12-31'), createdAt: new Date() },
  { id: 'p18', name: 'Savlon Antiseptic 500ml', barcode: '8901008001', category: 'Personal Care', generic: 'Chlorhexidine', unitPrice: 95.0, costPrice: 65.0, stock: 50, unit: 'bottles', batchNo: 'SAV-24-01', expiryDate: new Date('2028-03-15'), createdAt: new Date() },
  { id: 'p19', name: 'Dettol Antiseptic 500ml', barcode: '8901008002', category: 'Personal Care', generic: 'Chloroxylenol', unitPrice: 110.0, costPrice: 75.0, stock: 45, unit: 'bottles', batchNo: 'DET-24-01', expiryDate: new Date('2028-04-20'), createdAt: new Date() },
  { id: 'p20', name: 'Band-Aid (Box 100)', barcode: '8901007004', category: 'Medical Supply', generic: null, unitPrice: 150.0, costPrice: 100.0, stock: 50, unit: 'boxes', batchNo: 'BND-24-01', expiryDate: new Date('2028-12-31'), createdAt: new Date() },
  { id: 'p21', name: 'Digital Thermometer', barcode: '8901007009', category: 'Medical Supply', generic: null, unitPrice: 180.0, costPrice: 120.0, stock: 20, unit: 'pcs', batchNo: 'THM-24-01', expiryDate: new Date('2028-12-31'), createdAt: new Date() },
  { id: 'p22', name: 'Hand Sanitizer 500ml', barcode: '8901007013', category: 'Medical Supply', generic: null, unitPrice: 90.0, costPrice: 60.0, stock: 80, unit: 'bottles', batchNo: 'SAN-24-01', expiryDate: new Date('2028-06-30'), createdAt: new Date() },
  { id: 'p23', name: 'ORS Saline (Sachet x10)', barcode: '8901007014', category: 'Medical Supply', generic: 'Oral Rehydration Salts', unitPrice: 40.0, costPrice: 25.0, stock: 100, unit: 'packs', batchNo: 'ORS-24-01', expiryDate: new Date('2027-11-10'), createdAt: new Date() },
];

const initialCustomers: CustomerItem[] = [
  { id: 'c1', name: 'Rahim Uddin', phone: '01711223344', email: 'rahim@email.com', address: 'Dhanmondi 27, Dhaka', loyaltyPoints: 45, createdAt: new Date() },
  { id: 'c2', name: 'Fatema Begum', phone: '01822334455', email: 'fatema@email.com', address: 'Mirpur 10, Dhaka', loyaltyPoints: 30, createdAt: new Date() },
  { id: 'c3', name: 'Karim Hossain', phone: '01933445566', address: 'Uttara Sector 7, Dhaka', loyaltyPoints: 15, createdAt: new Date() },
  { id: 'c4', name: 'Ayesha Siddika', phone: '01644556677', email: 'ayesha@email.com', address: 'Banani DOHS, Dhaka', loyaltyPoints: 60, createdAt: new Date() },
  { id: 'c5', name: 'Dr. Hasan Ali', phone: '01777889900', address: 'Bashundhara R/A, Dhaka', loyaltyPoints: 85, createdAt: new Date() },
];

const initialProviders: PaymentProviderConfigItem[] = [
  { id: 'prov_bkash', name: 'bKash Merchant', code: 'bkash', type: 'mfs', serviceCharge: 1.5, minCharge: 0, settlementInterval: 'daily', isActive: true, createdAt: new Date() },
  { id: 'prov_nagad', name: 'Nagad Business', code: 'nagad', type: 'mfs', serviceCharge: 1.2, minCharge: 0, settlementInterval: 'daily', isActive: true, createdAt: new Date() },
  { id: 'prov_rocket', name: 'Rocket Merchant', code: 'rocket', type: 'mfs', serviceCharge: 1.5, minCharge: 0, settlementInterval: 'daily', isActive: true, createdAt: new Date() },
  { id: 'prov_card', name: 'Card POS (Brac Bank)', code: 'card', type: 'card', serviceCharge: 2.0, minCharge: 5, settlementInterval: 'daily', isActive: true, createdAt: new Date() },
];

const initialClearingAccounts: ClearingAccountItem[] = [
  { id: 'clr_bkash_acc', providerConfigId: 'prov_bkash', name: 'bKash Clearing', accountCode: 'clr_bkash', pendingBalance: 0, settledBalance: 0, createdAt: new Date() },
  { id: 'clr_nagad_acc', providerConfigId: 'prov_nagad', name: 'Nagad Clearing', accountCode: 'clr_nagad', pendingBalance: 0, settledBalance: 0, createdAt: new Date() },
  { id: 'clr_rocket_acc', providerConfigId: 'prov_rocket', name: 'Rocket Clearing', accountCode: 'clr_rocket', pendingBalance: 0, settledBalance: 0, createdAt: new Date() },
  { id: 'clr_card_acc', providerConfigId: 'prov_card', name: 'Card Clearing', accountCode: 'clr_card', pendingBalance: 0, settledBalance: 0, createdAt: new Date() },
];

// Global in-memory storage singleton
class InMemoryDB {
  products = new Map<string, ProductItem>();
  customers = new Map<string, CustomerItem>();
  sales = new Map<string, SaleData>();
  saleItems = new Map<string, SaleItemData>();
  splitPayments = new Map<string, SplitPaymentData>();
  holdOrders = new Map<string, HoldOrderItem>();
  returns = new Map<string, ReturnItem>();
  shifts = new Map<string, ShiftItem>();
  providers = new Map<string, PaymentProviderConfigItem>();
  clearingAccounts = new Map<string, ClearingAccountItem>();
  settlements = new Map<string, SettlementData>();
  settlementItems = new Map<string, SettlementItemData>();
  journalEntries = new Map<string, JournalEntryItem>();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    for (const p of initialProducts) this.products.set(p.id, { ...p });
    for (const c of initialCustomers) this.customers.set(c.id, { ...c });
    for (const prov of initialProviders) this.providers.set(prov.id, { ...prov });
    for (const clr of initialClearingAccounts) this.clearingAccounts.set(clr.id, { ...clr });
  }

  clear() {
    this.products.clear();
    this.customers.clear();
    this.sales.clear();
    this.saleItems.clear();
    this.splitPayments.clear();
    this.holdOrders.clear();
    this.returns.clear();
    this.shifts.clear();
    this.providers.clear();
    this.clearingAccounts.clear();
    this.settlements.clear();
    this.settlementItems.clear();
    this.journalEntries.clear();
  }
}

export const inMemoryDB = (globalThis as any).__daowa_in_memory_db || new InMemoryDB();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__daowa_in_memory_db = inMemoryDB;
}

function matchFilter(item: any, where: any): boolean {
  if (!where || typeof where !== 'object') return true;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      const orMatched = value.some((subWhere) => matchFilter(item, subWhere));
      if (!orMatched) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      const andMatched = value.every((subWhere) => matchFilter(item, subWhere));
      if (!andMatched) return false;
      continue;
    }
    if (key === 'journalEntries' && typeof value === 'object' && value !== null && 'some' in value) {
      const store = inMemoryDB;
      const jes = Array.from(store.journalEntries.values()).filter((j: any) => j.saleId === item.id);
      const someMatched = jes.some((j: any) => matchFilter(j, (value as any).some));
      if (!someMatched) return false;
      continue;
    }
    if (value === null) {
      if (item[key] !== null && item[key] !== undefined) return false;
      continue;
    }
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      const valObj = value as Record<string, any>;
      if ('contains' in valObj) {
        const itemVal = (item[key] ?? '').toString().toLowerCase();
        const search = (valObj.contains ?? '').toString().toLowerCase();
        if (!itemVal.includes(search)) return false;
      }
      if ('not' in valObj) {
        if (item[key] === valObj.not) return false;
      }
      if ('in' in valObj && Array.isArray(valObj.in)) {
        if (!valObj.in.includes(item[key])) return false;
      }
      if ('gt' in valObj) {
        if ((item[key] ?? 0) <= valObj.gt) return false;
      }
      if ('gte' in valObj) {
        const itemVal = item[key] instanceof Date ? item[key].getTime() : (item[key] ?? 0);
        const compVal = valObj.gte instanceof Date ? valObj.gte.getTime() : valObj.gte;
        if (itemVal < compVal) return false;
      }
      if ('lte' in valObj) {
        const itemVal = item[key] instanceof Date ? item[key].getTime() : (item[key] ?? 0);
        const compVal = valObj.lte instanceof Date ? valObj.lte.getTime() : valObj.lte;
        if (itemVal > compVal) return false;
      }
      continue;
    }
    if (item[key] !== value) return false;
  }
  return true;
}

function computeAggregate(list: any[], args?: any) {
  let filtered = list;
  if (args?.where) filtered = filtered.filter((item) => matchFilter(item, args.where));
  const result: any = {};

  if (args?._count) {
    if (typeof args._count === 'boolean') {
      result._count = filtered.length;
    } else if (typeof args._count === 'object') {
      result._count = {};
      for (const k of Object.keys(args._count)) {
        result._count[k] = filtered.filter(item => item[k] !== null && item[k] !== undefined).length;
      }
    }
  } else {
    result._count = filtered.length;
  }

  if (args?._sum) {
    result._sum = {};
    for (const k of Object.keys(args._sum)) {
      result._sum[k] = filtered.reduce((acc, item) => acc + (Number(item[k]) || 0), 0);
    }
  }

  if (args?._avg) {
    result._avg = {};
    for (const k of Object.keys(args._avg)) {
      const valid = filtered.filter(item => typeof item[k] === 'number');
      result._avg[k] = valid.length ? valid.reduce((acc, item) => acc + (item[k] || 0), 0) / valid.length : null;
    }
  }

  if (args?._min) {
    result._min = {};
    for (const k of Object.keys(args._min)) {
      const vals = filtered.map(i => i[k]).filter(v => v !== null && v !== undefined);
      result._min[k] = vals.length ? vals.reduce((min, cur) => cur < min ? cur : min, vals[0]) : null;
    }
  }

  if (args?._max) {
    result._max = {};
    for (const k of Object.keys(args._max)) {
      const vals = filtered.map(i => i[k]).filter(v => v !== null && v !== undefined);
      result._max[k] = vals.length ? vals.reduce((max, cur) => cur > max ? cur : max, vals[0]) : null;
    }
  }

  return result;
}

function computeGroupBy(list: any[], args: any) {
  let filtered = list;
  if (args?.where) filtered = filtered.filter((item) => matchFilter(item, args.where));
  const byKeys: string[] = Array.isArray(args?.by) ? args.by : [args?.by];

  const groups = new Map<string, any[]>();
  for (const item of filtered) {
    const key = byKeys.map(k => String(item[k] ?? 'null')).join(':::');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const result: any[] = [];
  for (const [, groupItems] of groups.entries()) {
    const sample = groupItems[0];
    const groupRow: any = {};
    for (const k of byKeys) {
      groupRow[k] = sample[k];
    }
    if (args?._count) {
      if (typeof args._count === 'boolean') {
        groupRow._count = groupItems.length;
      } else if (typeof args._count === 'object') {
        groupRow._count = {};
        for (const k of Object.keys(args._count)) {
          groupRow._count[k] = groupItems.filter(item => item[k] !== null && item[k] !== undefined).length;
        }
      }
    }
    if (args?._sum) {
      groupRow._sum = {};
      for (const k of Object.keys(args._sum)) {
        groupRow._sum[k] = groupItems.reduce((acc, item) => acc + (Number(item[k]) || 0), 0);
      }
    }
    if (args?._avg) {
      groupRow._avg = {};
      for (const k of Object.keys(args._avg)) {
        const valid = groupItems.filter(item => typeof item[k] === 'number');
        groupRow._avg[k] = valid.length ? valid.reduce((acc, item) => acc + (item[k] || 0), 0) / valid.length : null;
      }
    }
    if (args?._min) {
      groupRow._min = {};
      for (const k of Object.keys(args._min)) {
        const vals = groupItems.map(i => i[k]).filter(v => v !== null && v !== undefined);
        groupRow._min[k] = vals.length ? vals.reduce((min, cur) => cur < min ? cur : min, vals[0]) : null;
      }
    }
    if (args?._max) {
      groupRow._max = {};
      for (const k of Object.keys(args._max)) {
        const vals = groupItems.map(i => i[k]).filter(v => v !== null && v !== undefined);
        groupRow._max[k] = vals.length ? vals.reduce((max, cur) => cur > max ? cur : max, vals[0]) : null;
      }
    }
    result.push(groupRow);
  }
  return result;
}

export function createMockPrismaProxy() {
  const store = inMemoryDB;

  const productHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.products.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.name === 'asc') list.sort((a, b) => a.name.localeCompare(b.name));
      if (args?.orderBy?.expiryDate === 'asc') list.sort((a, b) => (a.expiryDate?.getTime() || 0) - (b.expiryDate?.getTime() || 0));
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    findUnique: async (args: any) => {
      if (args?.where?.id) return store.products.get(args.where.id) || null;
      if (args?.where?.barcode) return Array.from(store.products.values()).find((p) => p.barcode === args.where.barcode) || null;
      return null;
    },
    findFirst: async (args?: any) => {
      const items = await productHandler.findMany(args);
      return items[0] || null;
    },
    create: async (args: any) => {
      const id = args.data.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const p: ProductItem = {
        id,
        name: args.data.name,
        barcode: args.data.barcode || null,
        category: args.data.category || null,
        generic: args.data.generic || null,
        unitPrice: args.data.unitPrice,
        costPrice: args.data.costPrice ?? null,
        stock: args.data.stock ?? 0,
        unit: args.data.unit || 'pcs',
        image: args.data.image || null,
        batchNo: args.data.batchNo || null,
        expiryDate: args.data.expiryDate ? new Date(args.data.expiryDate) : null,
        createdAt: new Date(),
      };
      store.products.set(id, p);
      return p;
    },
    update: async (args: any) => {
      const p = store.products.get(args.where.id);
      if (!p) throw new Error(`Product ${args.where.id} not found`);
      if (args.data.stock && typeof args.data.stock === 'object') {
        if ('decrement' in args.data.stock) p.stock -= args.data.stock.decrement;
        if ('increment' in args.data.stock) p.stock += args.data.stock.increment;
      } else if (args.data.stock !== undefined) {
        p.stock = args.data.stock;
      }
      if (args.data.name !== undefined) p.name = args.data.name;
      if (args.data.unitPrice !== undefined) p.unitPrice = args.data.unitPrice;
      if (args.data.costPrice !== undefined) p.costPrice = args.data.costPrice;
      if (args.data.category !== undefined) p.category = args.data.category;
      if (args.data.generic !== undefined) p.generic = args.data.generic;
      if (args.data.unit !== undefined) p.unit = args.data.unit;
      if (args.data.barcode !== undefined) p.barcode = args.data.barcode;
      if (args.data.batchNo !== undefined) p.batchNo = args.data.batchNo;
      if (args.data.expiryDate !== undefined) p.expiryDate = args.data.expiryDate ? new Date(args.data.expiryDate) : null;
      store.products.set(p.id, p);
      return p;
    },
    delete: async (args: any) => {
      const p = store.products.get(args.where.id);
      if (p) store.products.delete(args.where.id);
      return p || {};
    },
    deleteMany: async () => {
      const count = store.products.size;
      store.products.clear();
      return { count };
    },
    count: async (args?: any) => {
      const items = await productHandler.findMany(args);
      return items.length;
    },
    aggregate: async (args?: any) => {
      const items = Array.from(store.products.values());
      return computeAggregate(items, args);
    },
    groupBy: async (args: any) => {
      const items = Array.from(store.products.values());
      return computeGroupBy(items, args);
    },
  };

  const customerHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.customers.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.name === 'asc') list.sort((a, b) => a.name.localeCompare(b.name));
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    findUnique: async (args: any) => {
      if (args?.where?.id) return store.customers.get(args.where.id) || null;
      if (args?.where?.phone) return Array.from(store.customers.values()).find((c) => c.phone === args.where.phone) || null;
      return null;
    },
    findFirst: async (args?: any) => {
      const items = await customerHandler.findMany(args);
      return items[0] || null;
    },
    create: async (args: any) => {
      const id = args.data.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const c: CustomerItem = {
        id,
        name: args.data.name,
        phone: args.data.phone,
        email: args.data.email || null,
        address: args.data.address || null,
        loyaltyPoints: args.data.loyaltyPoints ?? 0,
        createdAt: new Date(),
      };
      store.customers.set(id, c);
      return c;
    },
    update: async (args: any) => {
      const c = store.customers.get(args.where.id);
      if (!c) throw new Error(`Customer ${args.where.id} not found`);
      if (args.data.loyaltyPoints && typeof args.data.loyaltyPoints === 'object') {
        if ('increment' in args.data.loyaltyPoints) c.loyaltyPoints += args.data.loyaltyPoints.increment;
        if ('decrement' in args.data.loyaltyPoints) c.loyaltyPoints -= args.data.loyaltyPoints.decrement;
      } else if (args.data.loyaltyPoints !== undefined) {
        c.loyaltyPoints = args.data.loyaltyPoints;
      }
      if (args.data.name !== undefined) c.name = args.data.name;
      if (args.data.phone !== undefined) c.phone = args.data.phone;
      if (args.data.email !== undefined) c.email = args.data.email;
      if (args.data.address !== undefined) c.address = args.data.address;
      store.customers.set(c.id, c);
      return c;
    },
    delete: async (args: any) => {
      const c = store.customers.get(args.where.id);
      if (c) store.customers.delete(args.where.id);
      return c || {};
    },
    deleteMany: async () => {
      const count = store.customers.size;
      store.customers.clear();
      return { count };
    },
    count: async (args?: any) => {
      const items = await customerHandler.findMany(args);
      return items.length;
    },
    aggregate: async (args?: any) => {
      const items = Array.from(store.customers.values());
      return computeAggregate(items, args);
    },
    groupBy: async (args: any) => {
      const items = Array.from(store.customers.values());
      return computeGroupBy(items, args);
    },
  };

  const saleHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.sales.values()).map((s) => {
        const items = Array.from(store.saleItems.values()).filter((si) => si.saleId === s.id);
        const splits = Array.from(store.splitPayments.values()).filter((sp) => sp.saleId === s.id);
        const cust = s.customerId ? store.customers.get(s.customerId) || null : null;
        const jes = Array.from(store.journalEntries.values()).filter((j) => j.saleId === s.id);
        const rets = Array.from(store.returns.values()).filter((r) => r.saleId === s.id);
        return {
          ...s,
          saleItems: items,
          splitPayments: splits,
          customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone } : null,
          journalEntries: jes,
          returns: rets,
        };
      });
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.createdAt === 'desc') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (args?.orderBy?.createdAt === 'asc') list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    findUnique: async (args: any) => {
      const s = store.sales.get(args.where.id);
      if (!s) return null;
      const items = Array.from(store.saleItems.values()).filter((si) => si.saleId === s.id);
      const splits = Array.from(store.splitPayments.values()).filter((sp) => sp.saleId === s.id);
      const cust = s.customerId ? store.customers.get(s.customerId) || null : null;
      const jes = Array.from(store.journalEntries.values()).filter((j) => j.saleId === s.id);
      const rets = Array.from(store.returns.values()).filter((r) => r.saleId === s.id);
      return {
        ...s,
        saleItems: items,
        splitPayments: splits,
        customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone } : null,
        journalEntries: jes,
        returns: rets,
      };
    },
    create: async (args: any) => {
      const id = args.data.id || `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const s: SaleData = {
        id,
        invoiceNo: args.data.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
        customerId: args.data.customerId || null,
        subtotal: args.data.subtotal,
        totalDiscount: args.data.totalDiscount || 0,
        discountType: args.data.discountType || 'percentage',
        discountValue: args.data.discountValue || 0,
        deliveryCharge: args.data.deliveryCharge || 0,
        roundingAdjust: args.data.roundingAdjust || 0,
        grandTotal: args.data.grandTotal,
        paymentMethod: args.data.paymentMethod,
        receivedAmount: args.data.receivedAmount || 0,
        changeAmount: args.data.changeAmount || 0,
        dueAmount: args.data.dueAmount || 0,
        status: args.data.status || 'completed',
        isDelivery: args.data.isDelivery || false,
        deliveryPartnerId: args.data.deliveryPartnerId || null,
        clearingStatus: args.data.clearingStatus || 'N/A',
        createdAt: new Date(),
      };
      store.sales.set(id, s);

      if (args.data.saleItems?.create) {
        for (const item of args.data.saleItems.create) {
          const sId = `si_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const si: SaleItemData = {
            id: sId,
            saleId: id,
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            unit: item.unit,
            itemDiscount: item.itemDiscount || 0,
            itemDiscountType: item.itemDiscountType || 'percentage',
            subtotal: item.subtotal,
          };
          store.saleItems.set(sId, si);
        }
      }

      if (args.data.splitPayments?.create) {
        for (const sp of args.data.splitPayments.create) {
          const spId = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const splitItem: SplitPaymentData = {
            id: spId,
            saleId: id,
            method: sp.method,
            amount: sp.amount,
          };
          store.splitPayments.set(spId, splitItem);
        }
      }

      if (args.data.journalEntries?.create) {
        for (const je of args.data.journalEntries.create) {
          const jeId = `je_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const entry: JournalEntryItem = {
            ...je,
            id: jeId,
            saleId: id,
            createdAt: new Date(),
          };
          store.journalEntries.set(jeId, entry);
        }
      }

      return saleHandler.findUnique({ where: { id } });
    },
    update: async (args: any) => {
      const s = store.sales.get(args.where.id);
      if (!s) throw new Error(`Sale ${args.where.id} not found`);
      Object.assign(s, args.data);
      store.sales.set(s.id, s);
      return saleHandler.findUnique({ where: { id: s.id } });
    },
    deleteMany: async () => {
      const count = store.sales.size;
      store.sales.clear();
      return { count };
    },
    count: async (args?: any) => {
      const list = await saleHandler.findMany(args);
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.sales.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.sales.values());
      return computeGroupBy(list, args);
    },
  };

  const saleItemHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.saleItems.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `si_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const si: SaleItemData = { ...args.data, id };
      store.saleItems.set(id, si);
      return si;
    },
    deleteMany: async () => {
      const count = store.saleItems.size;
      store.saleItems.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.saleItems.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.saleItems.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.saleItems.values());
      return computeGroupBy(list, args);
    },
  };

  const splitPaymentHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.splitPayments.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const sp: SplitPaymentData = { ...args.data, id };
      store.splitPayments.set(id, sp);
      return sp;
    },
    deleteMany: async () => {
      const count = store.splitPayments.size;
      store.splitPayments.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.splitPayments.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.splitPayments.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.splitPayments.values());
      return computeGroupBy(list, args);
    },
  };

  const holdOrderHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.holdOrders.values());
      if (args?.orderBy?.createdAt === 'desc') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    },
    findUnique: async (args: any) => store.holdOrders.get(args.where.id) || null,
    create: async (args: any) => {
      const id = args.data.id || `hold_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const h: HoldOrderItem = {
        id,
        customerName: args.data.customerName || 'Walk-in',
        customerPhone: args.data.customerPhone || null,
        itemsJson: args.data.itemsJson,
        discountType: args.data.discountType || 'percentage',
        discountValue: args.data.discountValue || 0,
        deliveryCharge: args.data.deliveryCharge || 0,
        note: args.data.note || null,
        createdAt: new Date(),
      };
      store.holdOrders.set(id, h);
      return h;
    },
    delete: async (args: any) => {
      const h = store.holdOrders.get(args.where.id);
      if (h) store.holdOrders.delete(args.where.id);
      return h || {};
    },
    deleteMany: async () => {
      const count = store.holdOrders.size;
      store.holdOrders.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.holdOrders.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.holdOrders.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.holdOrders.values());
      return computeGroupBy(list, args);
    },
  };

  const returnHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.returns.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.createdAt === 'desc') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const r: ReturnItem = { ...args.data, id, createdAt: new Date() };
      store.returns.set(id, r);
      return r;
    },
    count: async (args?: any) => {
      let list = Array.from(store.returns.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    deleteMany: async () => {
      const count = store.returns.size;
      store.returns.clear();
      return { count };
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.returns.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.returns.values());
      return computeGroupBy(list, args);
    },
  };

  const shiftHandler = {
    findFirst: async (args?: any) => {
      let list = Array.from(store.shifts.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.openedAt === 'desc') list.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
      return list[0] || null;
    },
    findMany: async (args?: any) => {
      let list = Array.from(store.shifts.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.openedAt === 'desc') list.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const s: ShiftItem = { ...args.data, id, openedAt: new Date() };
      store.shifts.set(id, s);
      return s;
    },
    update: async (args: any) => {
      const s = store.shifts.get(args.where.id);
      if (!s) throw new Error(`Shift ${args.where.id} not found`);
      Object.assign(s, args.data);
      store.shifts.set(s.id, s);
      return s;
    },
    deleteMany: async () => {
      const count = store.shifts.size;
      store.shifts.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.shifts.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.shifts.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.shifts.values());
      return computeGroupBy(list, args);
    },
  };

  const paymentProviderConfigHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.providers.values()).map((p) => {
        const clr = Array.from(store.clearingAccounts.values()).filter((c) => c.providerConfigId === p.id);
        return { ...p, clearingAccounts: clr };
      });
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list;
    },
    findUnique: async (args: any) => {
      const p = (args?.where?.id ? store.providers.get(args.where.id) : null) || Array.from(store.providers.values()).find((x) => x.code === args?.where?.code);
      if (!p) return null;
      const clr = Array.from(store.clearingAccounts.values()).filter((c) => c.providerConfigId === p.id);
      return { ...p, clearingAccounts: clr };
    },
    create: async (args: any) => {
      const id = args.data.id || `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const p: PaymentProviderConfigItem = { ...args.data, id, createdAt: new Date() };
      store.providers.set(id, p);
      return p;
    },
    update: async (args: any) => {
      const p = store.providers.get(args.where.id);
      if (!p) throw new Error(`Provider ${args.where.id} not found`);
      Object.assign(p, args.data);
      store.providers.set(p.id, p);
      return p;
    },
    deleteMany: async () => {
      const count = store.providers.size;
      store.providers.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.providers.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.providers.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.providers.values());
      return computeGroupBy(list, args);
    },
  };

  const clearingAccountHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.clearingAccounts.values()).map((ca) => {
        const prov = store.providers.get(ca.providerConfigId) || null;
        const settlements = Array.from(store.settlements.values())
          .filter((s) => s.clearingAccountId === ca.id)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return {
          ...ca,
          providerConfig: prov,
          settlements,
        };
      });
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.createdAt === 'asc') list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    findUnique: async (args: any) => {
      const ca = (args?.where?.id ? store.clearingAccounts.get(args.where.id) : null) || (args?.where?.accountCode ? Array.from(store.clearingAccounts.values()).find((x) => x.accountCode === args.where.accountCode) : null);
      if (!ca) return null;
      const prov = store.providers.get(ca.providerConfigId) || null;
      const settlements = Array.from(store.settlements.values())
        .filter((s) => s.clearingAccountId === ca.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return {
        ...ca,
        providerConfig: prov,
        settlements,
      };
    },
    create: async (args: any) => {
      const id = args.data.id || `clr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const c: ClearingAccountItem = { ...args.data, id, createdAt: new Date() };
      store.clearingAccounts.set(id, c);
      return c;
    },
    update: async (args: any) => {
      const c = store.clearingAccounts.get(args.where.id);
      if (!c) throw new Error(`Clearing account ${args.where.id} not found`);
      if (args.data.pendingBalance && typeof args.data.pendingBalance === 'object') {
        if ('increment' in args.data.pendingBalance) c.pendingBalance += args.data.pendingBalance.increment;
        if ('decrement' in args.data.pendingBalance) c.pendingBalance -= args.data.pendingBalance.decrement;
      } else if (args.data.pendingBalance !== undefined) {
        c.pendingBalance = args.data.pendingBalance;
      }
      if (args.data.settledBalance && typeof args.data.settledBalance === 'object') {
        if ('increment' in args.data.settledBalance) c.settledBalance += args.data.settledBalance.increment;
        if ('decrement' in args.data.settledBalance) c.settledBalance -= args.data.settledBalance.decrement;
      } else if (args.data.settledBalance !== undefined) {
        c.settledBalance = args.data.settledBalance;
      }
      store.clearingAccounts.set(c.id, c);
      return c;
    },
    deleteMany: async () => {
      const count = store.clearingAccounts.size;
      store.clearingAccounts.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.clearingAccounts.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.clearingAccounts.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.clearingAccounts.values());
      return computeGroupBy(list, args);
    },
  };

  const settlementHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.settlements.values()).map((s) => {
        const clr = store.clearingAccounts.get(s.clearingAccountId) || null;
        const prov = store.providers.get(s.providerConfigId) || null;
        const items = Array.from(store.settlementItems.values())
          .filter((si) => si.settlementId === s.id)
          .map((si) => {
            const sale = store.sales.get(si.saleId) || null;
            return { ...si, sale };
          });
        const jes = Array.from(store.journalEntries.values()).filter((j) => j.settlementId === s.id);
        return {
          ...s,
          clearingAccount: clr,
          providerConfig: prov,
          items,
          journalEntries: jes,
        };
      });
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.createdAt === 'desc') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `stl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const s: SettlementData = {
        id,
        clearingAccountId: args.data.clearingAccountId,
        providerConfigId: args.data.providerConfigId,
        amount: args.data.amount,
        status: args.data.status || 'COMPLETED',
        reference: args.data.reference || null,
        note: args.data.note || null,
        settledAt: args.data.settledAt || new Date(),
        createdAt: new Date(),
      };
      store.settlements.set(id, s);

      if (args.data.items?.create) {
        for (const item of args.data.items.create) {
          const siId = `stli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const si: SettlementItemData = { ...item, id: siId, settlementId: id };
          store.settlementItems.set(siId, si);
        }
      }

      if (args.data.journalEntries?.create) {
        for (const je of args.data.journalEntries.create) {
          const jeId = `je_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const entry: JournalEntryItem = { ...je, id: jeId, settlementId: id, createdAt: new Date() };
          store.journalEntries.set(jeId, entry);
        }
      }

      const items = Array.from(store.settlementItems.values()).filter((si) => si.settlementId === id);
      const journalEntries = Array.from(store.journalEntries.values()).filter((je) => je.settlementId === id);
      return { ...s, items, journalEntries };
    },
    update: async (args: any) => {
      const s = store.settlements.get(args.where.id);
      if (!s) throw new Error(`Settlement ${args.where.id} not found`);
      Object.assign(s, args.data);
      store.settlements.set(s.id, s);
      return s;
    },
    deleteMany: async () => {
      const count = store.settlements.size;
      store.settlements.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.settlements.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.settlements.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.settlements.values());
      return computeGroupBy(list, args);
    },
  };

  const settlementItemHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.settlementItems.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `stli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const si: SettlementItemData = { ...args.data, id };
      store.settlementItems.set(id, si);
      return si;
    },
    deleteMany: async () => {
      const count = store.settlementItems.size;
      store.settlementItems.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.settlementItems.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.settlementItems.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.settlementItems.values());
      return computeGroupBy(list, args);
    },
  };

  const journalEntryHandler = {
    findMany: async (args?: any) => {
      let list = Array.from(store.journalEntries.values()).map((je) => {
        const sale = je.saleId ? store.sales.get(je.saleId) || null : null;
        const clr = je.clearingId ? store.clearingAccounts.get(je.clearingId) || null : null;
        const stl = je.settlementId ? store.settlements.get(je.settlementId) || null : null;
        return {
          ...je,
          sale: sale ? { id: sale.id, invoiceNo: sale.invoiceNo, paymentMethod: sale.paymentMethod, grandTotal: sale.grandTotal } : null,
          clearing: clr ? { id: clr.id, name: clr.name, accountCode: clr.accountCode } : null,
          settlement: stl ? { id: stl.id, amount: stl.amount, status: stl.status, reference: stl.reference } : null,
        };
      });
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      if (args?.orderBy?.createdAt === 'desc') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (args?.take) list = list.slice(0, args.take);
      return list;
    },
    create: async (args: any) => {
      const id = args.data.id || `je_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const j: JournalEntryItem = { ...args.data, id, createdAt: new Date() };
      store.journalEntries.set(id, j);
      return j;
    },
    deleteMany: async () => {
      const count = store.journalEntries.size;
      store.journalEntries.clear();
      return { count };
    },
    count: async (args?: any) => {
      let list = Array.from(store.journalEntries.values());
      if (args?.where) list = list.filter((item) => matchFilter(item, args.where));
      return list.length;
    },
    aggregate: async (args?: any) => {
      const list = Array.from(store.journalEntries.values());
      return computeAggregate(list, args);
    },
    groupBy: async (args: any) => {
      const list = Array.from(store.journalEntries.values());
      return computeGroupBy(list, args);
    },
  };

  const proxy: any = {
    product: productHandler,
    customer: customerHandler,
    sale: saleHandler,
    saleItem: saleItemHandler,
    splitPayment: splitPaymentHandler,
    holdOrder: holdOrderHandler,
    return: returnHandler,
    shift: shiftHandler,
    paymentProviderConfig: paymentProviderConfigHandler,
    clearingAccount: clearingAccountHandler,
    settlement: settlementHandler,
    settlementItem: settlementItemHandler,
    journalEntry: journalEntryHandler,
    $transaction: async (fnOrArray: any) => {
      if (typeof fnOrArray === 'function') {
        return fnOrArray(proxy);
      }
      if (Array.isArray(fnOrArray)) {
        return Promise.all(fnOrArray);
      }
      return fnOrArray;
    },
  };

  return proxy;
}
