'use client';

import { Loader2, ShoppingCart, User, Truck, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BkashIcon, NagadIcon, RocketIcon, CashIcon, CardIcon, DueIcon, SplitIcon } from '@/components/pos/PaymentIcons';

interface SaleConfirmationItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  itemDiscount: number;
  itemDiscountType: string;
  subtotal: number;
}

interface SplitPayment {
  method: string;
  amount: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  address?: string | null;
}

interface SaleConfirmationProps {
  customer: CustomerInfo | null;
  items: SaleConfirmationItem[];
  subtotal: number;
  totalDiscount: number;
  deliveryCharge: number;
  roundingAdjust: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  dueAmount: number;
  splitPayments: SplitPayment[];
  saleNote?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <CashIcon className="h-4 w-4" />,
  bkash: <BkashIcon className="h-4 w-auto" />,
  nagad: <NagadIcon className="h-4 w-auto" />,
  rocket: <RocketIcon className="h-4 w-auto" />,
  card: <CardIcon className="h-4 w-4" />,
  due: <DueIcon className="h-4 w-4" />,
  split: <SplitIcon className="h-4 w-4" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  card: 'Card',
  due: 'Due',
  split: 'Split',
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: 'bg-[#2D9F73]/15 text-[#2D9F73]',
  bkash: 'bg-pink-50 text-pink-700',
  nagad: 'bg-orange-50 text-orange-700',
  rocket: 'bg-purple-50 text-purple-700',
  card: 'bg-sky-100 text-sky-700',
  due: 'bg-red-100 text-red-700',
  split: 'bg-[#3FB98C]/15 text-[#2D7A65]',
};

export default function SaleConfirmation({
  customer,
  items,
  subtotal,
  totalDiscount,
  deliveryCharge,
  roundingAdjust,
  grandTotal,
  paymentMethod,
  receivedAmount,
  changeAmount,
  dueAmount,
  splitPayments,
  saleNote,
  onConfirm,
  onCancel,
  loading,
}: SaleConfirmationProps) {
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2D9F73] to-[#3FB98C] px-5 pt-5 pb-6">
          <div className="relative flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2.5 ring-4 ring-white/20">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-white tracking-tight">
              Confirm Sale
            </DialogTitle>
            <DialogDescription className="text-xs text-white/75 mt-0.5">
              Review the details before completing
            </DialogDescription>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Customer Info */}
          {customer && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="h-8 w-8 rounded-lg bg-[#2D9F73]/15 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-[#2D9F73]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{customer.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{customer.phone}{customer.address ? ` · ${customer.address}` : ''}</p>
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {totalItems} Item{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-gray-50 max-h-36 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-[10px] text-gray-400">
                      ৳{item.unitPrice.toFixed(2)} × {item.quantity}{item.unit}
                      {item.itemDiscount > 0 && (
                        <span className="text-red-400 ml-1">
                          -{item.itemDiscountType === 'percentage' ? `${item.itemDiscount}%` : `৳${item.itemDiscount.toFixed(2)}`}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-700 tabular-nums shrink-0">৳{item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-700 tabular-nums">৳{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-500 tabular-nums">-৳{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {deliveryCharge > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Delivery</span>
                <span className="font-medium text-gray-700 tabular-nums flex items-center gap-1">
                  <Truck className="h-3 w-3" /> ৳{deliveryCharge.toFixed(2)}
                </span>
              </div>
            )}
            {roundingAdjust !== 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Rounding</span>
                <span className={`font-medium tabular-nums ${roundingAdjust > 0 ? 'text-red-500' : 'text-[#2D9F73]'}`}>
                  {roundingAdjust > 0 ? '+' : ''}৳{roundingAdjust.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-1.5 border-t border-gray-100">
              <span className="font-bold text-gray-800">Grand Total</span>
              <span className="font-extrabold text-[#2D9F73] tabular-nums text-base">৳{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border border-gray-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Payment</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${PAYMENT_COLORS[paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                {PAYMENT_ICONS[paymentMethod]}
                {(PAYMENT_LABELS[paymentMethod] || paymentMethod).toUpperCase()}
              </span>
            </div>

            {paymentMethod === 'split' && splitPayments.length > 0 && (
              <div className="space-y-1">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500">{(PAYMENT_LABELS[sp.method] || sp.method)}</span>
                    <span className="font-medium text-gray-700 tabular-nums">৳{sp.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-bold text-gray-800 tabular-nums">৳{splitPayments.reduce((s, sp) => s + sp.amount, 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {paymentMethod !== 'due' && paymentMethod !== 'split' && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Received</span>
                <span className="font-medium text-gray-700 tabular-nums">৳{receivedAmount.toFixed(2)}</span>
              </div>
            )}

            {changeAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#4169E1]">Change</span>
                <span className="font-bold text-[#4169E1] tabular-nums">৳{changeAmount.toFixed(2)}</span>
              </div>
            )}

            {dueAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Due</span>
                <span className="font-bold text-red-600 tabular-nums">৳{dueAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Note */}
          {saleNote && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <FileText className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">{saleNote}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-1 flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#2D9F73] to-[#3FB98C] hover:from-[#238a62] hover:to-[#35a07a] text-white font-bold text-sm shadow-lg shadow-[#2D9F73]/25 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Processing…
              </>
            ) : (
              `Confirm ৳${grandTotal.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
