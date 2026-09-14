'use client';

import { usePosStore } from '@/store/pos-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { PAYMENT_ICON_CONFIG } from '@/components/pos/PaymentIcons';

const METHOD_IDS = ['cash', 'bkash', 'nagad', 'rocket', 'card', 'due', 'cod', 'split'] as const;

const SPLIT_METHODS = ['cash', 'bkash', 'nagad', 'rocket', 'card', 'cod'] as const;
type SplitMethod = typeof SPLIT_METHODS[number];

export default function PaymentSection() {
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const setPaymentMethod = usePosStore((s) => s.setPaymentMethod);
  const receivedAmount = usePosStore((s) => s.receivedAmount);
  const setReceivedAmount = usePosStore((s) => s.setReceivedAmount);
  const splitPayments = usePosStore((s) => s.splitPayments);
  const addSplitPayment = usePosStore((s) => s.addSplitPayment);
  const updateSplitPayment = usePosStore((s) => s.updateSplitPayment);
  const removeSplitPayment = usePosStore((s) => s.removeSplitPayment);
  const getGrandTotal = usePosStore((s) => s.getGrandTotal);

  const grandTotal = getGrandTotal();
  const isDigital = ['bkash', 'nagad', 'card', 'rocket'].includes(paymentMethod);
  const isCOD = paymentMethod === 'cod';
  const noReceivedNeeded = isDigital || paymentMethod === 'due' || isCOD;

  const handleQuickCash = (amt: number) => {
    setReceivedAmount(amt);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-3 md:p-4 shadow-sm card-hover-lift">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <CreditCard className="h-3.5 w-3.5 text-[#3FB98C]" /> Payment Method
      </h3>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {METHOD_IDS.map((id) => {
          const cfg = PAYMENT_ICON_CONFIG[id];
          if (!cfg) return null;
          const { Icon, label } = cfg;
          const active = paymentMethod === id;
          const isBrandIcon = id === 'bkash' || id === 'nagad' || id === 'rocket';
          return (
            <button
              key={id}
              onClick={() => setPaymentMethod(id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                active
                  ? 'border-[#3FB98C] bg-[#3FB98C]/10 shadow-sm scale-105'
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100'
              }`}
              title={label}
            >
              <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${cfg.containerClass} ${active ? 'ring-2 ring-[#3FB98C]/30' : ''}`}>
                {isBrandIcon ? (
                  <Icon className={cfg.iconClass} />
                ) : (
                  <Icon className={`${cfg.iconClass} ${active ? 'text-[#3FB98C]' : ''}`} />
                )}
              </div>
              <span className={`text-[10px] font-bold ${active ? 'text-[#3FB98C]' : 'text-gray-500'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      {paymentMethod === 'cash' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-400 uppercase w-12 shrink-0">Receive</Label>
            <Input
              type="number"
              min="0"
              value={receivedAmount || ''}
              onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-10 text-base font-bold tabular-nums"
            />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[100, 500, 1000, 2000].map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant="outline"
                onClick={() => handleQuickCash(amt)}
                className="h-7 text-[10px] font-semibold rounded-md border-gray-200 hover:bg-[#3FB98C]/5 hover:border-[#3FB98C]/30"
              >
                ৳{amt}
              </Button>
            ))}
          </div>
          {receivedAmount > 0 && (
            <div className="flex justify-between text-[11px] text-gray-500 pt-1">
              <span>Change:</span>
              <span className="font-bold text-[#2D9F73] tabular-nums">৳{Math.max(0, receivedAmount - grandTotal).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {isDigital && (
        <div className="p-3 rounded-xl bg-[#3FB98C]/5 border border-[#3FB98C]/15 text-center">
          <p className="text-xs text-gray-600">Auto-paid on confirmation</p>
          <p className="text-base font-bold text-[#3FB98C] tabular-nums">৳{grandTotal.toFixed(2)}</p>
        </div>
      )}

      {paymentMethod === 'due' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-xs text-amber-700">Customer will pay later</p>
          <p className="text-base font-bold text-amber-700 tabular-nums">৳{grandTotal.toFixed(2)}</p>
        </div>
      )}

      {isCOD && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
          <p className="text-xs text-amber-700">Cash on Delivery — courier collects ৳{grandTotal.toFixed(2)} from customer</p>
        </div>
      )}

      {paymentMethod === 'split' && (
        <div className="space-y-2">
          {splitPayments.map((sp, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <select
                value={sp.method}
                onChange={(e) => updateSplitPayment(idx, { method: e.target.value as SplitMethod, amount: sp.amount })}
                className="h-9 rounded-lg border border-gray-200 text-xs font-semibold px-2 bg-white"
              >
                {SPLIT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
              <Input
                type="number"
                min="0"
                value={sp.amount || ''}
                onChange={(e) => updateSplitPayment(idx, { method: sp.method, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="h-9 text-sm font-semibold tabular-nums flex-1"
              />
              <button
                onClick={() => removeSplitPayment(idx)}
                className="h-9 w-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addSplitPayment({ method: 'cash', amount: 0 })}
            className="w-full h-8 rounded-lg text-xs border-dashed border-gray-300 text-gray-500 hover:bg-[#3FB98C]/5"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Method
          </Button>
          <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            <span>Total Paid:</span>
            <span className="font-bold text-[#3FB98C] tabular-nums">৳{splitPayments.reduce((s, sp) => s + sp.amount, 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>Due:</span>
            <span className="font-bold text-red-500 tabular-nums">৳{Math.max(0, grandTotal - splitPayments.reduce((s, sp) => s + sp.amount, 0)).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
