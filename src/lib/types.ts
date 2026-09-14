// Daowa Settlement Hub - Core Type Definitions
// Mirrors the original src/types.ts from the Vite/Express app

export type PaymentMethod =
  | 'cash'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'card_visa_master'
  | 'card_amex'
  | 'card_pos'
  | 'rider'
  | 'courier_steadfast'
  | 'courier_pathao'
  | 'courier_redx'
  | 'courier_carrybee'
  | string;

export type CourierName = 'Steadfast' | 'Pathao' | 'RedX' | 'Carrybee' | string;
export type MFSProvider = 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | string;
export type CardProvider = 'Visa / Mastercard' | 'American Express' | 'POS Terminal' | string;

export interface OrderItem {
  id: string;
  name: string;
  genericName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type OrderStatus =
  | 'completed'
  | 'cleared'
  | 'in_transit'
  | 'delivered_pending_payout'
  | 'failed_pending_return'
  | 'returned_restocked';

export interface HealthcareOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'pos_counter' | 'own_rider' | 'third_party_courier';
  paymentMethod: PaymentMethod;
  riderName?: string;
  courierName?: CourierName;
  consignmentId?: string;
  items: OrderItem[];
  productAmount: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  isPaid: boolean;
  settledAt?: string;
  settlementBatchId?: string;
  returnReason?: string;
  returnCondition?: 'intact' | 'damaged';
  returnCourierCharge?: number;
  saleType?: 'online' | 'offline';
  notes?: string;
  dueAmount?: number; // remaining unpaid due amount (for partial settlements)
  // Free delivery: customer pays 0 delivery fee. For couriers, the company
  // absorbs the courier's delivery charge (booked as Courier Expense).
  freeDelivery?: boolean;
  // The delivery charge the company pays to the courier on behalf of the
  // customer (only set when freeDelivery + third_party_courier).
  companyBorneDeliveryCharge?: number;
}

export interface BusinessBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: 'Corporate Current' | 'SME Business' | 'Special Notice Deposit (SND)' | 'Escrow Account';
  branchName: string;
  routingNumber: string;
  balance: number;
  isDefault: boolean;
  isActive: boolean;
  openedDate: string;
  notes?: string;
}

export interface CourierFeeConfig {
  courierName: CourierName;
  baseDeliveryFeeInside: number;
  baseDeliveryFeeOutside: number;
  codFeePercent: number; // e.g. 1.0 for 1%
  returnCharge: number;
  isActive: boolean;
}

export interface MFSFeeConfig {
  provider: MFSProvider;
  feePercent: number; // e.g. 1.15
  autoSettle: boolean;
  settleIntervalHours: number; // e.g. 24
  accountNumber: string;
}

export interface CardFeeConfig {
  provider: CardProvider;
  feePercent: number; // e.g. 2.0
  payoutDays: number;
  terminalId: string;
}

export interface SystemFeeSettings {
  couriers: CourierFeeConfig[];
  mfs: MFSFeeConfig[];
  cards: CardFeeConfig[];
}

export interface AccountBalance {
  id: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  friendlyLabel: string;
  isClearingAccount: boolean;
}

export interface DoubleEntryPosting {
  accountName: string;
  debit: number;
  credit: number;
}

export interface AuditJournalEntry {
  id: string;
  timestamp: string;
  referenceNumber: string;
  userAction: string;
  operator: string;
  narration: string;
  postings: DoubleEntryPosting[];
  totalDebit: number;
  totalCredit: number;
}

export interface EodRegisterShift {
  id: string;
  shiftNumber: string;
  cashierName: string;
  counterName: string;
  startedAt: string;
  closedAt?: string;
  status: 'active' | 'closed';
  openingFloat: number;
  expectedCash: number;
  countedCash: number;
  discrepancy: number; // counted - expected
  noteBreakdown: Record<string, number>;
  settledToVaultAmount: number;
  notes?: string;
}

export interface SettlementBatch {
  id: string;
  batchNumber: string;
  channelType: 'mfs' | 'courier' | 'rider' | 'card';
  channelName: string;
  timestamp: string;
  orderCount: number;
  grossAmount: number;
  deductedFees: number;
  netBankDeposit: number;
  bankReference?: string;
  performedBy: string;
  journalEntryId: string;
}

export interface OverviewData {
  bankBalance: number;
  vaultBalance: number;
  posDrawerCash: number;
  activeShift: EodRegisterShift;
  bankAccounts?: BusinessBankAccount[];
  defaultBankAccount?: BusinessBankAccount;
  pendingAmounts: {
    mfs: number;
    courier: number;
    rider: number;
    card: number;
  };
  counts: {
    pendingMfs: number;
    pendingCourier: number;
    pendingRider: number;
    pendingCard: number;
    pendingReturns: number;
  };
  accounts: AccountBalance[];
  recentBatches: SettlementBatch[];
}
