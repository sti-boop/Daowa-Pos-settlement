'use client';

import { useEffect } from 'react';
import { usePosStore } from '@/store/pos-store';
import { toast } from 'sonner';

export default function KeyboardShortcuts() {
  const cartItems = usePosStore((s) => s.cartItems);
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const setPaymentMethod = usePosStore((s) => s.setPaymentMethod);
  const setReceivedAmount = usePosStore((s) => s.setReceivedAmount);
  const getGrandTotal = usePosStore((s) => s.getGrandTotal);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      // F1 = Cash, F2 = bKash, F3 = Nagad, F4 = Card, F5 = Due, F6 = Split
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('cash'); toast.success('Cash payment'); }
      else if (e.key === 'F2') { e.preventDefault(); setPaymentMethod('bkash'); toast.success('bKash payment'); }
      else if (e.key === 'F3') { e.preventDefault(); setPaymentMethod('nagad'); toast.success('Nagad payment'); }
      else if (e.key === 'F4') { e.preventDefault(); setPaymentMethod('card'); toast.success('Card payment'); }
      else if (e.key === 'F5') { e.preventDefault(); setPaymentMethod('due'); toast.success('Due payment'); }
      else if (e.key === 'F6') { e.preventDefault(); setPaymentMethod('split'); toast.success('Split payment'); }
      else if (e.key === 'F9') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setReceivedAmount(Math.ceil(getGrandTotal()));
          toast.success(`Received ৳${Math.ceil(getGrandTotal()).toFixed(2)}`);
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setReceivedAmount(getGrandTotal());
          toast.success('Exact amount');
        }
      } else if (e.key === 'Escape' && cartItems.length > 0 && !e.shiftKey) {
        // Note: don't auto-clear cart on Escape, just show toast
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartItems.length, paymentMethod, setPaymentMethod, setReceivedAmount, getGrandTotal]);

  return null;
}
