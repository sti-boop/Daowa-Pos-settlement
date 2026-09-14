'use client';

import { usePosStore } from '@/store/pos-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Percent, DollarSign } from 'lucide-react';

export default function DiscountSection() {
  const discountType = usePosStore((s) => s.discountType);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountEnabled = usePosStore((s) => s.discountEnabled);
  const setDiscountType = usePosStore((s) => s.setDiscountType);
  const setDiscountValue = usePosStore((s) => s.setDiscountValue);
  const setDiscountEnabled = usePosStore((s) => s.setDiscountEnabled);

  const cartItems = usePosStore((s) => s.cartItems);

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200/70 p-3 md:p-4 shadow-sm card-hover-lift h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-amber-500" /> Discount
        </h3>
        <button
          onClick={() => setDiscountEnabled(!discountEnabled)}
          disabled={cartItems.length === 0}
          className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${discountEnabled ? 'bg-amber-400' : 'bg-amber-100'}`}
          aria-label="Toggle discount"
        >
          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${discountEnabled ? 'translate-x-4' : ''}`} />
        </button>
      </div>

      {discountEnabled ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={() => setDiscountType('percentage')}
              className={`flex-1 h-8 rounded-lg text-xs font-medium ${discountType === 'percentage' ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-white/60 text-gray-600 hover:bg-white'}`}
            >
              <Percent className="h-3 w-3 mr-1" /> Percent
            </Button>
            <Button
              size="sm"
              onClick={() => setDiscountType('fixed')}
              className={`flex-1 h-8 rounded-lg text-xs font-medium ${discountType === 'fixed' ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-white/60 text-gray-600 hover:bg-white'}`}
            >
              <DollarSign className="h-3 w-3 mr-1" /> Fixed ৳
            </Button>
          </div>
          <Input
            type="number"
            min="0"
            value={discountValue || ''}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            placeholder={discountType === 'percentage' ? 'Enter % discount' : 'Enter ৳ discount'}
            className="h-9 text-sm font-semibold"
          />
          {discountType === 'percentage' && discountValue > 100 && (
            <p className="text-[10px] text-amber-600 font-medium">⚠ Discount exceeds 100%</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 py-2 text-center">No discount applied</p>
      )}
    </div>
  );
}
