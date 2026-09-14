'use client';

import React, { useState } from 'react';
import {
  Building2,
  Plus,
  X,
  Check,
  Trash2,
  Star,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Landmark,
  Wallet,
} from 'lucide-react';
import { BusinessBankAccount } from '@/lib/types';
import { api } from '@/services/api';

interface BusinessBankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BusinessBankAccount[];
  onRefresh: () => Promise<void>;
}

const PRESET_BANKS = [
  'Mutual Trust Bank Ltd (MTB)',
  'The City Bank PLC',
  'BRAC Bank PLC',
  'Dutch-Bangla Bank Ltd (DBBL)',
  'Eastern Bank Ltd (EBL)',
  'Islami Bank Bangladesh PLC',
  'Pubali Bank Ltd',
  'Prime Bank PLC',
  'Standard Chartered Bangladesh',
  'Sonali Bank PLC',
];

export const BusinessBankAccountsModal: React.FC<BusinessBankAccountsModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  onRefresh,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [bankName, setBankName] = useState(PRESET_BANKS[1]);
  const [customBankName, setCustomBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('100000');
  const [isDefault, setIsDefault] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalBankLiquidity = bankAccounts.reduce((sum, b) => sum + (b.balance || 0), 0);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const chosenName = bankName === 'Other' ? customBankName.trim() : bankName;
    if (!chosenName) {
      setActionError('Please enter a bank name.');
      return;
    }
    if (!accountNumber.trim()) {
      setActionError('Please enter an account number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.addBankAccount({
        bankName: chosenName,
        accountName: 'Daowa Healthcare Limited',
        accountNumber: accountNumber.trim(),
        branchName: branchName.trim() || 'Principal Branch',
        routingNumber: routingNumber.trim() || undefined,
        balance: Number(initialBalance) || 0,
        isDefault,
      });

      setActionSuccess(res.message);
      await onRefresh();
      setShowAddForm(false);
      setAccountNumber('');
      setBranchName('');
      setRoutingNumber('');
      setInitialBalance('50000');
      setIsDefault(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add bank account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setIsSubmitting(true);
      await api.setDefaultBankAccount(id);
      await onRefresh();
      setActionSuccess('Default settlement bank updated.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to set default bank account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (bankAccounts.length <= 1) {
      setActionError('Cannot delete the only business bank account.');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      setIsSubmitting(true);
      await api.deleteBankAccount(id);
      await onRefresh();
      setActionSuccess(`${name} removed successfully.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove bank account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white text-[#524646] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 my-8 animate-in fade-in">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#3FB98C]/10 text-[#2D9F73] flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#524646] text-lg">Business Bank Accounts Management</h3>
              <p className="text-xs text-gray-500">
                Manage commercial accounts for MFS, courier COD, and card payouts
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

        {/* Liquidity Overview Banner */}
        <div className="bg-white border border-gray-200 shadow-sm text-[#524646] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#A8A492] block">Total Combined Bank Liquidity:</span>
            <span className="text-2xl font-black text-[#2D9F73]">৳{totalBankLiquidity.toLocaleString()}</span>
            <div className="text-[11px] text-[#A8A492] mt-0.5">Across {bankAccounts.length} verified operating accounts</div>
          </div>

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setActionError(null);
              setActionSuccess(null);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold rounded-lg text-xs transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'View Bank List' : 'Add Business Bank Account'}</span>
          </button>
        </div>

        {/* Action Alerts */}
        {actionError && (
          <div className="p-3 bg-[#EC5B38]/5 border border-[#EC5B38]/20 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 bg-[#3FB98C]/5 border border-[#3FB98C]/15 text-[#2D9F73] text-xs rounded-xl flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#2D9F73] flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Add Bank Account Form */}
        {showAddForm ? (
          <form onSubmit={handleCreateAccount} className="space-y-4 bg-[#FCF2E5]/40 p-4 rounded-xl border border-gray-200 text-xs">
            <div className="font-bold text-gray-800 text-sm border-b border-gray-200 pb-2">
              New Business Bank Account Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Select Bank Name</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-medium focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                >
                  {PRESET_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Other">Other / Custom Bank</option>
                </select>
              </div>

              {bankName === 'Other' && (
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Enter Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Trust Bank Ltd"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-medium focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Account Number (Corporate)</label>
                <input
                  type="text"
                  placeholder="e.g. 110-234-9988-01"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-medium focus:ring-2 focus:ring-[#3FB98C] focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gulshan Corporate Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-medium focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Routing Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 150261234"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-medium focus:ring-2 focus:ring-[#3FB98C] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Opening Liquid Balance (৳)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-bold focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-[#2D9F73] rounded border-gray-300 focus:ring-[#3FB98C]"
                />
                <span className="text-xs font-semibold text-gray-700">
                  Set as primary default account for automatic courier & MFS payouts
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-[#FCF2E5]/40 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold rounded-lg transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Add Business Account'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Bank Accounts List */
          <div className="space-y-3">
            <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Active Registered Accounts ({bankAccounts.length})</span>
              <span className="text-[11px] text-[#A8A492]">Click star to switch default settlement recipient</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    account.isDefault
                      ? 'bg-[#3FB98C]/50 border-[#3FB98C]/20 ring-1 ring-[#3FB98C]/25'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#524646] text-sm">{account.bankName}</span>
                      {account.isDefault ? (
                        <span className="inline-flex items-center space-x-1 bg-[#3FB98C]/10 text-[#2D9F73] font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-[#3FB98C]/20">
                          <Star className="w-3 h-3 fill-[#3FB98C] text-[#2D9F73]" />
                          <span>PRIMARY DEFAULT</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(account.id)}
                          disabled={isSubmitting}
                          className="text-[10px] text-gray-500 hover:text-[#2D9F73] font-semibold underline decoration-dotted"
                        >
                          Make Default
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 font-mono">
                      A/C: <span className="font-bold text-gray-700">{account.accountNumber}</span> • {account.branchName}
                      {account.routingNumber && <span> (Routing: {account.routingNumber})</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[#A8A492] block uppercase font-medium">Available Balance</span>
                      <span className="font-black text-[#524646] text-base">
                        ৳{account.balance.toLocaleString()}
                      </span>
                    </div>

                    {!account.isDefault && bankAccounts.length > 1 && (
                      <button
                        onClick={() => handleDeleteAccount(account.id, account.bankName)}
                        disabled={isSubmitting}
                        className="p-2 text-[#A8A492] hover:text-rose-600 rounded-lg hover:bg-[#EC5B38]/5 transition"
                        title="Remove bank account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-[#524646] font-bold rounded-xl text-xs transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
