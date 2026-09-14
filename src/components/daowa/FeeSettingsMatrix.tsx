'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  Check, 
  RotateCcw, 
  Truck, 
  Smartphone, 
  CreditCard,
  Percent,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { SystemFeeSettings, CourierFeeConfig, MFSFeeConfig, CardFeeConfig } from '@/lib/types';

interface FeeSettingsMatrixProps {
  fees: SystemFeeSettings | null;
  onSaveFees: (fees: SystemFeeSettings) => Promise<void>;
  isProcessing: boolean;
}

export const FeeSettingsMatrix: React.FC<FeeSettingsMatrixProps> = ({
  fees,
  onSaveFees,
  isProcessing,
}) => {
  const [formData, setFormData] = useState<SystemFeeSettings | null>(fees);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Modals / forms for adding new services
  const [isAddingCourier, setIsAddingCourier] = useState<boolean>(false);
  const [newCourierName, setNewCourierName] = useState<string>('');
  const [newCourierInside, setNewCourierInside] = useState<number>(70);
  const [newCourierOutside, setNewCourierOutside] = useState<number>(130);
  const [newCourierCod, setNewCourierCod] = useState<number>(1.0);
  const [newCourierReturn, setNewCourierReturn] = useState<number>(50);

  const [isAddingMfs, setIsAddingMfs] = useState<boolean>(false);
  const [newMfsProvider, setNewMfsProvider] = useState<string>('');
  const [newMfsAccount, setNewMfsAccount] = useState<string>('');
  const [newMfsFee, setNewMfsFee] = useState<number>(1.15);
  const [newMfsInterval, setNewMfsInterval] = useState<number>(24);

  useEffect(() => {
    if (fees) {
      setFormData(JSON.parse(JSON.stringify(fees)));
    }
  }, [fees]);

  if (!formData) {
    return <div className="p-8 text-center text-gray-500">Loading fee rules matrix...</div>;
  }

  const handleCourierChange = (index: number, field: keyof CourierFeeConfig, val: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      const updated = [...prev.couriers];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, couriers: updated };
    });
  };

  const handleAddCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName.trim()) return;

    setFormData(prev => {
      if (!prev) return prev;
      const exists = prev.couriers.some(c => c.courierName.toLowerCase() === newCourierName.trim().toLowerCase());
      if (exists) return prev;

      const newEntry: CourierFeeConfig = {
        courierName: newCourierName.trim(),
        baseDeliveryFeeInside: Number(newCourierInside),
        baseDeliveryFeeOutside: Number(newCourierOutside),
        codFeePercent: Number(newCourierCod),
        returnCharge: Number(newCourierReturn),
        isActive: true,
      };
      return {
        ...prev,
        couriers: [...prev.couriers, newEntry],
      };
    });

    setNewCourierName('');
    setIsAddingCourier(false);
  };

  const handleRemoveCourier = (idx: number) => {
    setFormData(prev => {
      if (!prev || prev.couriers.length <= 1) return prev;
      return {
        ...prev,
        couriers: prev.couriers.filter((_, i) => i !== idx),
      };
    });
  };

  const handleMfsChange = (index: number, field: keyof MFSFeeConfig, val: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      const updated = [...prev.mfs];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, mfs: updated };
    });
  };

  const handleAddMfs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMfsProvider.trim()) return;

    setFormData(prev => {
      if (!prev) return prev;
      const exists = prev.mfs.some(m => m.provider.toLowerCase() === newMfsProvider.trim().toLowerCase());
      if (exists) return prev;

      const newEntry: MFSFeeConfig = {
        provider: newMfsProvider.trim(),
        feePercent: Number(newMfsFee),
        autoSettle: false,
        settleIntervalHours: Number(newMfsInterval),
        accountNumber: newMfsAccount.trim() || `${newMfsProvider.trim()} Merchant Gateway`,
      };
      return {
        ...prev,
        mfs: [...prev.mfs, newEntry],
      };
    });

    setNewMfsProvider('');
    setNewMfsAccount('');
    setIsAddingMfs(false);
  };

  const handleRemoveMfs = (idx: number) => {
    setFormData(prev => {
      if (!prev || prev.mfs.length <= 1) return prev;
      return {
        ...prev,
        mfs: prev.mfs.filter((_, i) => i !== idx),
      };
    });
  };

  const handleCardChange = (index: number, field: keyof CardFeeConfig, val: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      const updated = [...prev.cards];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, cards: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      await onSaveFees(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-[#3FB98C]/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#3FB98C]/20">
              Admin Commission Matrix
            </span>
            <span className="text-xs text-white/80">Live Fee Engine</span>
          </div>
          <h2 className="text-xl font-bold">Fee & Commission Matrix Settings</h2>
          <p className="text-xs text-white/80">
            Configure delivery fees, COD commissions, and gateway deductions for couriers, MFS, and bank cards. Add new third-party couriers and MFS providers at any time.
          </p>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold px-5 py-3 rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center space-x-2 text-xs"
        >
          {isSaved ? <Check className="w-4 h-4 text-[#2D9F73]" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Rules Saved & Active!' : 'Save Fee Rules'}</span>
        </button>
      </div>

      {/* Section 1: Couriers */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-[#2D9F73]" />
            <div>
              <h3 className="font-bold text-[#524646] text-sm">Third-Party Courier Charges & COD Commission</h3>
              <p className="text-xs text-gray-500">Base delivery charge and Cash-on-Delivery (COD) % withheld by courier partner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingCourier(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#3FB98C]/5 hover:bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15 rounded-lg text-xs font-bold transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Courier Service</span>
          </button>
        </div>

        {/* Add Courier Modal / Inline Box */}
        {isAddingCourier && (
          <div className="bg-[#3FB98C]/5 border border-[#3FB98C]/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2D9F73] text-xs">Add New Third-Party Courier Service</span>
              <button 
                type="button" 
                onClick={() => setIsAddingCourier(false)}
                className="text-[#2D9F73] hover:text-[#2D9F73]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Courier Name</label>
                <input
                  type="text"
                  placeholder="e.g. eCourier, Paperfly, Sundarban"
                  value={newCourierName}
                  onChange={(e) => setNewCourierName(e.target.value)}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Inside Dhaka (৳)</label>
                <input
                  type="number"
                  value={newCourierInside}
                  onChange={(e) => setNewCourierInside(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Outside Dhaka (৳)</label>
                <input
                  type="number"
                  value={newCourierOutside}
                  onChange={(e) => setNewCourierOutside(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">COD Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newCourierCod}
                  onChange={(e) => setNewCourierCod(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Return Charge (৳)</label>
                <input
                  type="number"
                  value={newCourierReturn}
                  onChange={(e) => setNewCourierReturn(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCourier(false)}
                className="px-3 py-1.5 bg-[#FCF2E5]/40 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCourier}
                disabled={!newCourierName.trim()}
                className="px-4 py-1.5 bg-[#2D9F73] hover:bg-[#3FB98C] text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
              >
                Confirm & Add Courier
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Courier Partner</th>
                <th className="px-4 py-3">Delivery Inside Dhaka (৳)</th>
                <th className="px-4 py-3">Delivery Outside Dhaka (৳)</th>
                <th className="px-4 py-3">COD Commission (%)</th>
                <th className="px-4 py-3">Return Courier Fee (৳)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formData.couriers.map((courier, idx) => (
                <tr key={courier.courierName} className="hover:bg-[#FCF2E5]/40/50">
                  <td className="px-4 py-3 font-bold text-[#524646]">
                    {courier.courierName}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={courier.baseDeliveryFeeInside}
                      onChange={(e) => handleCourierChange(idx, 'baseDeliveryFeeInside', Number(e.target.value))}
                      className="w-24 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={courier.baseDeliveryFeeOutside}
                      onChange={(e) => handleCourierChange(idx, 'baseDeliveryFeeOutside', Number(e.target.value))}
                      className="w-24 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.1"
                        value={courier.codFeePercent}
                        onChange={(e) => handleCourierChange(idx, 'codFeePercent', Number(e.target.value))}
                        className="w-20 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                      />
                      <span className="text-gray-500 font-bold">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={courier.returnCharge}
                      onChange={(e) => handleCourierChange(idx, 'returnCharge', Number(e.target.value))}
                      className="w-24 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {formData.couriers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCourier(idx)}
                        className="p-1 text-[#A8A492] hover:text-rose-600 transition"
                        title="Remove Courier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: MFS Gateways */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-[#2D9F73]" />
            <div>
              <h3 className="font-bold text-[#524646] text-sm">Mobile Financial Services (MFS) Transaction Fee & Schedule</h3>
              <p className="text-xs text-gray-500">Merchant gateway deduction rate and automatic settlement frequency</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingMfs(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#3FB98C]/5 hover:bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15 rounded-lg text-xs font-bold transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add MFS Service</span>
          </button>
        </div>

        {/* Add MFS Modal / Inline Box */}
        {isAddingMfs && (
          <div className="bg-[#3FB98C]/70 border border-[#3FB98C]/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2D9F73] text-xs">Add New Mobile Financial Service (MFS)</span>
              <button 
                type="button" 
                onClick={() => setIsAddingMfs(false)}
                className="text-[#2D9F73] hover:text-[#2D9F73]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">MFS Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cellfin, Tap, OK Wallet, MCash"
                  value={newMfsProvider}
                  onChange={(e) => setNewMfsProvider(e.target.value)}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Merchant Account Number</label>
                <input
                  type="text"
                  placeholder="01811-998877 (Merchant)"
                  value={newMfsAccount}
                  onChange={(e) => setNewMfsAccount(e.target.value)}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-mono focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Gateway Fee (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={newMfsFee}
                  onChange={(e) => setNewMfsFee(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-bold focus:ring-1 focus:ring-[#3FB98C]/40"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#2D9F73] block mb-1">Auto-Settlement</label>
                <select
                  value={newMfsInterval}
                  onChange={(e) => setNewMfsInterval(Number(e.target.value))}
                  className="w-full bg-white border border-[#3FB98C]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] font-medium focus:ring-1 focus:ring-[#3FB98C]/40"
                >
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours (Daily)</option>
                  <option value={48}>Every 48 Hours</option>
                  <option value={0}>Manual Only</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingMfs(false)}
                className="px-3 py-1.5 bg-[#FCF2E5]/40 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMfs}
                disabled={!newMfsProvider.trim()}
                className="px-4 py-1.5 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold rounded-lg text-xs disabled:opacity-50"
              >
                Confirm & Add MFS
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">MFS Provider</th>
                <th className="px-4 py-3">Merchant Number</th>
                <th className="px-4 py-3">Gateway Fee (%)</th>
                <th className="px-4 py-3">Auto-Settlement Interval</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formData.mfs.map((mfs, idx) => (
                <tr key={mfs.provider} className="hover:bg-[#FCF2E5]/40/50">
                  <td className="px-4 py-3 font-bold text-[#524646]">
                    {mfs.provider}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={mfs.accountNumber}
                      onChange={(e) => handleMfsChange(idx, 'accountNumber', e.target.value)}
                      className="w-48 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.05"
                        value={mfs.feePercent}
                        onChange={(e) => handleMfsChange(idx, 'feePercent', Number(e.target.value))}
                        className="w-20 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                      />
                      <span className="text-gray-500 font-bold">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={mfs.settleIntervalHours}
                      onChange={(e) => handleMfsChange(idx, 'settleIntervalHours', Number(e.target.value))}
                      className="bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-[#524646] focus:ring-1 focus:ring-[#3FB98C]/40 font-medium"
                    >
                      <option value={12}>Every 12 Hours</option>
                      <option value={24}>Every 24 Hours (Daily)</option>
                      <option value={48}>Every 48 Hours</option>
                      <option value={0}>Manual Only</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {formData.mfs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMfs(idx)}
                        className="p-1 text-[#A8A492] hover:text-rose-600 transition"
                        title="Remove MFS Provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Card Gateways */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <CreditCard className="w-5 h-5 text-[#2D9F73]" />
          <div>
            <h3 className="font-bold text-[#524646] text-sm">Credit & Debit Card Merchant Rates</h3>
            <p className="text-xs text-gray-500">POS terminal merchant discount rates (MDR)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Card Channel</th>
                <th className="px-4 py-3">Terminal / Merchant ID</th>
                <th className="px-4 py-3">MDR Processing Fee (%)</th>
                <th className="px-4 py-3">Bank Credit Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formData.cards.map((card, idx) => (
                <tr key={card.provider} className="hover:bg-[#FCF2E5]/40/50">
                  <td className="px-4 py-3 font-bold text-[#524646]">
                    {card.provider}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={card.terminalId}
                      onChange={(e) => handleCardChange(idx, 'terminalId', e.target.value)}
                      className="w-36 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono text-gray-800 text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.05"
                        value={card.feePercent}
                        onChange={(e) => handleCardChange(idx, 'feePercent', Number(e.target.value))}
                        className="w-20 bg-[#FCF2E5]/40 border border-gray-300 rounded-lg px-2.5 py-1.5 font-bold text-[#524646] text-xs focus:ring-1 focus:ring-[#3FB98C]/40"
                      />
                      <span className="text-gray-500 font-bold">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-700 bg-[#FCF2E5]/40 px-2.5 py-1 rounded-md">
                      T+{card.payoutDays} Business Days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
};
