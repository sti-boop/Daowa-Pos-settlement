// Daowa Settlement Hub - In-Memory Data Store (Singleton)
// Mirrors the in-memory database from the original Express server.ts
// Persists across API requests within the same Next.js server instance.

import {
  HealthcareOrder,
  SystemFeeSettings,
  AccountBalance,
  AuditJournalEntry,
  EodRegisterShift,
  SettlementBatch,
  BusinessBankAccount,
} from './types';

// Re-export types so API routes can import them from @/lib/store
export type {
  HealthcareOrder,
  SystemFeeSettings,
  AccountBalance,
  AuditJournalEntry,
  EodRegisterShift,
  SettlementBatch,
  BusinessBankAccount,
} from './types';

// Re-export CourierName and MFSProvider from types
export type { CourierName, MFSProvider } from './types';

// --- IN-MEMORY DATABASE & DOUBLE-ENTRY LEDGER ---

// Ensure state persists across Next.js dev-mode hot reloads.
// All mutable state lives on globalThis so every API route handler
// shares the same arrays/objects regardless of module re-evaluation.
const G = globalThis as any;

export const businessBankAccounts: BusinessBankAccount[] = (G.__DAOWA_BANKS__ || (G.__DAOWA_BANKS__ = [
  {
    id: 'bank_mtb_01',
    bankName: 'Mutual Trust Bank (MTB)',
    accountName: 'Daowa Healthcare Limited',
    accountNumber: '1029-4455-8899',
    accountType: 'Corporate Current',
    branchName: 'Gulshan Corporate Branch, Dhaka',
    routingNumber: '125271829',
    balance: 0,
    isDefault: true,
    isActive: true,
    openedDate: '2023-01-15',
    notes: 'Primary operating and settlement collection account',
  },
  {
    id: 'bank_brac_02',
    bankName: 'BRAC Bank PLC',
    accountName: 'Daowa Healthcare Limited - Retail',
    accountNumber: '1501-2034-5678',
    accountType: 'SME Business',
    branchName: 'Dhanmondi Branch, Dhaka',
    routingNumber: '060271452',
    balance: 0,
    isDefault: false,
    isActive: true,
    openedDate: '2023-08-20',
    notes: 'Secondary collection account for courier COD payouts',
  },
  {
    id: 'bank_city_03',
    bankName: 'The City Bank PLC',
    accountName: 'Daowa Healthcare Limited - Merchant',
    accountNumber: '3101-9876-5432',
    accountType: 'Corporate Current',
    branchName: 'Principal Branch, Motijheel',
    routingNumber: '225272314',
    balance: 0,
    isDefault: false,
    isActive: true,
    openedDate: '2024-02-10',
    notes: 'Designated gateway settlement account for POS Card Terminals',
  },
]));

export const systemFees: SystemFeeSettings = (G.__DAOWA_FEES__ || (G.__DAOWA_FEES__ = {
  couriers: [
    { courierName: 'Steadfast', baseDeliveryFeeInside: 70, baseDeliveryFeeOutside: 130, codFeePercent: 1.0, returnCharge: 50, isActive: true },
    { courierName: 'Pathao', baseDeliveryFeeInside: 80, baseDeliveryFeeOutside: 140, codFeePercent: 1.0, returnCharge: 60, isActive: true },
    { courierName: 'RedX', baseDeliveryFeeInside: 75, baseDeliveryFeeOutside: 135, codFeePercent: 1.0, returnCharge: 50, isActive: true },
    { courierName: 'Carrybee', baseDeliveryFeeInside: 65, baseDeliveryFeeOutside: 125, codFeePercent: 1.0, returnCharge: 45, isActive: true },
  ],
  mfs: [
    { provider: 'bKash', feePercent: 1.15, autoSettle: false, settleIntervalHours: 24, accountNumber: '01711-234567 (Merchant)' },
    { provider: 'Nagad', feePercent: 1.00, autoSettle: false, settleIntervalHours: 24, accountNumber: '01822-345678 (Merchant)' },
    { provider: 'Rocket', feePercent: 1.20, autoSettle: false, settleIntervalHours: 24, accountNumber: '01933-456789 (Merchant)' },
    { provider: 'Upay', feePercent: 1.00, autoSettle: false, settleIntervalHours: 24, accountNumber: '01544-567890 (Merchant)' },
  ],
  cards: [
    { provider: 'Visa / Mastercard', feePercent: 2.00, payoutDays: 1, terminalId: 'MTB-POS-8891' },
    { provider: 'American Express', feePercent: 2.75, payoutDays: 2, terminalId: 'MTB-AMEX-4412' },
    { provider: 'POS Terminal', feePercent: 1.50, payoutDays: 1, terminalId: 'MTB-LIP-1029' },
  ],
}));

export const accounts: Record<string, AccountBalance> = (G.__DAOWA_ACCOUNTS__ || (G.__DAOWA_ACCOUNTS__ = {
  'POS Cash Holding A/c': { id: 'acc_pos_cash', accountName: 'POS Cash Holding A/c', friendlyLabel: 'Cash in Register Drawer', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Main Cash/Vault A/c': { id: 'acc_vault', accountName: 'Main Cash/Vault A/c', friendlyLabel: 'Store Safe / Central Vault', accountType: 'asset', balance: 0, isClearingAccount: false },
  'MTB Bank A/c': { id: 'acc_mtb_bank', accountName: 'MTB Bank A/c', friendlyLabel: 'Mutual Trust Bank (Current A/c #1029)', accountType: 'asset', balance: 0, isClearingAccount: false },
  'BRAC Bank A/c': { id: 'acc_brac_bank', accountName: 'BRAC Bank A/c', friendlyLabel: 'BRAC Bank (SME Business A/c #5678)', accountType: 'asset', balance: 0, isClearingAccount: false },
  'City Bank A/c': { id: 'acc_city_bank', accountName: 'City Bank A/c', friendlyLabel: 'The City Bank (Corporate Current #5432)', accountType: 'asset', balance: 0, isClearingAccount: false },
  'Customer Accounts Receivable': { id: 'acc_ar', accountName: 'Customer Accounts Receivable', friendlyLabel: 'Customer Unpaid Balances', accountType: 'asset', balance: 0, isClearingAccount: false },
  'Daowa Rider Clearing A/c': { id: 'acc_rider_clr', accountName: 'Daowa Rider Clearing A/c', friendlyLabel: 'Riders Cash in Transit', accountType: 'asset', balance: 0, isClearingAccount: true },

  'Steadfast Clearing A/c': { id: 'acc_clr_steadfast', accountName: 'Steadfast Clearing A/c', friendlyLabel: 'Steadfast Delivered Funds Pending Payout', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Pathao Clearing A/c': { id: 'acc_clr_pathao', accountName: 'Pathao Clearing A/c', friendlyLabel: 'Pathao Delivered Funds Pending Payout', accountType: 'asset', balance: 0, isClearingAccount: true },
  'RedX Clearing A/c': { id: 'acc_clr_redx', accountName: 'RedX Clearing A/c', friendlyLabel: 'RedX Delivered Funds Pending Payout', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Carrybee Clearing A/c': { id: 'acc_clr_carrybee', accountName: 'Carrybee Clearing A/c', friendlyLabel: 'Carrybee Delivered Funds Pending Payout', accountType: 'asset', balance: 0, isClearingAccount: true },

  'bKash Clearing A/c': { id: 'acc_clr_bkash', accountName: 'bKash Clearing A/c', friendlyLabel: 'bKash Merchant Balance Pending Transfer', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Nagad Clearing A/c': { id: 'acc_clr_nagad', accountName: 'Nagad Clearing A/c', friendlyLabel: 'Nagad Merchant Balance Pending Transfer', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Rocket Clearing A/c': { id: 'acc_clr_rocket', accountName: 'Rocket Clearing A/c', friendlyLabel: 'Rocket Merchant Balance Pending Transfer', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Upay Clearing A/c': { id: 'acc_clr_upay', accountName: 'Upay Clearing A/c', friendlyLabel: 'Upay Merchant Balance Pending Transfer', accountType: 'asset', balance: 0, isClearingAccount: true },

  'Card Clearing A/c': { id: 'acc_clr_card', accountName: 'Card Clearing A/c', friendlyLabel: 'Card Gateway Batches Pending Payout', accountType: 'asset', balance: 0, isClearingAccount: true },
  'Medicine Inventory Asset A/c': { id: 'acc_inventory', accountName: 'Medicine Inventory Asset A/c', friendlyLabel: 'Pharmacy Stock Valuation', accountType: 'asset', balance: 0, isClearingAccount: false },

  'Medicine Sales Revenue A/c': { id: 'acc_rev_sales', accountName: 'Medicine Sales Revenue A/c', friendlyLabel: 'Medicine Sales Revenue', accountType: 'revenue', balance: 0, isClearingAccount: false },
  'Delivery Fee Revenue A/c': { id: 'acc_rev_delivery', accountName: 'Delivery Fee Revenue A/c', friendlyLabel: 'Delivery Fee Revenue Collected', accountType: 'revenue', balance: 0, isClearingAccount: false },

  'Courier Expense A/c': { id: 'acc_exp_courier', accountName: 'Courier Expense A/c', friendlyLabel: 'Courier Delivery & COD Commission Costs', accountType: 'expense', balance: 0, isClearingAccount: false },
  'MFS Charge Expense A/c': { id: 'acc_exp_mfs', accountName: 'MFS Charge Expense A/c', friendlyLabel: 'MFS Gateway Processing Charges', accountType: 'expense', balance: 0, isClearingAccount: false },
  'Card Gateway Expense A/c': { id: 'acc_exp_card', accountName: 'Card Gateway Expense A/c', friendlyLabel: 'Bank Card Merchant Fee Charges', accountType: 'expense', balance: 0, isClearingAccount: false },
  'Cash Shortage/Overage Expense A/c': { id: 'acc_exp_shortage', accountName: 'Cash Shortage/Overage Expense A/c', friendlyLabel: 'Register Till Discrepancies', accountType: 'expense', balance: 0, isClearingAccount: false },
  'Rounding Income A/c': { id: 'acc_rev_rounding', accountName: 'Rounding Income A/c', friendlyLabel: 'Rounding Income (Customer Paid Extra)', accountType: 'revenue', balance: 0, isClearingAccount: false },
  'Rounding Expense A/c': { id: 'acc_exp_rounding', accountName: 'Rounding Expense A/c', friendlyLabel: 'Rounding Expense (Customer Paid Less)', accountType: 'expense', balance: 0, isClearingAccount: false },
}));

export const auditJournal: AuditJournalEntry[] = (G.__DAOWA_JOURNAL__ || (G.__DAOWA_JOURNAL__ = [] as AuditJournalEntry[]));

export const orders: HealthcareOrder[] = (G.__DAOWA_ORDERS__ || (G.__DAOWA_ORDERS__ = [] as HealthcareOrder[]));

export const settlementBatches: SettlementBatch[] = (G.__DAOWA_BATCHES__ || (G.__DAOWA_BATCHES__ = [] as SettlementBatch[]));

export const activeShift: EodRegisterShift = (G.__DAOWA_SHIFT__ || (G.__DAOWA_SHIFT__ = {
  id: 'shift_active_01',
  shiftNumber: 'SHIFT-2026-0902',
  cashierName: 'Tanvir Ahmed',
  counterName: 'Pharmacy Counter 01 (Main Branch)',
  startedAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
  status: 'active',
  openingFloat: 2000,
  expectedCash: 5450,
  countedCash: 2000,
  discrepancy: 0,
  noteBreakdown: {
    '1000': 3,
    '500': 4,
    '200': 1,
    '100': 2,
    '50': 1,
    '20': 0,
    '10': 0,
  },
  settledToVaultAmount: 0,
}));

// No seed orders — all orders come from the POS app sales

// --- HELPER FUNCTIONS (operate on the singleton store) ---

export function postAuditJournalEntry(
  userAction: string,
  operator: string,
  narration: string,
  postings: { accountName: string; debit: number; credit: number }[]
): AuditJournalEntry {
  const totalDebit = postings.reduce((acc, p) => acc + (p.debit || 0), 0);
  const totalCredit = postings.reduce((acc, p) => acc + (p.credit || 0), 0);

  for (const p of postings) {
    if (accounts[p.accountName]) {
      const acc = accounts[p.accountName];
      if (acc.accountType === 'asset' || acc.accountType === 'expense') {
        acc.balance += (p.debit || 0) - (p.credit || 0);
      } else {
        acc.balance += (p.credit || 0) - (p.debit || 0);
      }
    }
  }

  const entry: AuditJournalEntry = {
    id: `jnl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    referenceNumber: `JNL-${Date.now().toString().slice(-6)}`,
    userAction,
    operator,
    narration,
    postings,
    totalDebit,
    totalCredit,
  };

  auditJournal.unshift(entry);
  return entry;
}

// ============================================================
// SYNC POS SALES → SETTLEMENT HUB
// Called by /api/sales POST after a sale is created in Prisma.
// Pushes the sale into the Settlement Hub's in-memory orders array
// so it appears in the settlement queue.
// ============================================================
export function syncSaleToSettlementHub(sale: {
  id: string;
  invoiceNo: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  totalDiscount: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount: number;
  dueAmount: number;
  status: string;
  isDelivery: boolean;
  deliveryPartnerCode?: string;
  freeDelivery?: boolean;
  saleItems: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  splitPayments?: Array<{ method: string; amount: number }>;
  note?: string | null;
  createdAt: string | Date;
}) {
  // Map POS payment method → Settlement Hub payment method
  let hubPaymentMethod = sale.paymentMethod;
  // COD without delivery = treated as cash at the POS counter
  if (sale.paymentMethod === 'cod' && !sale.isDelivery) {
    hubPaymentMethod = 'cash';
  }
  let deliveryType: 'pos_counter' | 'own_rider' | 'third_party_courier' = 'pos_counter';
  let riderName: string | undefined;
  let courierName: string | undefined;

  if (sale.isDelivery && sale.deliveryPartnerCode) {
    if (sale.deliveryPartnerCode === 'daowa_rider') {
      deliveryType = 'own_rider';
      hubPaymentMethod = 'rider';
      riderName = 'Rider Tareq';
    } else {
      deliveryType = 'third_party_courier';
      const courierMap: Record<string, string> = {
        steadfast: 'Steadfast', pathao: 'Pathao', redx: 'RedX', paperfly: 'Paperfly',
      };
      courierName = courierMap[sale.deliveryPartnerCode] || 'Steadfast';
      hubPaymentMethod = `courier_${sale.deliveryPartnerCode}`;
    }
  }

  // Determine settlement status
  const isCash = sale.paymentMethod === 'cash' || (sale.paymentMethod === 'cod' && !sale.isDelivery);
  const isDue = sale.paymentMethod === 'due';
  const isSplit = sale.paymentMethod === 'split';
  const isDigital = ['bkash', 'nagad', 'rocket', 'card'].includes(sale.paymentMethod);
  const isCOD = sale.paymentMethod === 'cod' && sale.isDelivery;

  // Cash sales are completed (instantly settled at POS)
  // COD without delivery = cash (completed)
  // Due sales are pending (customer owes money)
  // Digital/split/courier/rider/COD-with-delivery sales are pending settlement
  const orderStatus = isCash ? 'completed' : 'delivered_pending_payout';

  // Build order items
  const items = sale.saleItems.map((item, idx) => ({
    id: `item_${sale.id}_${idx}`,
    name: item.productName,
    genericName: '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.subtotal,
  }));

  const productAmount = sale.subtotal - (sale.totalDiscount || 0);
  const actualDeliveryFee = sale.deliveryCharge || 0;
  const isFreeDelivery = sale.freeDelivery === true;

  // ── DELIVERY CHARGE ACCOUNTING LOGIC ──
  // Third-party courier: delivery charge does NOT touch the company.
  //   - Courier collects product + delivery from customer
  //   - Courier keeps delivery charge (between courier & customer)
  //   - Courier owes company only the product amount
  //   - deliveryFee is tracked for COD calculation but NOT credited as company income
  //
  // Own rider: delivery charge IS company's delivery fee revenue.
  //   - Rider collects product + delivery from customer for the company
  //   - Company earns the delivery charge as income
  //
  // Free delivery (any): customer doesn't pay delivery charge.
  //   - Third-party courier: company pays delivery to courier (Courier Expense)
  //   - Own rider: no delivery revenue (customer got it free)
  let deliveryFee: number;
  let totalAmount: number;
  let companyBorneCharge: number | undefined;

  if (deliveryType === 'third_party_courier') {
    // Third-party courier: company only deals with product amount
    deliveryFee = isFreeDelivery ? 0 : actualDeliveryFee; // tracked for COD calc, NOT company income
    totalAmount = productAmount; // courier owes company only the product
    if (isFreeDelivery) {
      companyBorneCharge = actualDeliveryFee; // company's expense at settlement
    }
  } else if (deliveryType === 'own_rider') {
    // Own rider: delivery charge IS company's income
    if (isFreeDelivery) {
      deliveryFee = 0; // no delivery revenue (free for customer)
      totalAmount = productAmount; // customer only pays product
    } else {
      deliveryFee = actualDeliveryFee; // company's delivery fee revenue
      totalAmount = sale.grandTotal; // product + delivery (rider collects all for company)
    }
  } else {
    // POS counter: no delivery
    deliveryFee = 0;
    totalAmount = sale.grandTotal;
  }

  // Determine sale type — all POS sales are Offline (the POS is the in-store system).
  // Online sales come from the e-commerce web portal, not the POS.
  const saleType: 'online' | 'offline' = 'offline';

  const newOrder: HealthcareOrder = {
    id: sale.id,
    orderNumber: sale.invoiceNo,
    createdAt: typeof sale.createdAt === 'string' ? sale.createdAt : new Date(sale.createdAt).toISOString(),
    customerName: sale.customerName || 'Walk-in Customer',
    customerPhone: sale.customerPhone || '01700-000000',
    deliveryType,
    paymentMethod: hubPaymentMethod,
    saleType,
    notes: sale.note || `POS Sale (Offline)`,
    riderName,
    courierName,
    consignmentId: deliveryType === 'third_party_courier' ? `${courierName?.slice(0, 2).toUpperCase() || 'SF'}-${sale.invoiceNo.slice(-6)}` : undefined,
    items,
    productAmount,
    deliveryFee,
    totalAmount,
    status: orderStatus as any,
    isPaid: isCash || (isDigital && sale.dueAmount === 0),
    freeDelivery: isFreeDelivery || undefined,
    companyBorneDeliveryCharge: companyBorneCharge,
    dueAmount: isDue ? sale.dueAmount || sale.grandTotal : (sale.dueAmount > 0 ? sale.dueAmount : undefined),
  };

  // Add to the front of the orders array (in-place mutation)
  orders.unshift(newOrder);

  // Background double-entry posting for the sale
  // NOTE: delivery type takes priority over payment method. When a delivery
  // order uses a courier or own rider, the money flows through the courier/rider
  // clearing account (the customer pays the courier/rider, not the POS directly).
  const postings: { accountName: string; debit: number; credit: number }[] = [];

  if (deliveryType === 'third_party_courier') {
    // Courier COD: the courier collects from the customer, owes the company
    const clearingAcc = `${courierName} Clearing A/c`;
    ensureClearingAccount(clearingAcc, `${courierName} Delivered Funds Pending Payout`);
    postings.push({ accountName: clearingAcc, debit: totalAmount, credit: 0 });
  } else if (deliveryType === 'own_rider') {
    // Own rider: the rider collects cash from the customer
    postings.push({ accountName: 'Daowa Rider Clearing A/c', debit: totalAmount, credit: 0 });
  } else if (isCash) {
    // POS counter cash sale
    postings.push({ accountName: 'POS Cash Holding A/c', debit: totalAmount, credit: 0 });
  } else if (isDue) {
    // POS counter due sale
    postings.push({ accountName: 'Customer Accounts Receivable', debit: totalAmount, credit: 0 });
  } else if (isMfsMethod(hubPaymentMethod)) {
    const provider = getMfsProviderForMethod(hubPaymentMethod);
    const clearingAcc = `${provider} Clearing A/c`;
    ensureClearingAccount(clearingAcc, `${provider} Merchant Balance Pending Transfer`);
    postings.push({ accountName: clearingAcc, debit: totalAmount, credit: 0 });
  } else if (hubPaymentMethod.startsWith('card_') || hubPaymentMethod === 'card') {
    postings.push({ accountName: 'Card Clearing A/c', debit: totalAmount, credit: 0 });
  } else if (isSplit && sale.splitPayments) {
    // Split payment — debit each method's clearing account
    for (const sp of sale.splitPayments) {
      if (sp.method === 'cash') {
        postings.push({ accountName: 'POS Cash Holding A/c', debit: sp.amount, credit: 0 });
      } else if (isMfsMethod(sp.method)) {
        const provider = getMfsProviderForMethod(sp.method);
        const clearingAcc = `${provider} Clearing A/c`;
        ensureClearingAccount(clearingAcc, `${provider} Merchant Balance Pending Transfer`);
        postings.push({ accountName: clearingAcc, debit: sp.amount, credit: 0 });
      } else if (sp.method === 'card' || sp.method.startsWith('card_')) {
        postings.push({ accountName: 'Card Clearing A/c', debit: sp.amount, credit: 0 });
      }
    }
  }

  // Credit revenue
  postings.push({ accountName: 'Medicine Sales Revenue A/c', debit: 0, credit: productAmount });
  // Delivery Fee Revenue: ONLY for own rider (rider collects delivery charge FOR the company)
  // Third-party courier delivery charge does NOT touch company — not credited as income
  if (deliveryFee > 0 && !isFreeDelivery && deliveryType === 'own_rider') {
    postings.push({ accountName: 'Delivery Fee Revenue A/c', debit: 0, credit: deliveryFee });
  }
  // Rounding income/expense: if the grand total was rounded, account for it
  const roundingAdjust = sale.grandTotal - (productAmount + deliveryFee);
  if (Math.abs(roundingAdjust) > 0.01) {
    if (roundingAdjust > 0) {
      // Customer paid more (round up) → rounding income
      postings.push({ accountName: 'Rounding Income A/c', debit: 0, credit: Math.round(roundingAdjust * 100) / 100 });
    } else {
      // Customer paid less (round down) → rounding expense
      postings.push({ accountName: 'Rounding Expense A/c', debit: Math.round(-roundingAdjust * 100) / 100, credit: 0 });
    }
  }
  // For free delivery + third-party courier: the delivery charge is NOT recorded at
  // sale time. Instead, it will be recorded as Courier Expense in the SETTLEMENT
  // double-entry postings (Dr Courier Expense for delivery + COD, Cr Courier Clearing).

  postAuditJournalEntry(
    'POS Sale Approval',
    'System Automated Rule',
    `Sale ${sale.invoiceNo} (${hubPaymentMethod.toUpperCase()}${isFreeDelivery ? ' [FREE DELIVERY]' : ''}) for ${sale.customerName || 'Walk-in Customer'}`,
    postings
  );

  updateActiveShiftExpectedCash();

  return newOrder;
}

export function updateActiveShiftExpectedCash() {
  let totalCashSales = 0;
  for (const ord of orders) {
    if (ord.paymentMethod === 'cash' && ord.status !== 'failed_pending_return') {
      totalCashSales += ord.totalAmount;
    }
  }
  Object.assign(activeShift, { expectedCash: activeShift.openingFloat + totalCashSales });
  accounts['POS Cash Holding A/c'].balance = activeShift.expectedCash;
}

export function ensureClearingAccount(accountName: string, friendlyLabel: string): AccountBalance {
  if (!accounts[accountName]) {
    accounts[accountName] = {
      id: `acc_clr_${accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      accountName,
      friendlyLabel,
      accountType: 'asset',
      balance: 0,
      isClearingAccount: true,
    };
  }
  return accounts[accountName];
}

export function syncClearingAccountsWithFees() {
  for (const m of systemFees.mfs) {
    ensureClearingAccount(`${m.provider} Clearing A/c`, `${m.provider} Merchant Balance Pending Transfer`);
  }
  for (const c of systemFees.couriers) {
    ensureClearingAccount(`${c.courierName} Clearing A/c`, `${c.courierName} Delivered Funds Pending Payout`);
  }
}

export function isMfsMethod(paymentMethod: string): boolean {
  const norm = paymentMethod.toLowerCase();
  return systemFees.mfs.some((m) => m.provider.toLowerCase() === norm) ||
    ['bkash', 'nagad', 'rocket', 'upay'].includes(norm);
}

export function getMfsProviderForMethod(paymentMethod: string): string {
  const norm = paymentMethod.toLowerCase();
  const match = systemFees.mfs.find((m) => m.provider.toLowerCase() === norm);
  if (match) return match.provider;
  return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
}

export function getTargetBank(targetBankId?: string): { bankAccount: BusinessBankAccount; ledgerAccountName: string } {
  let bank = businessBankAccounts.find((b) => b.id === targetBankId && b.isActive);
  if (!bank) {
    bank = businessBankAccounts.find((b) => b.isDefault && b.isActive) || businessBankAccounts[0];
  }
  const bankPrefix = bank.bankName.split(' ')[0];
  const candidateLedger = `${bankPrefix} Bank A/c`;
  const ledgerAccountName = accounts[candidateLedger] ? candidateLedger : 'MTB Bank A/c';
  return { bankAccount: bank, ledgerAccountName };
}

// Initial sync (only run once per server lifetime)
if (!G.__DAOWA_SYNCED__) {
  G.__DAOWA_SYNCED__ = true;
  syncClearingAccountsWithFees();
}

// Mutator helpers (because we use `let` for module-level state, we need reassignment helpers
// for arrays/objects that get replaced wholesale)
export function setSystemFees(next: SystemFeeSettings) {
  (systemFees as any).couriers = next.couriers;
  (systemFees as any).mfs = next.mfs;
  (systemFees as any).cards = next.cards;
}

export function setAuditJournal(next: AuditJournalEntry[]) {
  auditJournal.length = 0;
  auditJournal.push(...next);
}

export function setOrders(next: HealthcareOrder[]) {
  orders.length = 0;
  orders.push(...next);
}

export function setActiveShift(next: EodRegisterShift) {
  Object.keys(activeShift).forEach((k) => delete (activeShift as any)[k]);
  Object.assign(activeShift, next);
}

export function setSettlementBatches(next: SettlementBatch[]) {
  settlementBatches.length = 0;
  settlementBatches.push(...next);
}

// Database reset function (used by /api/resetDatabase)
export function resetDatabaseState() {
  // Clear orders & batches (in-place to keep shared references)
  orders.length = 0;
  settlementBatches.length = 0;

  // Reset all account balances to zero
  for (const key of Object.keys(accounts)) {
    accounts[key].balance = 0;
  }

  // Setup pristine clean baseline operating funds
  accounts['POS Cash Holding A/c'].balance = 2000;
  accounts['Main Cash/Vault A/c'].balance = 10000;
  accounts['MTB Bank A/c'].balance = 50000;
  if (accounts['BRAC Bank A/c']) accounts['BRAC Bank A/c'].balance = 25000;
  if (accounts['City Bank A/c']) accounts['City Bank A/c'].balance = 15000;
  accounts['Medicine Inventory Asset A/c'].balance = 100000;

  // Reset business bank accounts to pristine starting liquidity
  businessBankAccounts.forEach((b) => {
    if (b.id === 'bank_mtb_01') b.balance = 50000;
    else if (b.id === 'bank_brac_02') b.balance = 25000;
    else if (b.id === 'bank_city_03') b.balance = 15000;
    else b.balance = 0;
  });

  Object.keys(activeShift).forEach((k) => delete (activeShift as any)[k]);
  Object.assign(activeShift, {
    id: `shift_${Date.now()}`,
    shiftNumber: `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
    cashierName: 'Tanvir Ahmed',
    counterName: 'Pharmacy Counter 01 (Main Branch)',
    startedAt: new Date().toISOString(),
    status: 'active',
    openingFloat: 2000,
    expectedCash: 2000,
    countedCash: 2000,
    discrepancy: 0,
    noteBreakdown: {
      '1000': 1,
      '500': 2,
    },
    settledToVaultAmount: 0,
    notes: 'Clean baseline shift initialized after database reset',
  });

  auditJournal.length = 0;
  auditJournal.push({
      id: `jnl_reset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      referenceNumber: 'JNL-RESET-001',
      userAction: 'Admin Database Reset',
      operator: 'System Administrator',
      narration:
        'Admin executed resetDatabase. Cleared all orders, settlement records, and EOD shift history. Fresh register till float initialized with ৳2,000.',
      totalDebit: 2000,
      totalCredit: 2000,
      postings: [
        { accountName: 'POS Cash Holding A/c', debit: 2000, credit: 0 },
        { accountName: 'Main Cash/Vault A/c', debit: 0, credit: 2000 },
      ],
    });

  syncClearingAccountsWithFees();
  updateActiveShiftExpectedCash();
}
