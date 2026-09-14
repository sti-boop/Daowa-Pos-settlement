'use client';

import { usePosStore } from '@/store/pos-store';
import { Calculator } from 'lucide-react';

export default function TotalsPanel() {
  const getSubtotal = usePosStore((s) => s.getSubtotal);
  const getTotalItemDiscount = usePosStore((s) => s.getTotalItemDiscount);
  const getTotalInvoiceDiscount = usePosStore((s) => s.getTotalInvoiceDiscount);
  const getGrandTotal = usePosStore((s) => s.getGrandTotal);
  const getRoundingAdjustment = usePosStore((s) => s.getRoundingAdjustment);
  const getChangeAmount = usePosStore((s) => s.getChangeAmount);
  const getDueAmount = usePosStore((s) => s.getDueAmount);
  const deliveryCharge = usePosStore((s) => s.deliveryCharge);
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const receivedAmount = usePosStore((s) => s.receivedAmount);
  const splitPayments = usePosStore((s) => s.splitPayments);
  const discountEnabled = usePosStore((s) => s.discountEnabled);
  const discountType = usePosStore((s) => s.discountType);
  const discountValue = usePosStore((s) => s.discountValue);

  const subtotal = getSubtotal();
  const itemDiscount = getTotalItemDiscount();
  const invoiceDiscount = getTotalInvoiceDiscount();
  const totalDiscount = itemDiscount + invoiceDiscount;
  const rounding = getRoundingAdjustment();
  const grandTotal = getGrandTotal();
  const change = getChangeAmount();
  const due = getDueAmount();
  const totalPaid = paymentMethod === 'split'
    ? splitPayments.reduce((s, sp) => s + sp.amount, 0)
    : ['bkash', 'nagad', 'card', 'rocket'].includes(paymentMethod)
      ? grandTotal
      : receivedAmount;

  return (
    <div className="rounded-2xl border border-[#B8E8D0] p-3 md:p-4 shadow-sm card-hover-lift" style={{ backgroundColor: '#EBF8F3' }}>
      <h3 className="text-[13px] font-bold text-[#2D5A45] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <Calculator className="h-4 w-4 text-[#2D9F73]" /> Invoice Total
      </h3>
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-[#3D6B55]">Subtotal</span>
          <span className="font-semibold text-[#1A3D2E] tabular-nums">৳{subtotal.toFixed(2)}</span>
        </div>
        {itemDiscount > 0 && (
          <div className="flex justify-between">
            <span className="text-amber-700 font-medium">{discountType === 'percentage' && discountEnabled ? `Discount (${discountValue}%)` : 'Item Discount'}</span>
            <span className="font-semibold text-amber-700 tabular-nums">-৳{itemDiscount.toFixed(2)}</span>
          </div>
        )}
        {invoiceDiscount > 0 && (
          <div className="flex justify-between">
            <span className="text-amber-700 font-medium">Fixed Discount</span>
            <span className="font-semibold text-amber-700 tabular-nums">-৳{invoiceDiscount.toFixed(2)}</span>
          </div>
        )}
        {deliveryCharge > 0 && (
          <div className="flex justify-between">
            <span className="text-[#3D6B55]">Delivery</span>
            <span className="font-semibold text-[#1A3D2E] tabular-nums">+৳{deliveryCharge.toFixed(2)}</span>
          </div>
        )}
        {rounding !== 0 && (
          <div className="flex justify-between">
            <span className="text-[#3D6B55]">Rounding</span>
            <span className={`font-semibold tabular-nums ${rounding >= 0 ? 'text-[#2D9F73]' : 'text-red-500'}`}>
              {rounding >= 0 ? '+' : ''}৳{rounding.toFixed(2)}
            </span>
          </div>
        )}
        <div className="border-t border-[#9DD4B8] pt-2.5 flex justify-between">
          <span className="font-bold text-[15px] text-[#0F5132]">Grand Total</span>
          <span className="font-extrabold text-[17px] text-[#0F5132] tabular-nums">৳{grandTotal.toFixed(2)}</span>
        </div>
        {totalPaid > 0 && (
          <div className="flex justify-between">
            <span className="text-[#3D6B55]">Paid</span>
            <span className="font-semibold text-[#1A3D2E] tabular-nums">৳{totalPaid.toFixed(2)}</span>
          </div>
        )}
        {change > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold text-[#4169E1]">Change</span>
            <span className="font-bold text-[#4169E1] tabular-nums">৳{change.toFixed(2)}</span>
          </div>
        )}
        {due > 0 && (
          <div className="flex justify-between">
            <span className="text-red-700 font-medium">Due</span>
            <span className="font-bold text-red-700 tabular-nums">৳{due.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
