'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { usePosStore, type CartItem } from '@/store/pos-store';
import { Pause, Play, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

// Minimal customer type for hold order restoration
interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  loyaltyPoints?: number;
}

interface HoldOrder {
  id: string;
  customerName: string;
  customerPhone: string | null;
  itemsJson: string;
  discountType: string;
  discountValue: number;
  deliveryCharge: number;
  note: string | null;
  createdAt: string;
}

interface HoldOrdersProps {
  onResume: (items: CartItem[]) => void;
}

export default function HoldOrders({ onResume }: HoldOrdersProps) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<HoldOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const clearCart = usePosStore((s) => s.clearCart);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const setDiscountValue = usePosStore((s) => s.setDiscountValue);
  const setDiscountType = usePosStore((s) => s.setDiscountType);
  const setDiscountEnabled = usePosStore((s) => s.setDiscountEnabled);
  const setDeliveryCharge = usePosStore((s) => s.setDeliveryCharge);
  const setSaleNote = usePosStore((s) => s.setSaleNote);
  const heldOrdersCount = usePosStore((s) => s.heldOrdersCount);
  const setHeldOrdersCount = usePosStore((s) => s.setHeldOrdersCount);
  const fetchHeldOrdersCount = usePosStore((s) => s.fetchHeldOrdersCount);

  // Fetch orders count on mount and whenever open state changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (open) setLoading(true);
        const res = await apiFetch('/api/hold-orders');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setOrders(data);
            setHeldOrdersCount(data.length);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, setHeldOrdersCount]);

  const handleResume = async (o: HoldOrder) => {
    try {
      let items: CartItem[];
      try {
        items = JSON.parse(o.itemsJson) as CartItem[];
      } catch {
        toast.error('Failed to parse held order data');
        return;
      }
      clearCart();
      // apply customer, discount/delivery/note after resume
      setTimeout(async () => {
        onResume(items);
        if (o.discountValue > 0) {
          setDiscountType(o.discountType as 'percentage' | 'fixed');
          setDiscountEnabled(true);
          setDiscountValue(o.discountValue);
        }
        if (o.deliveryCharge > 0) setDeliveryCharge(o.deliveryCharge);
        if (o.note) setSaleNote(o.note);

        // Restore Customer
        if (o.customerName && o.customerName !== 'Walk-in') {
          let foundCustomer: Customer | null = null;
          try {
            if (o.customerPhone) {
              const res = await apiFetch(`/api/customers?search=${encodeURIComponent(o.customerPhone)}`);
              if (res.ok) {
                const list: Customer[] = await res.json();
                foundCustomer = list.find((c) => c.phone === o.customerPhone) || list[0] || null;
              }
            }
            if (!foundCustomer && o.customerName) {
              const res = await apiFetch(`/api/customers?search=${encodeURIComponent(o.customerName)}`);
              if (res.ok) {
                const list: Customer[] = await res.json();
                foundCustomer = list.find((c) => c.name.toLowerCase() === o.customerName.toLowerCase()) || null;
              }
            }
          } catch {
            // ignore network error
          }

          if (foundCustomer) {
            setCustomer(foundCustomer);
          } else {
            setCustomer({
              id: `cust_${Date.now()}`,
              name: o.customerName,
              phone: o.customerPhone || '',
              loyaltyPoints: 0,
            });
          }
        }
      }, 50);
      // Delete the hold order
      await apiFetch(`/api/hold-orders/${o.id}`, { method: 'DELETE' });
      setOrders((prev) => prev.filter((item) => item.id !== o.id));
      await fetchHeldOrdersCount();
      setOpen(false);
      toast.success(`Resumed order for ${o.customerName}`);
    } catch {
      toast.error('Failed to resume order');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this held order?')) return;
    try {
      await apiFetch(`/api/hold-orders/${id}`, { method: 'DELETE' });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      await fetchHeldOrdersCount();
      toast.success('Held order deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors" title="Held Orders">
          <Pause className="h-3 w-3 text-amber-700" />
          <span className="text-xs font-semibold hidden sm:inline">On Hold</span>
          <span className={`text-[9px] font-bold rounded-full h-4 min-w-4 px-1.5 flex items-center justify-center transition-all ${heldOrdersCount > 0 ? 'bg-amber-600 text-white' : 'bg-amber-200/70 text-amber-800'}`}>
            {heldOrdersCount}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-3 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Pause className="h-4 w-4 text-amber-600" /> Held Orders
            <span className="text-xs text-gray-400 font-normal">({orders.length})</span>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="p-3 space-y-2">
            {loading && <p className="text-xs text-gray-400 text-center py-4">Loading…</p>}
            {!loading && orders.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No held orders</p>
                <p className="text-[10px] text-gray-300 mt-0.5">Click "Hold" button to save current cart</p>
              </div>
            )}
            {orders.map((o) => {
              let items: CartItem[] = [];
              try { items = JSON.parse(o.itemsJson) as CartItem[]; } catch { /* skip malformed */ }
              const total = items.reduce((s, i) => s + i.subtotal, 0);
              return (
                <div key={o.id} className="rounded-xl border border-gray-200 hover:border-amber-300 transition-colors overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-700">{o.customerName}</p>
                        {o.customerPhone && <p className="text-[10px] text-gray-400">{o.customerPhone}</p>}
                        <p className="text-[10px] text-gray-400">
                          {new Date(o.createdAt).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-amber-700 tabular-nums">৳{total.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{items.length} items</p>
                      </div>
                    </div>
                    {o.note && (
                      <p className="text-[10px] text-gray-500 italic mb-1 truncate">"{o.note}"</p>
                    )}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleResume(o)}
                        className="flex-1 h-8 rounded-lg text-xs bg-[#3FB98C] hover:bg-[#2D9F73]"
                      >
                        <Play className="h-3 w-3 mr-1" /> Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(o.id)}
                        className="h-8 px-2 rounded-lg text-xs text-red-500 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
