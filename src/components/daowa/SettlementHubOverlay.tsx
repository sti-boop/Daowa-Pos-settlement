'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Pill,
  X,
} from 'lucide-react';
import {
  HealthcareOrder,
  SystemFeeSettings,
  CourierName,
  MFSProvider,
  EodRegisterShift,
} from '@/lib/types';
import { api, OverviewData } from '@/services/api';
import { Navbar } from '@/components/daowa/Navbar';
import { SettlementHub } from '@/components/daowa/SettlementHub';
import { EodCashRegister } from '@/components/daowa/EodCashRegister';
import { CourierReturnQueue } from '@/components/daowa/CourierReturnQueue';
import { FeeSettingsMatrix } from '@/components/daowa/FeeSettingsMatrix';
import { AuditorInspectionModal } from '@/components/daowa/AuditorInspectionModal';
import { BusinessBankAccountsModal } from '@/components/daowa/BusinessBankAccountsModal';
import { AdminToolsModal } from '@/components/daowa/AdminToolsModal';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface SettlementHubOverlayProps {
  onClose?: () => void;
  initialTab?: 'settlement' | 'eod' | 'returns' | 'fees';
}

export default function SettlementHubOverlay({ initialTab = 'settlement' }: SettlementHubOverlayProps) {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [orders, setOrders] = useState<HealthcareOrder[]>([]);
  const [fees, setFees] = useState<SystemFeeSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'settlement' | 'eod' | 'returns' | 'fees'>(initialTab);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastClosedShift, setLastClosedShift] = useState<EodRegisterShift | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isBankAccountsOpen, setIsBankAccountsOpen] = useState<boolean>(false);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4500);
  };

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [overviewData, ordersData, feesData] = await Promise.all([
        api.getOverview(), api.getOrders(), api.getFees(),
      ]);
      setOverview(overviewData); setOrders(ordersData); setFees(feesData);
    } catch (err: any) { addToast(err.message || 'Failed to load system data', 'error'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const h = async (fn: () => Promise<any>, errMsg: string) => {
    try { setIsProcessing(true); const res = await fn(); addToast(res.message || 'Success', 'success'); await loadAllData(); }
    catch (e: any) { addToast(e.message || errMsg, 'error'); }
    finally { setIsProcessing(false); }
  };

  const handleSettleMFS = (p: MFSProvider, b?: string) => h(() => api.settleMFS(p, b), 'MFS settle failed');
  const handleSettleCourier = (c: CourierName, d?: number, b?: string) => h(() => api.settleCourier(c, d, b), 'Courier settle failed');
  const handleSettleRider = (r: string, c?: number) => h(() => api.settleRider(r, c), 'Rider settle failed');
  const handleSettleCard = (p: string, b?: string) => h(() => api.settleCard(p, b), 'Card settle failed');
  const handleSettleIndividualOrder = (id: string, b?: string, m?: string) => h(() => api.settleIndividualOrder(id, undefined, b, m), 'Order settle failed');
  const handleResetDatabase = () => h(() => api.resetDatabase(), 'Reset failed');
  const handleVerifyAndRestock = (id: string, c: 'intact' | 'damaged') => h(() => api.verifyAndRestockReturn(id, c), 'Restock failed');
  const handleCloseShift = (d: any) => h(async () => { const r = await api.closeEodShift(d); setLastClosedShift(r.closedShift); return r; }, 'Shift close failed');
  const handleSaveFees = (f: SystemFeeSettings) => h(async () => { const r = await api.updateFees(f); setFees(r.fees); return r; }, 'Fee update failed');

  return (
    <div className="min-h-screen bg-[#FCF2E5]/40 text-[#524646] flex flex-col font-sans">
      {/* Brand bar (module navigation lives in the shared left sidebar) */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <Pill className="w-4 h-4 text-[#2D9F73]" />
          <span>Daowa.net Settlement Hub &amp; EOD Cashier Portal</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-bold">Settlement Hub</span>
        </div>
      </div>

      <Navbar
        overview={overview}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuditModal={() => setIsAuditOpen(true)}
        onOpenBankAccountsModal={() => setIsBankAccountsOpen(true)}
        onOpenAdminToolsModal={() => setIsAdminToolsOpen(true)}
        onRefresh={loadAllData}
        onResetAllData={handleResetDatabase}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && !overview ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="w-12 h-12 border-4 border-[#3FB98C]/15 border-t-[#3FB98C] rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold">Loading Daowa Settlement Hub&hellip;</p>
          </div>
        ) : (
          <>
            {activeTab === 'settlement' && (
              <SettlementHub overview={overview} orders={orders} fees={fees} bankAccounts={overview?.bankAccounts || []} onManageBankAccounts={() => setIsBankAccountsOpen(true)} onSettleMFS={handleSettleMFS} onSettleCourier={handleSettleCourier} onSettleRider={handleSettleRider} onSettleCard={handleSettleCard} onSettleIndividualOrder={handleSettleIndividualOrder} isProcessing={isProcessing} />
            )}
            {activeTab === 'eod' && (<EodCashRegister overview={overview} onCloseShift={handleCloseShift} isProcessing={isProcessing} lastClosedShift={lastClosedShift} />)}
            {activeTab === 'returns' && (<CourierReturnQueue orders={orders} onVerifyAndRestock={handleVerifyAndRestock} isProcessing={isProcessing} />)}
            {activeTab === 'fees' && (<FeeSettingsMatrix fees={fees} onSaveFees={handleSaveFees} isProcessing={isProcessing} />)}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <Pill className="w-4 h-4 text-[#2D9F73]" />
            <span className="font-bold text-gray-700">Daowa.net Healthcare Financial Systems</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 text-[#2D9F73] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#3FB98C] animate-pulse" />
              Automated Double-Entry Background Engine Active
            </span>
            <button onClick={() => setIsAuditOpen(true)} className="text-[#2D9F73] hover:text-[#2D9F73] underline font-medium">Verify Ledger Balance</button>
          </div>
        </div>
      </footer>

      {isAuditOpen && (<AuditorInspectionModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />)}
      {isBankAccountsOpen && (<BusinessBankAccountsModal isOpen={isBankAccountsOpen} onClose={() => setIsBankAccountsOpen(false)} bankAccounts={overview?.bankAccounts || []} onRefresh={loadAllData} />)}
      {isAdminToolsOpen && (<AdminToolsModal isOpen={isAdminToolsOpen} onClose={() => setIsAdminToolsOpen(false)} overview={overview} onRefresh={loadAllData} />)}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start space-x-2.5 ${
            toast.type === 'success' ? 'bg-[#3FB98C] text-white border-[#2D9F73]'
            : toast.type === 'error' ? 'bg-[#EC5B38] text-white border-red-700'
            : 'bg-gray-800 text-white border-gray-700'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />}
            <div className="flex-1">{toast.message}</div>
            <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} className="text-white/70 hover:text-white p-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
