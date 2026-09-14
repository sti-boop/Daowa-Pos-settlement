'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Building2,
  Globe,
  Store,
  CreditCard,
  Pill,
  Truck,
  Bike,
  Smartphone,
  Banknote,
  Calendar,
  User,
  Phone,
  FileText,
  Coins,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { HealthcareOrder, BusinessBankAccount } from '@/lib/types';

interface OrderDetailsSettlementModalProps {
  order: HealthcareOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSettleOrder: (orderId: string, bankAccountId?: string) => Promise<void>;
  bankAccounts: BusinessBankAccount[];
  isProcessing: boolean;
}

export const OrderDetailsSettlementModal: React.FC<OrderDetailsSettlementModalProps> = ({
  order,
  isOpen,
  onClose,
  onSettleOrder,
  bankAccounts,
  isProcessing,
}) => {
  const defaultBank = bankAccounts.find((b) => b.isDefault) || bankAccounts[0];
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank?.id || '');
  const [isSettling, setIsSettling] = useState(false);

  if (!isOpen || !order) return null;

  // Determine online vs offline
  const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
  const saleTypeLabel = isOnline ? 'Online Sale' : 'Offline Sale';

  // Calculate fees & net
  let fee = 0;
  let feeDescription = 'No channel processing fee';

  if (order.deliveryType === 'third_party_courier') {
    const codPercent = 1.0;
    // COD = 1% of total collectable (product + delivery charge courier collects from customer)
    const collectableAmount = order.totalAmount + (order.deliveryFee || 0) + (order.companyBorneDeliveryCharge || 0);
    const codFee = Math.round((collectableAmount * codPercent) / 100);
    const companyBorne = order.companyBorneDeliveryCharge || 0;
    // Fee = companyBorneDeliveryCharge (free delivery expense) + COD only
    // deliveryFee doesn't touch company for third-party courier
    fee = companyBorne + codFee;
    feeDescription = `Courier Shipping (৳${order.deliveryFee}${companyBorne > 0 ? ` + company-borne ৳${companyBorne}` : ''}) + COD Collection Fee 1% of collectable ৳${collectableAmount} (৳${codFee})`;
  } else if (order.paymentMethod.startsWith('card_')) {
    fee = Math.round((order.totalAmount * 2.0) / 100);
    feeDescription = `Card Gateway Processing Fee (2.0%)`;
  } else if (['bkash', 'nagad', 'rocket', 'upay'].includes(order.paymentMethod.toLowerCase())) {
    fee = Math.round((order.totalAmount * 1.15) / 100);
    feeDescription = `MFS Merchant Cash-In Fee (1.15%)`;
  }

  const netToDeposit = order.totalAmount - fee;
  const chosenBank = bankAccounts.find((b) => b.id === (selectedBankId || defaultBank?.id)) || defaultBank;

  const handleConfirmSettle = async () => {
    try {
      setIsSettling(true);
      await onSettleOrder(order.id, chosenBank?.id);
      onClose();
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white text-[#524646] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 my-8 animate-in fade-in">
        {/* Header with Sale Type Indicator */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-[#524646] text-lg">{order.orderNumber}</span>

              {/* Distinct Online vs Offline Sale Badge */}
              {isOnline ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                  <Globe className="w-3.5 h-3.5 text-[#2D9F73]" />
                  <span>ONLINE SALE</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                  <Store className="w-3.5 h-3.5 text-[#2D9F73]" />
                  <span>OFFLINE SALE</span>
                </span>
              )}

              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                order.status === 'cleared'
                  ? 'bg-[#3FB98C]/5 text-[#2D9F73] border border-[#3FB98C]/15'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {order.status === 'cleared' ? 'Settled' : 'Pending Settlement'}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>Created: {new Date(order.createdAt).toLocaleString()}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#A8A492] hover:text-gray-600 rounded-lg hover:bg-[#FCF2E5]/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Fulfillment Info Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FCF2E5]/40 p-3.5 rounded-xl border border-gray-200 text-xs">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-[#A8A492]" /> Customer / Patient Info
            </div>
            <div className="font-bold text-[#524646] text-sm">{order.customerName}</div>
            <div className="text-gray-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#A8A492]" />
              <span>{order.customerPhone}</span>
            </div>
            {order.notes && (
              <div className="text-[11px] text-gray-500 italic bg-white px-2 py-1 rounded border border-gray-200/80">
                &ldquo;{order.notes}&rdquo;
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:border-l sm:border-gray-200 sm:pl-3">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#A8A492]" /> Fulfillment Channel
            </div>
            <div className="flex items-center space-x-1.5 font-bold text-gray-800">
              {order.deliveryType === 'third_party_courier' && <Truck className="w-3.5 h-3.5 text-[#2D9F73]" />}
              {order.deliveryType === 'own_rider' && <Bike className="w-3.5 h-3.5 text-amber-600" />}
              {order.deliveryType === 'pos_counter' && <Store className="w-3.5 h-3.5 text-[#2D9F73]" />}
              <span className="capitalize">{order.deliveryType.replace(/_/g, ' ')}</span>
            </div>
            {order.courierName && (
              <div className="text-gray-600">
                Courier: <span className="font-semibold text-gray-800">{order.courierName}</span>
                {order.consignmentId && <span className="text-[10px] text-gray-500 block">Tracking: {order.consignmentId}</span>}
              </div>
            )}
            {order.riderName && (
              <div className="text-gray-600">
                Assigned Rider: <span className="font-semibold text-gray-800">{order.riderName}</span>
              </div>
            )}
            <div className="text-gray-600">
              Payment Method: <span className="font-bold uppercase text-gray-800">{order.paymentMethod.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Prescription Medicine Items Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1">
              <Pill className="w-3.5 h-3.5 text-[#2D9F73]" />
              Prescription Medicines Billed ({order.items.length})
            </span>
            <span className="text-gray-500">Item Total: ৳{order.productAmount.toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2">Medicine & Generic</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#FCF2E5]/40/60">
                    <td className="px-3 py-2">
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-[10px] text-[#A8A492]">{item.genericName}</div>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">৳{item.unitPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#524646]">৳{(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial & Settlement Audit Details */}
        <div className="bg-white border border-gray-200 shadow-sm text-[#524646] p-4 rounded-xl space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Financial Settlement Calculation</span>
            <span className="text-[10px] text-[#2D9F73] font-normal">Audit Verified</span>
          </div>

          <div className="space-y-1 text-xs divide-y divide-gray-200">
            <div className="flex justify-between py-1 text-gray-500">
              <span>Gross Medicine Amount:</span>
              <span className="font-bold text-[#524646]">৳{order.productAmount.toLocaleString()}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between py-1 text-gray-500">
                <span>Shipping / Delivery Fee:</span>
                <span className="font-bold text-[#524646]">৳{order.deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-1 text-gray-500">
              <span>Total Billable to Customer:</span>
              <span className="font-black text-[#524646] text-sm">৳{order.totalAmount.toLocaleString()}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between py-1 text-[#EC5B38]">
                <span>Deductions ({feeDescription}):</span>
                <span className="font-bold">-৳{fee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-base font-black text-[#2D9F73]">
              <span>Net Deposit to Business Bank:</span>
              <span className="text-lg">৳{netToDeposit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Business Bank Account Selection for Deposit */}
        {order.status === 'delivered_pending_payout' && (
          <div className="space-y-2 bg-[#FCF2E5]/40 p-3 rounded-xl border border-gray-200">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2D9F73]" />
              <span>Route Settlement Funds into Business Bank Account:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bankAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedBankId(acc.id)}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                    (selectedBankId || defaultBank?.id) === acc.id
                      ? 'bg-[#3FB98C]/5 border-[#3FB98C] ring-2 ring-[#3FB98C]/25 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#524646] text-xs flex items-center gap-1">
                      <span>{acc.bankName}</span>
                      {acc.isDefault && (
                        <span className="text-[9px] bg-[#3FB98C]/10 text-[#2D9F73] font-bold px-1.5 py-0.2 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      #{acc.accountNumber} • {acc.branchName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#A8A492]">Current Bal</div>
                    <div className="font-bold text-xs text-[#524646]">৳{acc.balance.toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 font-bold rounded-xl text-xs transition"
          >
            Close Details
          </button>

          {order.status === 'delivered_pending_payout' && (
            <button
              type="button"
              onClick={handleConfirmSettle}
              disabled={isProcessing || isSettling}
              className="px-5 py-2.5 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold rounded-xl text-xs transition flex items-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSettling ? 'Settling Funds...' : `Deposit ৳${netToDeposit.toLocaleString()} to ${chosenBank?.bankName || 'Bank'}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
