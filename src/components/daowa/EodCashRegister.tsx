'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck,
  Store,
  ArrowRight,
  Printer,
  History,
  Info,
} from 'lucide-react';
import { EodRegisterShift } from '@/lib/types';
import { OverviewData } from '@/services/api';

interface EodCashRegisterProps {
  overview: OverviewData | null;
  onCloseShift: (data: {
    countedCash: number;
    noteBreakdown: Record<string, number>;
    notes?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  lastClosedShift: EodRegisterShift | null;
}

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10];

export const EodCashRegister: React.FC<EodCashRegisterProps> = ({
  overview,
  onCloseShift,
  isProcessing,
  lastClosedShift,
}) => {
  const activeShift = overview?.activeShift;

  const [useBreakdown, setUseBreakdown] = useState<boolean>(true);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({
    '1000': 3,
    '500': 4,
    '200': 1,
    '100': 2,
    '50': 1,
    '20': 0,
    '10': 0,
  });
  const [manualCountedCash, setManualCountedCash] = useState<number>(5450);
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // Calculate counted cash from note breakdown
  const countedFromNotes = Object.entries(noteCounts).reduce((sum, [denom, count]) => {
    return sum + Number(denom) * (Number(count) || 0);
  }, 0);

  const finalCountedCash = useBreakdown ? countedFromNotes : manualCountedCash;
  const expectedCash = activeShift ? activeShift.expectedCash : 5450;
  const discrepancy = finalCountedCash - expectedCash;

  useEffect(() => {
    if (activeShift && activeShift.expectedCash) {
      setManualCountedCash(activeShift.expectedCash);
    }
  }, [activeShift?.expectedCash]);

  const handleNoteChange = (denom: number, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setNoteCounts((prev) => ({ ...prev, [denom.toString()]: num }));
  };

  const handleCompleteShift = async () => {
    await onCloseShift({
      countedCash: finalCountedCash,
      noteBreakdown: noteCounts,
      notes: shiftNotes,
    });
    setShowSummaryModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Shift Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-[#3FB98C]/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#3FB98C]/20">
              Shift In Progress
            </span>
            <span className="text-xs text-white/80">
              {activeShift?.shiftNumber || 'SHIFT-2026-0902'}
            </span>
          </div>
          <h2 className="text-xl font-bold">End of Day (EOD) Register Close</h2>
          <p className="text-xs text-white/80">
            Count physical cash inside the register till, record any difference, and deposit day-end cash into the central safe.
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs bg-gray-100/80 p-3 rounded-xl border border-gray-300">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-[#2D9F73]" />
            <div>
              <span className="text-[#A8A492] block text-[10px]">On-Duty Cashier</span>
              <span className="font-bold text-[#524646]">{activeShift?.cashierName || 'Tanvir Ahmed'}</span>
            </div>
          </div>
          <div className="border-l border-gray-300 pl-4 flex items-center space-x-2">
            <Store className="w-4 h-4 text-[#2D9F73]" />
            <div>
              <span className="text-[#A8A492] block text-[10px]">Counter</span>
              <span className="font-bold text-[#524646]">{activeShift?.counterName || 'Counter 01'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Physical Cash Counting */}
        <div className="lg:col-span-7 bg-[#FCF2E5]/40 border border-gray-200 shadow-sm rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-bold text-[#524646] text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#2D9F73]" />
                <span>Count Physical Cash in Drawer</span>
              </h3>
              <p className="text-xs text-gray-500">Count the banknotes in your register till</p>
            </div>

            <div className="flex items-center bg-[#FCF2E5]/40 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setUseBreakdown(true)}
                className={`px-3 py-1 rounded-md transition ${
                  useBreakdown ? 'bg-white text-[#524646] shadow-sm' : 'text-gray-600 hover:text-[#524646]'
                }`}
              >
                Note Counter
              </button>
              <button
                onClick={() => setUseBreakdown(false)}
                className={`px-3 py-1 rounded-md transition ${
                  !useBreakdown ? 'bg-white text-[#524646] shadow-sm' : 'text-gray-600 hover:text-[#524646]'
                }`}
              >
                Direct Amount
              </button>
            </div>
          </div>

          {useBreakdown ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DENOMINATIONS.map((denom) => {
                  const count = noteCounts[denom.toString()] || 0;
                  const total = denom * count;
                  return (
                    <div key={denom} className="bg-[#FCF2E5]/40 p-3 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                        <span className="text-[#2D9F73] font-extrabold">৳{denom} Note</span>
                        <span className="text-[11px] text-gray-500 font-mono">৳{total.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) => handleNoteChange(denom, e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-[#524646] font-bold text-sm text-center focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#3FB98C]/5 border border-[#3FB98C]/15 p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2D9F73]">Total Calculated from Banknotes:</span>
                <span className="text-xl font-black text-[#2D9F73]">৳{countedFromNotes.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">
                Total Counted Cash in Till (৳)
              </label>
              <input
                type="number"
                value={manualCountedCash}
                onChange={(e) => setManualCountedCash(Number(e.target.value) || 0)}
                className="w-full bg-[#FCF2E5]/40 border border-gray-300 rounded-xl px-4 py-3 text-2xl font-black text-[#524646] focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
              />
              <span className="text-xs text-[#A8A492]">Enter the exact sum of cash counted in drawer.</span>
            </div>
          )}

          {/* Optional shift notes */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Closing Shift Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Counter handed over cleanly to night shift cashier"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              className="w-full bg-[#FCF2E5]/40 border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-[#524646] focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column: Comparison & 1-Click Close */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-[#524646] text-base border-b border-gray-100 pb-3">
              Till Reconciliation Summary
            </h3>

            {/* Expected Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Opening Cash Float:</span>
                <span className="font-semibold text-[#524646]">৳{activeShift?.openingFloat.toLocaleString() || '2,000'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Today&apos;s POS Cash Sales:</span>
                <span className="font-semibold text-[#2D9F73]">+৳{((activeShift?.expectedCash || 5450) - (activeShift?.openingFloat || 2000)).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Petty Cash / Payouts:</span>
                <span className="font-semibold text-[#524646]">৳0</span>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="font-bold text-[#524646]">Expected in Register:</span>
                <span className="font-black text-[#524646]">৳{expectedCash.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-700">Actual Counted Cash:</span>
                <span className="font-black text-[#524646]">৳{finalCountedCash.toLocaleString()}</span>
              </div>
            </div>

            {/* Discrepancy Status Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              discrepancy === 0
                ? 'bg-[#3FB98C]/5 border-[#3FB98C]/15 text-[#2D9F73]'
                : discrepancy < 0
                ? 'bg-[#EC5B38]/5 border-[#EC5B38]/20 text-rose-950'
                : 'bg-[#3FB98C]/5 border-[#3FB98C]/15 text-[#2D9F73]'
            }`}>
              <div className="flex items-center space-x-2">
                {discrepancy === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-[#2D9F73] flex-shrink-0" />
                ) : discrepancy < 0 ? (
                  <TrendingDown className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-[#2D9F73] flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {discrepancy === 0 && 'Drawer Perfectly Balanced (৳0 difference)'}
                    {discrepancy < 0 && `Cash Shortage: -৳${Math.abs(discrepancy).toLocaleString()}`}
                    {discrepancy > 0 && `Cash Surplus / Overage: +৳${discrepancy.toLocaleString()}`}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {discrepancy === 0 && 'Count matches system records exactly. Ready to transfer to vault.'}
                    {discrepancy < 0 && 'System will automatically record register discrepancy upon shift close.'}
                    {discrepancy > 0 && 'Extra cash in till will be recorded to register surplus account.'}
                  </div>
                </div>
              </div>
            </div>

            {/* 1-Click Action Button */}
            <button
              onClick={handleCompleteShift}
              disabled={isProcessing}
              className="w-full bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold py-3.5 px-4 rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Complete Day-End Shift</span>
            </button>

            <p className="text-[11px] text-gray-500 text-center">
              Automatically transfers <strong>৳{finalCountedCash.toLocaleString()}</strong> to the Central Store Vault and prepares the register with tomorrow&apos;s opening float.
            </p>
          </div>

          {/* Last Closed Shift Summary Card */}
          {lastClosedShift && (
            <div className="bg-[#FCF2E5]/40 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-gray-500" />
                  Last Closed Shift ({lastClosedShift.shiftNumber})
                </span>
                <span className="text-[#2D9F73] font-extrabold">
                  ৳{lastClosedShift.settledToVaultAmount.toLocaleString()} to Vault
                </span>
              </div>
              <p className="text-gray-500">
                Closed by {lastClosedShift.cashierName} at {new Date(lastClosedShift.closedAt || '').toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Modal / Print Slip */}
      {showSummaryModal && lastClosedShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-[#3FB98C]/10 text-[#2D9F73] rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#524646] text-lg">Shift Closed Successfully!</h3>
              <p className="text-xs text-gray-500">Shift #{lastClosedShift.shiftNumber}</p>
            </div>

            <div className="bg-[#FCF2E5]/40 rounded-xl p-4 border border-gray-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between border-b border-gray-200 pb-2 font-bold text-gray-800">
                <span>Daowa.net Pharmacy Till Receipt</span>
                <span>Counter 01</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Cashier:</span>
                <span className="font-semibold">{lastClosedShift.cashierName}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Expected Cash:</span>
                <span className="font-semibold">৳{lastClosedShift.expectedCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Counted Cash:</span>
                <span className="font-semibold text-[#524646]">৳{lastClosedShift.countedCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-[#524646] border-t border-gray-200 pt-2">
                <span>Transferred to Vault:</span>
                <span className="text-[#2D9F73]">৳{lastClosedShift.settledToVaultAmount.toLocaleString()}</span>
              </div>
              {lastClosedShift.discrepancy !== 0 && (
                <div className={`flex justify-between font-bold ${
                  lastClosedShift.discrepancy < 0 ? 'text-rose-600' : 'text-[#2D9F73]'
                }`}>
                  <span>Discrepancy:</span>
                  <span>{lastClosedShift.discrepancy < 0 ? '-' : '+'}৳{Math.abs(lastClosedShift.discrepancy).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-800 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Slip</span>
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 bg-[#3FB98C] hover:bg-[#2D9F73] text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
