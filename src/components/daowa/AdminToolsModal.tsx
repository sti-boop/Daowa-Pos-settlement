'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  Building2,
  Layers,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { api, OverviewData } from '@/services/api';

interface AdminToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview: OverviewData | null;
  onRefresh: () => Promise<void>;
  onResetComplete?: () => void;
}

export const AdminToolsModal: React.FC<AdminToolsModalProps> = ({
  isOpen,
  onClose,
  overview,
  onRefresh,
  onResetComplete,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetDatabase = async () => {
    try {
      setIsResetting(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const res = await api.resetDatabase();
      setStatusMessage(res.message);
      await onRefresh();
      if (onResetComplete) onResetComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white text-[#524646] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 my-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#EC5B38] flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-[#524646] text-lg">Admin Testing & Database Tools</h3>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded-full uppercase border border-rose-300">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Wipe transaction test data and restore system to pristine baseline stats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A8A492] hover:text-gray-600 rounded-lg hover:bg-[#FCF2E5]/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Diagnostics Box */}
        {overview && (
          <div className="grid grid-cols-3 gap-2.5 bg-[#FCF2E5]/40 p-3 rounded-xl border border-gray-200 text-center text-xs">
            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[#A8A492] block text-[10px] uppercase font-bold">Recent Batches</span>
              <span className="text-lg font-black text-[#524646]">{overview.recentBatches.length}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[#A8A492] block text-[10px] uppercase font-bold">Register Till Cash</span>
              <span className="text-lg font-black text-amber-600">৳{overview.posDrawerCash.toLocaleString()}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
              <span className="text-[#A8A492] block text-[10px] uppercase font-bold">Bank Balance</span>
              <span className="text-lg font-black text-[#2D9F73]">৳{overview.bankBalance.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Reset Database Tool Card */}
        <div className="bg-[#EC5B38]/5/70 rounded-2xl p-5 border border-[#EC5B38]/20 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-[#EC5B38] text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-rose-950 text-sm">resetDatabase API Action</h4>
              <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                Clears all active and delivered orders, purges settlement batch records, and resets End-Of-Day register history so you can perform clean testing with fresh stats.
              </p>
            </div>
          </div>

          <div className="bg-white/90 p-3.5 rounded-xl border border-[#EC5B38]/20/80 text-xs text-gray-700 space-y-1.5">
            <div className="font-bold text-rose-950 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-rose-600" />
              <span>What this reset does:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Wipes all pending orders and delivery records across all channels</li>
              <li>Clears all historical settlement batch archives</li>
              <li>Resets POS Counter Register Till Cash to ৳5,000 opening float</li>
              <li>Reinitializes verified business bank accounts to baseline</li>
              <li>Starts a fresh EOD cashier register shift</li>
            </ul>
          </div>

          {statusMessage && (
            <div className="p-3 bg-[#3FB98C]/10 border border-[#3FB98C]/20 text-[#2D9F73] text-xs rounded-xl flex items-center space-x-2 font-semibold">
              <Check className="w-4 h-4 text-[#2D9F73] flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 text-xs rounded-xl flex items-center space-x-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-[#EC5B38] flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[#EC5B38] font-medium">
              Calls endpoint: <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold">POST /api/resetDatabase</code>
            </span>

            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#EC5B38] hover:bg-[#EC5B38]/90 text-white shadow-sm font-extrabold rounded-xl text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting System...' : 'Execute Database Reset'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 font-bold rounded-xl text-xs transition"
          >
            Close Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
};
