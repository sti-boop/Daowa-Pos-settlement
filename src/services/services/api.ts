// Daowa Settlement Hub - Frontend API Client
// Mirrors the original src/services/api.ts from the Vite/Express app.
// All requests use relative paths so they hit the Next.js API routes.

import {
  HealthcareOrder,
  SystemFeeSettings,
  AccountBalance,
  AuditJournalEntry,
  EodRegisterShift,
  SettlementBatch,
  CourierName,
  MFSProvider,
  BusinessBankAccount,
} from '@/lib/types';

export type { OverviewData } from '@/lib/types';

export const api = {
  async getOverview(): Promise<import('@/lib/types').OverviewData> {
    const res = await fetch('/api/overview');
    if (!res.ok) throw new Error('Failed to fetch system overview');
    return res.json();
  },

  async getOrders(channel?: string, status?: string): Promise<HealthcareOrder[]> {
    const params = new URLSearchParams();
    if (channel) params.append('channel', channel);
    if (status) params.append('status', status);
    const res = await fetch(`/api/orders?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async simulateSale(saleData: {
    customerName: string;
    customerPhone: string;
    deliveryType: 'pos_counter' | 'own_rider' | 'third_party_courier';
    paymentMethod: string;
    saleType?: 'online' | 'offline';
    notes?: string;
    riderName?: string;
    courierName?: string;
    items: Array<{ name: string; genericName: string; quantity: number; unitPrice: number }>;
    deliveryFee?: number;
    isDueSale?: boolean;
    freeDelivery?: boolean;
    splitPayment?: {
      method1: string;
      method2: string;
      amount1: number;
      amount2: number;
    };
  }): Promise<{ success: boolean; order: HealthcareOrder; message: string }> {
    const res = await fetch('/api/orders/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to simulate sale');
    }
    return res.json();
  },

  async settleMFS(provider: MFSProvider, bankAccountId?: string): Promise<{ success: boolean; batch: SettlementBatch; message: string }> {
    const res = await fetch('/api/settle/mfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, bankAccountId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle MFS batch');
    }
    return res.json();
  },

  async settleCourier(courierName: CourierName, depositAmount?: number, bankAccountId?: string): Promise<{ success: boolean; batch: SettlementBatch; message: string }> {
    const res = await fetch('/api/settle/courier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courierName, depositAmount, bankAccountId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle courier deposit');
    }
    return res.json();
  },

  async settleRider(riderName: string, collectedAmount?: number): Promise<{ success: boolean; batch: SettlementBatch; message: string }> {
    const res = await fetch('/api/settle/rider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderName, collectedAmount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to collect rider cash');
    }
    return res.json();
  },

  async settleCard(provider: string = 'Visa / Mastercard', bankAccountId?: string): Promise<{ success: boolean; batch: SettlementBatch; message: string }> {
    const res = await fetch('/api/settle/card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, bankAccountId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle card batch');
    }
    return res.json();
  },

  async verifyAndRestockReturn(orderId: string, condition: 'intact' | 'damaged'): Promise<{ success: boolean; order: HealthcareOrder; message: string }> {
    const res = await fetch('/api/returns/verify-and-restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, condition }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to restock returned item');
    }
    return res.json();
  },

  async getCurrentEod(): Promise<{ activeShift: EodRegisterShift; posHoldingBalance: number; vaultBalance: number }> {
    const res = await fetch('/api/eod/current');
    if (!res.ok) throw new Error('Failed to fetch EOD details');
    return res.json();
  },

  async closeEodShift(data: {
    countedCash: number;
    noteBreakdown: Record<string, number>;
    notes?: string;
  }): Promise<{ success: boolean; closedShift: EodRegisterShift; newShift: EodRegisterShift; message: string }> {
    const res = await fetch('/api/eod/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to close register shift');
    }
    return res.json();
  },

  async getFees(): Promise<SystemFeeSettings> {
    const res = await fetch('/api/fees');
    if (!res.ok) throw new Error('Failed to fetch fee rules');
    return res.json();
  },

  async updateFees(fees: SystemFeeSettings): Promise<{ success: boolean; fees: SystemFeeSettings; message: string }> {
    const res = await fetch('/api/fees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fees),
    });
    if (!res.ok) throw new Error('Failed to update fee rules');
    return res.json();
  },

  async getAuditJournal(): Promise<{ entries: AuditJournalEntry[]; accounts: AccountBalance[]; isBalanced: boolean }> {
    const res = await fetch('/api/audit-journal');
    if (!res.ok) throw new Error('Failed to fetch audit journal');
    return res.json();
  },

  async settleIndividualOrder(orderId: string, operator?: string, bankAccountId?: string, settlementMethod?: string): Promise<{ success: boolean; order: HealthcareOrder; batch: SettlementBatch; message: string }> {
    const res = await fetch('/api/settle/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, operator, bankAccountId, settlementMethod }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to settle order');
    }
    return res.json();
  },

  // Bank Accounts Management
  async getBankAccounts(): Promise<{ bankAccounts: BusinessBankAccount[]; totalLiquidity: number }> {
    const res = await fetch('/api/bank-accounts');
    if (!res.ok) throw new Error('Failed to fetch business bank accounts');
    return res.json();
  },

  async addBankAccount(data: Partial<BusinessBankAccount>): Promise<{ success: boolean; bankAccount: BusinessBankAccount; message: string }> {
    const res = await fetch('/api/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add business bank account');
    }
    return res.json();
  },

  async setDefaultBankAccount(id: string): Promise<{ success: boolean; bankAccounts: BusinessBankAccount[]; message: string }> {
    const res = await fetch(`/api/bank-accounts/${id}/default`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set default bank account');
    }
    return res.json();
  },

  async deleteBankAccount(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/bank-accounts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove bank account');
    }
    return res.json();
  },

  // Service Management (MFS / Courier providers)
  async addMfsProvider(data: { provider: string; feePercent?: number; accountNumber?: string; settleIntervalHours?: number }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/services/mfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add MFS provider');
    }
    return res.json();
  },

  async removeMfsProvider(provider: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/services/mfs/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove MFS provider');
    }
    return res.json();
  },

  async addCourier(data: {
    courierName: string;
    baseDeliveryFeeInside?: number;
    baseDeliveryFeeOutside?: number;
    codFeePercent?: number;
    returnCharge?: number;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/services/courier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add courier service');
    }
    return res.json();
  },

  async removeCourier(courierName: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/services/courier/${encodeURIComponent(courierName)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove courier service');
    }
    return res.json();
  },

  // Admin Tool: Reset Database (Wipes orders, batches, and EOD history for clean testing)
  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/resetDatabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset database');
    }
    return res.json();
  },

  async resetAllData(): Promise<{ success: boolean; message: string }> {
    return this.resetDatabase();
  },
};
