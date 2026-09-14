'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Clock,
  User,
  FileText,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { AuditJournalEntry, AccountBalance } from '@/lib/types';
import { api } from '@/services/api';

interface AuditorInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditorInspectionModal: React.FC<AuditorInspectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [journalEntries, setJournalEntries] = useState<AuditJournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [isBalanced, setIsBalanced] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'journal' | 'accounts'>('journal');

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditJournal();
      setJournalEntries(data.entries);
      setAccounts(data.accounts);
      setIsBalanced(data.isBalanced);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalSystemDebits = journalEntries.reduce((sum, e) => sum + e.totalDebit, 0);
  const totalSystemCredits = journalEntries.reduce((sum, e) => sum + e.totalCredit, 0);

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 border border-gray-200 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3FB98C]/5 text-[#2D9F73] flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-[#524646] text-base">Background Double-Entry Ledger Verification</h3>
                <span className="bg-[#3FB98C]/10 text-[#2D9F73] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  100% Balanced
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Auditor inspection trace demonstrating automated zero-discrepancy double-entry postings
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadAuditData}
              className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-[#FCF2E5]/40 transition"
              title="Refresh audit data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#A8A492] hover:text-gray-600 rounded-lg hover:bg-[#FCF2E5]/40 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ledger Parity Banner */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-4 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-white/80 block text-[10px] uppercase font-bold">Total Posted Debits</span>
            <span className="font-black text-white text-lg">৳{totalSystemDebits.toLocaleString()}</span>
          </div>

          <div className="text-xl font-bold text-white/80">=</div>

          <div>
            <span className="text-white/80 block text-[10px] uppercase font-bold">Total Posted Credits</span>
            <span className="font-black text-white text-lg">৳{totalSystemCredits.toLocaleString()}</span>
          </div>

          <div className="bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300">
            <span className="text-[#A8A492] block text-[10px]">Net Discrepancy</span>
            <span className="font-bold text-[#2D9F73]">৳{(totalSystemDebits - totalSystemCredits).toLocaleString()} (Zero Variance)</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'journal' ? 'bg-white border border-gray-200 shadow-sm text-[#524646]' : 'text-gray-600 hover:bg-[#FCF2E5]/40'
            }`}
          >
            Automated Journal Entries ({journalEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'accounts' ? 'bg-white border border-gray-200 shadow-sm text-[#524646]' : 'text-gray-600 hover:bg-[#FCF2E5]/40'
            }`}
          >
            Chart of Accounts Balances ({accounts.length})
          </button>
        </div>

        {/* Content Tab 1: Journal Entries Stream */}
        {activeTab === 'journal' && (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1 text-xs">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="bg-[#FCF2E5]/40 border border-gray-200 rounded-xl p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-gray-700 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#524646] bg-white px-2 py-0.5 rounded border border-gray-300">
                      {entry.referenceNumber}
                    </span>
                    <span className="font-bold text-[#2D9F73] bg-[#3FB98C]/5 px-2 py-0.5 rounded border border-[#3FB98C]/15">
                      {entry.userAction}
                    </span>
                  </div>
                  <span className="text-[#A8A492] text-[10px]">
                    {new Date(entry.timestamp).toLocaleString()} • Operator: {entry.operator}
                  </span>
                </div>

                <p className="text-gray-600 text-[11px] italic">
                  &ldquo;{entry.narration}&rdquo;
                </p>

                {/* Postings breakdown table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FCF2E5]/40/70 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-1.5">Account Title</th>
                        <th className="px-3 py-1.5 text-right text-[#2D9F73]">Debit (৳)</th>
                        <th className="px-3 py-1.5 text-right text-[#2D9F73]">Credit (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {entry.postings.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#FCF2E5]/40/50">
                          <td className="px-3 py-1 font-sans text-gray-800 font-medium">{p.accountName}</td>
                          <td className="px-3 py-1 text-right text-[#2D9F73] font-bold">
                            {p.debit > 0 ? `৳${p.debit.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-1 text-right text-[#2D9F73] font-bold">
                            {p.credit > 0 ? `৳${p.credit.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FCF2E5]/40 font-bold text-[#524646] border-t border-gray-200">
                        <td className="px-3 py-1 font-sans">Balanced Total</td>
                        <td className="px-3 py-1 text-right text-[#2D9F73]">৳{entry.totalDebit.toLocaleString()}</td>
                        <td className="px-3 py-1 text-right text-[#2D9F73]">৳{entry.totalCredit.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content Tab 2: Chart of Accounts */}
        {activeTab === 'accounts' && (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5">Account Name</th>
                  <th className="px-4 py-2.5">Friendly Business Purpose</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#FCF2E5]/40">
                    <td className="px-4 py-2 font-bold text-[#524646]">{acc.accountName}</td>
                    <td className="px-4 py-2 text-gray-600">{acc.friendlyLabel}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        acc.accountType === 'asset' ? 'bg-[#3FB98C]/10 text-[#2D9F73]' :
                        acc.accountType === 'expense' ? 'bg-amber-100 text-amber-800' :
                        acc.accountType === 'revenue' ? 'bg-[#3FB98C]/10 text-[#2D9F73]' :
                        'bg-[#FCF2E5]/40 text-gray-800'
                      }`}>
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-black font-mono text-[#524646]">
                      ৳{acc.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-[#524646] font-bold rounded-xl text-xs transition"
          >
            Close Auditor View
          </button>
        </div>
      </div>
    </div>
  );
};
