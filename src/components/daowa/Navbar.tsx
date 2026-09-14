'use client';

import React, { useState } from 'react';
import {
  Building2,
  Wallet,
  Banknote,
  ShieldCheck,
  Pill,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { OverviewData } from '@/services/api';

interface NavbarProps {
  overview: OverviewData | null;
  activeTab: 'settlement' | 'eod' | 'returns' | 'fees';
  setActiveTab: (tab: 'settlement' | 'eod' | 'returns' | 'fees') => void;
  onOpenAuditModal: () => void;
  onOpenBankAccountsModal?: () => void;
  onOpenAdminToolsModal?: () => void;
  onRefresh: () => void;
  onResetAllData?: () => Promise<void>;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  overview,
  activeTab,
  setActiveTab,
  onOpenAuditModal,
  onOpenBankAccountsModal,
  onOpenAdminToolsModal,
  onRefresh,
  onResetAllData,
  isLoading,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmReset = async () => {
    if (!onResetAllData) return;
    try {
      setIsResetting(true);
      await onResetAllData();
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  const defaultBank = overview?.defaultBankAccount || overview?.bankAccounts?.[0];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      {/* Top Brand & Real-Time Account Badges Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3FB98C] to-[#2D9F73] flex items-center justify-center text-white font-black shadow-md">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-[#524646]">Daowa.net</span>
              <span className="text-xs bg-[#3FB98C]/10 text-[#2D9F73] font-semibold px-2 py-0.5 rounded-full border border-[#3FB98C]/15">
                Healthcare POS
              </span>
            </div>
            <p className="text-xs text-gray-500">Settlement Hub &amp; EOD Cashier Portal</p>
          </div>
        </div>

        {/* Real-world operating account indicators */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
          {/* Business Bank Account Link */}
          <button
            onClick={onOpenBankAccountsModal}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#FCF2E5]/40 border border-gray-200 hover:border-[#3FB98C]/25 hover:bg-[#3FB98C]/5 transition group text-left cursor-pointer"
            title="Click to manage business bank accounts"
          >
            <div className="w-2 h-2 rounded-full bg-[#3FB98C] animate-pulse" />
            <Building2 className="w-3.5 h-3.5 text-[#2D9F73] group-hover:scale-110 transition-transform" />
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 block text-[10px] uppercase font-medium">
                  {defaultBank ? defaultBank.bankName.slice(0, 18) : 'Bank Balance'}
                </span>
                <span className="text-[9px] text-[#2D9F73] underline decoration-dotted font-bold hidden sm:inline">Manage</span>
              </div>
              <span className="font-bold font-mono text-[#2D9F73] text-sm">
                ৳{overview ? overview.bankBalance.toLocaleString() : '...'}
              </span>
            </div>
          </button>

          {/* Store Safe / Vault */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#FCF2E5]/40 border border-gray-200">
            <Wallet className="w-3.5 h-3.5 text-[#2D9F73]" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-medium">Store Vault</span>
              <span className="font-bold font-mono text-[#2D9F73] text-sm">
                ৳{overview ? overview.vaultBalance.toLocaleString() : '...'}
              </span>
            </div>
          </div>

          {/* Counter Cash Drawer */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#FCF2E5]/40 border border-gray-200">
            <Banknote className="w-3.5 h-3.5 text-amber-600" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-medium">Till Cash</span>
              <span className="font-bold font-mono text-amber-700 text-sm">
                ৳{overview ? overview.posDrawerCash.toLocaleString() : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenAuditModal}
            className="flex items-center space-x-1.5 bg-[#FCF2E5]/40 hover:bg-gray-100 text-gray-700 font-medium text-xs px-3 py-2 rounded-lg border border-gray-200 transition"
            title="View double-entry audit journal"
          >
            <ShieldCheck className="w-4 h-4 text-[#2D9F73]" />
            <span className="hidden md:inline">Audit Records</span>
          </button>

          {onOpenAdminToolsModal && (
            <button
              onClick={onOpenAdminToolsModal}
              className="flex items-center space-x-1.5 bg-[#EC5B38]/5 hover:bg-red-100 text-[#EC5B38] font-bold text-xs px-3 py-2 rounded-lg border border-[#EC5B38]/20 transition"
              title="Admin tools: reset database"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-[#FCF2E5]/40 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition disabled:opacity-50"
            title="Refresh balances"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#2D9F73]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Resetting All Amounts */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-[#524646] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-red-100 text-[#EC5B38] rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#524646]">Reset System to Fresh Stats?</h3>
                <p className="text-xs text-gray-600 mt-1">
                  This will clear all transactions, reset register drawer cash and bank balances to their baseline.
                </p>
              </div>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-[#A8A492] hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 bg-[#EC5B38] hover:bg-[#EC5B38]/90 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Resetting...' : 'Yes, Clear All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
        <button
          onClick={() => setActiveTab('settlement')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'settlement'
              ? 'border-[#3FB98C] text-[#2D9F73]'
              : 'border-transparent text-gray-500 hover:text-[#524646]'
          }`}
        >
          <span>Settlement Hub</span>
          {overview && (overview.pendingAmounts.mfs + overview.pendingAmounts.courier + overview.pendingAmounts.rider + overview.pendingAmounts.card) > 0 && (
            <span className="bg-[#3FB98C]/10 text-[#2D9F73] text-[11px] px-2 py-0.5 rounded-full border border-[#3FB98C]/15 font-bold">
              ৳{(overview.pendingAmounts.mfs + overview.pendingAmounts.courier + overview.pendingAmounts.rider + overview.pendingAmounts.card).toLocaleString()}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('eod')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'eod'
              ? 'border-[#3FB98C] text-[#2D9F73]'
              : 'border-transparent text-gray-500 hover:text-[#524646]'
          }`}
        >
          <span>EOD Cash Register Close</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'returns'
              ? 'border-[#3FB98C] text-[#2D9F73]'
              : 'border-transparent text-gray-500 hover:text-[#524646]'
          }`}
        >
          <span>Courier Return &amp; Restock Queue</span>
          {overview && overview.counts.pendingReturns > 0 && (
            <span className="bg-[#EC5B38]/5 text-[#EC5B38] text-[11px] px-2 py-0.5 rounded-full border border-[#EC5B38]/20 font-bold">
              {overview.counts.pendingReturns}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === 'fees'
              ? 'border-[#3FB98C] text-[#2D9F73]'
              : 'border-transparent text-gray-500 hover:text-[#524646]'
          }`}
        >
          <span>Fee &amp; Commission Matrix</span>
        </button>
      </div>
    </header>
  );
};
