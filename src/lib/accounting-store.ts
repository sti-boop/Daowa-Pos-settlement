import { create } from 'zustand';

export type AppView =
  | 'dashboard'
  | 'groups'
  | 'ledgers'
  | 'vouchers'
  | 'create-voucher'
  | 'recurring-journals'
  | 'create-recurring'
  | 'reports'
  | 'view-report'
  | 'company'
  | 'voucher-list'
  | 'stock-groups'
  | 'stock-items'
  | 'audit';

export type ReportType =
  | 'trial-balance'
  | 'pnl'
  | 'balance-sheet'
  | 'day-book'
  | 'ledger-report'
  | 'sales-register'
  | 'purchase-register'
  | 'stock-summary'
  | 'vat-report';

interface AppState {
  view: AppView;
  setView: (view: AppView) => void;
  selectedVoucherType: string | null;
  setSelectedVoucherType: (type: string | null) => void;
  selectedReport: ReportType | null;
  setSelectedReport: (report: ReportType | null) => void;
  selectedLedgerId: string | null;
  setSelectedLedgerId: (id: string | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  voucherListFilter: string | null;
  setVoucherListFilter: (filter: string | null) => void;
  ledgerGroupFilter: string | null;
  setLedgerGroupFilter: (filter: string | null) => void;
  voucherListDates: { from: string; to: string } | null;
  setVoucherListDates: (dates: { from: string; to: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
  selectedVoucherType: null,
  setSelectedVoucherType: (type) => set({ selectedVoucherType: type }),
  selectedReport: null,
  setSelectedReport: (report) => set({ selectedReport: report }),
  selectedLedgerId: null,
  setSelectedLedgerId: (id) => set({ selectedLedgerId: id }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  voucherListFilter: null,
  setVoucherListFilter: (filter) => set({ voucherListFilter: filter }),
  ledgerGroupFilter: null,
  setLedgerGroupFilter: (filter) => set({ ledgerGroupFilter: filter }),
  voucherListDates: null,
  setVoucherListDates: (dates) => set({ voucherListDates: dates }),
}));
