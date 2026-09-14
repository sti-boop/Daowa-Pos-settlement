'use client';

import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Truck, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Info,
  ShieldCheck,
  Percent,
  Clock,
  MapPin,
  Building2,
  RefreshCw
} from 'lucide-react';
import { SystemFeeSettings, MFSFeeConfig, CourierFeeConfig } from '@/lib/types';

interface ServiceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  fees: SystemFeeSettings | null;
  onRefreshFees: () => Promise<void>;
}

export const ServiceManagementModal: React.FC<ServiceManagementModalProps> = ({
  isOpen,
  onClose,
  fees,
  onRefreshFees,
}) => {
  const [activeTab, setActiveTab] = useState<'mfs' | 'courier'>('mfs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // MFS Form State
  const [mfsName, setMfsName] = useState('');
  const [mfsFee, setMfsFee] = useState('1.20');
  const [mfsAccount, setMfsAccount] = useState('');
  const [mfsInterval, setMfsInterval] = useState('24');

  // Courier Form State
  const [courierName, setCourierName] = useState('');
  const [courierInsideFee, setCourierInsideFee] = useState('70');
  const [courierOutsideFee, setCourierOutsideFee] = useState('130');
  const [courierCodFee, setCourierCodFee] = useState('1.0');
  const [courierReturnCharge, setCourierReturnCharge] = useState('50');

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setErrorMsg(null);
    }
    setTimeout(() => {
      setErrorMsg(null);
      setSuccessMsg(null);
    }, 4000);
  };

  const handleAddMfs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfsName.trim()) {
      showNotification('Please provide a provider name (e.g., SureCash, Tap, OK Wallet).', true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/services/mfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: mfsName.trim(),
          feePercent: parseFloat(mfsFee) || 1.2,
          accountNumber: mfsAccount.trim() || `${mfsName.trim()} Merchant Wallet`,
          settleIntervalHours: parseInt(mfsInterval, 10) || 24,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add MFS service.');
      }

      showNotification(data.message || `MFS service ${mfsName} added successfully!`);
      setMfsName('');
      setMfsAccount('');
      setMfsFee('1.20');
      setMfsInterval('24');
      await onRefreshFees();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMfs = async (provider: string) => {
    if (!window.confirm(`Are you sure you want to remove ${provider} from active MFS services?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/services/mfs/${encodeURIComponent(provider)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove MFS service.');
      }

      showNotification(data.message || `${provider} removed successfully.`);
      await onRefreshFees();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim()) {
      showNotification('Please provide a courier service name (e.g., Paperfly, eCourier, Sundarban).', true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/services/courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierName: courierName.trim(),
          baseDeliveryFeeInside: parseFloat(courierInsideFee) || 70,
          baseDeliveryFeeOutside: parseFloat(courierOutsideFee) || 130,
          codFeePercent: parseFloat(courierCodFee) || 1.0,
          returnCharge: parseFloat(courierReturnCharge) || 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add courier service.');
      }

      showNotification(data.message || `Courier service ${courierName} added successfully!`);
      setCourierName('');
      setCourierInsideFee('70');
      setCourierOutsideFee('130');
      setCourierCodFee('1.0');
      setCourierReturnCharge('50');
      await onRefreshFees();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourier = async (cName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${cName} from active courier partners?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/services/courier/${encodeURIComponent(cName)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove courier service.');
      }

      showNotification(data.message || `${cName} removed successfully.`);
      await onRefreshFees();
    } catch (err: any) {
      showNotification(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mfsList = fees?.mfs || [];
  const courierList = fees?.couriers || [];

  return (
    <div id="service-management-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="service-management-modal-container"
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#3FB98C] rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">MFS & Courier Service Management</h2>
              <p className="text-xs text-white/80">
                Register new mobile payment gateways and third-party parcel logistics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-service-modal-btn"
            className="p-1.5 text-[#A8A492] hover:text-[#524646] rounded-lg transition hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#FCF2E5]/40 border-b border-gray-200 px-6 pt-3 flex space-x-2">
          <button
            onClick={() => setActiveTab('mfs')}
            id="tab-mfs-services-btn"
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'mfs'
                ? 'bg-white text-[#524646] border-t border-x border-gray-200 shadow-xs'
                : 'text-gray-600 hover:text-[#524646] hover:bg-[#FCF2E5]/40/60'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#2D9F73]" />
            <span>Mobile Financial Services (MFS)</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-[#3FB98C]/10 text-[#2D9F73] rounded-full font-black">
              {mfsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('courier')}
            id="tab-courier-services-btn"
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-2 ${
              activeTab === 'courier'
                ? 'bg-white text-[#524646] border-t border-x border-gray-200 shadow-xs'
                : 'text-gray-600 hover:text-[#524646] hover:bg-[#FCF2E5]/40/60'
            }`}
          >
            <Truck className="w-4 h-4 text-[#2D9F73]" />
            <span>Third-Party Courier Services</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-[#3FB98C]/10 text-[#2D9F73] rounded-full font-black">
              {courierList.length}
            </span>
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-[#EC5B38]/5 border border-[#EC5B38]/20 rounded-xl flex items-center space-x-2 text-xs text-[#EC5B38]">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-[#3FB98C]/5 border border-[#3FB98C]/15 rounded-xl flex items-center space-x-2 text-xs text-[#2D9F73]">
            <Check className="w-4 h-4 text-[#2D9F73] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'mfs' && (
            <div className="space-y-6">
              {/* Add New MFS Form */}
              <div className="bg-[#FCF2E5]/40 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-[#2D9F73]" />
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Add New MFS Provider
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#A8A492]">
                    Automatically initializes dedicated clearing ledger account
                  </span>
                </div>

                <form onSubmit={handleAddMfs} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Provider Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SureCash, Tap, OK Wallet"
                      value={mfsName}
                      onChange={(e) => setMfsName(e.target.value)}
                      required
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Gateway Fee Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        placeholder="1.20"
                        value={mfsFee}
                        onChange={(e) => setMfsFee(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium pr-8"
                      />
                      <Percent className="w-3.5 h-3.5 text-[#A8A492] absolute right-2.5 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Merchant Account #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 01711-234567 (Merchant)"
                      value={mfsAccount}
                      onChange={(e) => setMfsAccount(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      id="submit-add-mfs-btn"
                      className="w-full py-1.5 px-4 bg-[#3FB98C] hover:bg-[#2D9F73] text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow-xs disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Adding...' : 'Add MFS Service'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active MFS List Table */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Configured MFS Gateways ({mfsList.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">MFS Provider</th>
                        <th className="px-4 py-3">Commission Fee</th>
                        <th className="px-4 py-3">Merchant Wallet Number</th>
                        <th className="px-4 py-3">Clearing Ledger Account</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {mfsList.map((m) => (
                        <tr key={m.provider} className="hover:bg-[#FCF2E5]/40/70 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#3FB98C]"></span>
                              <span className="font-bold text-[#524646]">{m.provider}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-600">
                            {m.feePercent}%
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                            {m.accountNumber || 'General Merchant Account'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FCF2E5]/40 text-gray-700 text-[11px] font-medium border border-gray-200">
                              {m.provider} Clearing A/c
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteMfs(m.provider)}
                              disabled={isSubmitting || mfsList.length <= 1}
                              className="p-1.5 text-[#A8A492] hover:text-rose-600 hover:bg-[#EC5B38]/5 rounded-lg transition disabled:opacity-30"
                              title={mfsList.length <= 1 ? 'At least one MFS must remain' : `Remove ${m.provider}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courier' && (
            <div className="space-y-6">
              {/* Add New Courier Form */}
              <div className="bg-[#FCF2E5]/40 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-[#2D9F73]" />
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Add New Third-Party Courier Service
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#A8A492]">
                    Establishes parcel reconciliation and payout tracking
                  </span>
                </div>

                <form onSubmit={handleAddCourier} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Courier Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Paperfly, eCourier"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        required
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Inside City Fee (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="70"
                        value={courierInsideFee}
                        onChange={(e) => setCourierInsideFee(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Outside City Fee (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="130"
                        value={courierOutsideFee}
                        onChange={(e) => setCourierOutsideFee(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        COD Fee Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="1.0"
                        value={courierCodFee}
                        onChange={(e) => setCourierCodFee(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Return Fee (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="50"
                        value={courierReturnCharge}
                        onChange={(e) => setCourierReturnCharge(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      id="submit-add-courier-btn"
                      className="py-1.5 px-4 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Adding...' : 'Add Courier Service'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Couriers List Table */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Configured Courier Partners ({courierList.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Courier Partner</th>
                        <th className="px-4 py-3">Inside City (৳)</th>
                        <th className="px-4 py-3">Outside City (৳)</th>
                        <th className="px-4 py-3">COD Commission</th>
                        <th className="px-4 py-3">Return Charge</th>
                        <th className="px-4 py-3">Clearing Ledger Account</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {courierList.map((c) => (
                        <tr key={c.courierName} className="hover:bg-[#FCF2E5]/40/70 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#3FB98C]"></span>
                              <span className="font-bold text-[#524646]">{c.courierName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            ৳{c.baseDeliveryFeeInside}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            ৳{c.baseDeliveryFeeOutside}
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-600">
                            {c.codFeePercent}%
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-600">
                            ৳{c.returnCharge}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FCF2E5]/40 text-gray-700 text-[11px] font-medium border border-gray-200">
                              {c.courierName} Clearing A/c
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteCourier(c.courierName)}
                              disabled={isSubmitting || courierList.length <= 1}
                              className="p-1.5 text-[#A8A492] hover:text-rose-600 hover:bg-[#EC5B38]/5 rounded-lg transition disabled:opacity-30"
                              title={courierList.length <= 1 ? 'At least one courier must remain' : `Remove ${c.courierName}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FCF2E5]/40 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-[#2D9F73]" />
            <span>Zero accounting friction: All gateways post directly to their designated clearing accounts.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-white border border-gray-200 shadow-sm text-[#524646] rounded-lg font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
