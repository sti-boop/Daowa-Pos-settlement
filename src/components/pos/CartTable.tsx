'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePosStore, type CartItem } from '@/store/pos-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Trash2, Plus, Minus, Tag, RotateCcw, ArrowLeftRight, Package, Loader2, TriangleAlert, CalendarX2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface AltProduct {
  id: string;
  name: string;
  barcode?: string | null;
  category?: string | null;
  generic?: string | null;
  unitPrice: number;
  unit?: string;
  stock?: number;
}

export default function CartTable() {
  const cartItems = usePosStore((s) => s.cartItems);
  const removeFromCart = usePosStore((s) => s.removeFromCart);
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const updateItemPrice = usePosStore((s) => s.updateItemPrice);
  const updateItemDiscount = usePosStore((s) => s.updateItemDiscount);
  const resetItemOverride = usePosStore((s) => s.resetItemOverride);
  const replaceCartItem = usePosStore((s) => s.replaceCartItem);
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [editDiscId, setEditDiscId] = useState<string | null>(null);
  const [editDiscVal, setEditDiscVal] = useState('');
  const [editDiscType, setEditDiscType] = useState<'percentage' | 'fixed'>('percentage');

  // Alternatives state — keyed by cart item id
  const [altOpenId, setAltOpenId] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const [altList, setAltList] = useState<AltProduct[]>([]);

  // Pre-compute item validation states
  const itemStates = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const map = new Map<string, {
      isExpired: boolean;
      isExpiring: boolean;
      daysLeft: number | null;
      expiryStr: string;
      exceedsMargin: boolean;
      maxDiscountPct: number | null;
      discAsPct: number;
    }>();
    for (const item of cartItems) {
      // Expiry check
      let isExpired = false;
      let isExpiring = false;
      let daysLeft: number | null = null;
      let expiryStr = '';
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffMs = exp.getTime() - now.getTime();
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        expiryStr = exp.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        if (daysLeft <= 0) {
          isExpired = true;
        } else if (daysLeft <= 30) {
          isExpiring = true;
        }
      }
      // Profit margin check
      const maxDiscountPct = item.costPrice != null && item.unitPrice > 0
        ? ((item.unitPrice - item.costPrice) / item.unitPrice) * 100
        : null;
      const discAsPct = item.itemDiscountType === 'percentage'
        ? item.itemDiscount
        : item.unitPrice > 0 ? (item.itemDiscount / item.unitPrice) * 100 : 0;
      const exceedsMargin = maxDiscountPct !== null && item.itemDiscount > 0 && discAsPct > maxDiscountPct;

      map.set(item.id, { isExpired, isExpiring, daysLeft, expiryStr, exceedsMargin, maxDiscountPct, discAsPct });
    }
    return map;
  }, [cartItems]);

  // Expose validation summary for parent
  const validationSummary = useMemo(() => {
    const expired: string[] = [];
    const overMargin: string[] = [];
    const expiring: string[] = [];
    for (const [id, s] of itemStates) {
      const item = cartItems.find(i => i.id === id);
      if (!item) continue;
      if (s.isExpired) expired.push(item.productName);
      if (s.exceedsMargin) overMargin.push(item.productName);
      if (s.isExpiring) expiring.push(`${item.productName} (${s.daysLeft}d left)`);
    }
    return { expired, overMargin, expiring };
  }, [itemStates, cartItems]);

  const loadAlternatives = useCallback(async (item: CartItem) => {
    // Prefer matching by generic name (true generic-equivalent alternatives)
    if (item.generic) {
      setAltLoading(true);
      try {
        const res = await apiFetch(`/api/products?generic=${encodeURIComponent(item.generic)}&exclude=${encodeURIComponent(item.productId)}`);
        if (res.ok) {
          const data = (await res.json()) as AltProduct[];
          setAltList(data);
          return;
        }
      } catch {
        // fall through to category fallback
      } finally {
        setAltLoading(false);
      }
    }
    // Fallback: same category if no generic set or generic fetch failed
    if (item.category) {
      setAltLoading(true);
      try {
        const res = await apiFetch(`/api/products?category=${encodeURIComponent(item.category)}`);
        if (res.ok) {
          const data = (await res.json()) as AltProduct[];
          setAltList(data.filter((p) => p.id !== item.productId).slice(0, 8));
          return;
        }
      } catch {
        setAltList([]);
      } finally {
        setAltLoading(false);
      }
    }
    setAltList([]);
  }, []);

  const handleAltSelect = (cartItemId: string, alt: AltProduct) => {
    if ((alt.stock ?? 0) <= 0) {
      toast.error(`${alt.name} is out of stock`);
      return;
    }
    replaceCartItem(cartItemId, {
      id: alt.id,
      name: alt.name,
      unitPrice: alt.unitPrice,
      unit: alt.unit || 'pcs',
      barcode: alt.barcode || undefined,
      stock: alt.stock ?? 0,
      category: alt.category ?? '',
      generic: alt.generic ?? '',
    });
    setAltOpenId(null);
    toast.success(`Replaced with: ${alt.name}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 p-8 text-center shadow-sm card-hover-lift">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-[#3FB98C]/10 to-[#2D9F73]/10 flex items-center justify-center mb-3">
          <Tag className="h-7 w-7 text-[#3FB98C]" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-0.5">Cart is empty</p>
        <p className="text-xs text-gray-400">Search or scan a product above to add it.</p>
      </div>
    );
  }

  const handlePriceSave = (id: string) => {
    const v = parseFloat(editPriceVal);
    if (!isNaN(v) && v >= 0) {
      updateItemPrice(id, v);
      toast.success('Price updated');
    }
    setEditPriceId(null);
    setEditPriceVal('');
  };

  const handleDiscSave = (id: string) => {
    const v = parseFloat(editDiscVal);
    if (!isNaN(v) && v >= 0) {
      updateItemDiscount(id, v, editDiscType);
      toast.success('Item discount updated');
    }
    setEditDiscId(null);
    setEditDiscVal('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm card-hover-lift overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-100">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#3FB98C]" /> Cart Items
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#3FB98C] text-white text-[10px] font-bold">
            {cartItems.length}
          </span>
          {validationSummary.expired.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold animate-pulse">
              {validationSummary.expired.length} EXPIRED
            </span>
          )}
          {validationSummary.overMargin.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold animate-pulse">
              {validationSummary.overMargin.length} OVER MARGIN
            </span>
          )}
        </h3>
        <p className="text-[10px] text-gray-500">Click price/discount to edit</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Product</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Barcode</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Stock</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Qty</th>
              <th className="text-right px-2 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Price</th>
              <th className="text-center px-2 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Disc</th>
              <th className="text-right px-3 py-2 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Subtotal</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item) => {
              const state = itemStates.get(item.id);
              const isBlocked = state?.isExpired || state?.exceedsMargin;
              const remainingStock = item.stock - item.quantity;
              const showStock = item.stock > 0;
              return (
                <tr
                  key={item.id}
                  className={`border-b transition-colors ${
                    state?.isExpired
                      ? 'bg-red-50 border-red-200/70'
                      : state?.exceedsMargin
                        ? 'bg-amber-50 border-amber-200/70'
                        : 'border-gray-50 hover:bg-[#3FB98C]/3'
                  }`}
                >
                  <td className="px-3 py-2 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-xs ${state?.isExpired ? 'text-red-700' : state?.exceedsMargin ? 'text-amber-700' : 'text-gray-700'}`}>{item.productName}</p>
                        <p className="text-[10px] text-gray-400">{item.unit}</p>
                        {/* Expiry warnings below product name */}
                        {state?.isExpired && (
                          <p className="flex items-center gap-1 text-[10px] font-bold text-red-600 mt-0.5">
                            <CalendarX2 className="h-3 w-3" />
                            EXPIRED on {state.expiryStr}
                          </p>
                        )}
                        {state?.isExpiring && !state.isExpired && (
                          <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Expires in {state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} ({state.expiryStr})
                          </p>
                        )}
                        {state?.exceedsMargin && !state.isExpired && (
                          <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600 mt-0.5">
                            <TriangleAlert className="h-3 w-3" />
                            OVER MARGIN — Disc {state.discAsPct.toFixed(1)}% {'>'} margin {state.maxDiscountPct!.toFixed(1)}%
                          </p>
                        )}
                      </div>
                      {item.overridden && (
                        <button
                          onClick={() => { resetItemOverride(item.id); toast.success('Override reset'); }}
                          className="text-amber-500 hover:text-amber-700 shrink-0"
                          title="Reset to default discount"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                      {/* ALT button — alternative products popover */}
                      <Popover open={altOpenId === item.id} onOpenChange={(o) => { setAltOpenId(o ? item.id : null); if (o) loadAlternatives(item); }}>
                        <PopoverTrigger asChild>
                          <button
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#3FB98C]/10 hover:bg-[#3FB98C]/20 text-[#3FB98C] border border-[#3FB98C]/20 text-[10px] font-bold transition-colors"
                            title="Show alternative products (same category)"
                          >
                            <ArrowLeftRight className="h-3 w-3" /> ALT
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-[#3FB98C]" /> Alternatives
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {item.generic ? (
                                <>Generic: <span className="font-medium text-[#3FB98C]">{item.generic}</span></>
                              ) : (
                                <>Category: <span className="font-medium">{item.category || '—'}</span></>
                              )}
                            </p>
                          </div>
                          <div className="max-h-60 overflow-y-auto smooth-scroll">
                            {altLoading && (
                              <div className="px-3 py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                              </div>
                            )}
                            {!altLoading && altList.length === 0 && (
                              <div className="px-3 py-4 text-center text-xs text-gray-400">
                                No alternatives found
                              </div>
                            )}
                            {!altLoading && altList.map((alt) => {
                              const out = (alt.stock ?? 0) <= 0;
                              return (
                                <button
                                  key={alt.id}
                                  onClick={() => handleAltSelect(item.id, alt)}
                                  disabled={out}
                                  className="w-full text-left px-3 py-2 hover:bg-[#3FB98C]/5 border-b border-gray-100 last:border-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-700 truncate">{alt.name}</p>
                                      <p className="text-[10px] text-gray-400">
                                        {alt.barcode && <span>{alt.barcode}</span>}
                                        {alt.barcode && <span> · </span>}
                                        Stock: {alt.stock ?? 0}
                                      </p>
                                    </div>
                                    <span className="text-xs font-bold text-[#3FB98C] tabular-nums shrink-0">৳{alt.unitPrice.toFixed(2)}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {item.barcode ? (
                      <span className="text-[11px] font-mono text-gray-600 tabular-nums">{item.barcode}</span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {showStock ? (
                      <span className={`text-xs font-bold tabular-nums ${remainingStock <= 0 ? 'text-red-600' : remainingStock <= 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {remainingStock}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded-md bg-red-50 hover:bg-red-100 border border-red-200/70 flex items-center justify-center text-red-600 transition-colors shadow-2xs active:scale-95"
                        title="Decrease quantity"
                      >
                        <Minus className="h-3 w-3 text-red-600 stroke-[2.5]" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-gray-700 tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (showStock && item.quantity >= item.stock) {
                            toast.warning(`Only ${item.stock} in stock`);
                            return;
                          }
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="h-6 w-6 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/70 flex items-center justify-center text-[#166534] transition-colors shadow-2xs active:scale-95"
                        title="Increase quantity"
                      >
                        <Plus className="h-3 w-3 text-[#166534] stroke-[2.5]" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    {editPriceId === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          autoFocus
                          type="number"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(item.id); if (e.key === 'Escape') setEditPriceId(null); }}
                          className="h-7 w-20 text-xs text-right"
                        />
                        <Button size="sm" onClick={() => handlePriceSave(item.id)} className="h-7 px-2 text-xs rounded-md bg-[#3FB98C]">OK</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditPriceId(item.id); setEditPriceVal(item.unitPrice.toString()); }}
                        className="font-semibold text-gray-700 tabular-nums hover:text-[#3FB98C] hover:underline"
                      >
                        ৳{item.unitPrice.toFixed(2)}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {editDiscId === item.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditDiscType(editDiscType === 'percentage' ? 'fixed' : 'percentage')}
                          className="h-7 px-1.5 rounded-md text-[10px] font-bold shrink-0 transition-colors bg-gray-100 hover:bg-gray-200 text-gray-500"
                          title="Toggle between % and ৳"
                        >
                          {editDiscType === 'percentage' ? '%' : '৳'}
                        </button>
                        <Input
                          autoFocus
                          type="number"
                          value={editDiscVal}
                          onChange={(e) => setEditDiscVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleDiscSave(item.id); if (e.key === 'Escape') setEditDiscId(null); }}
                          className="h-7 w-16 text-xs text-center"
                        />
                        <Button size="sm" onClick={() => handleDiscSave(item.id)} className="h-7 px-2 text-xs rounded-md bg-[#3FB98C]">OK</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditDiscId(item.id); setEditDiscVal(item.itemDiscount.toString()); setEditDiscType(item.itemDiscountType); }}
                        className={`text-xs font-medium tabular-nums ${state?.isExpired ? 'text-red-600 hover:text-red-700' : state?.exceedsMargin ? 'text-amber-600 hover:text-amber-700' : 'text-gray-500 hover:text-[#3FB98C]'}`}
                      >
                        {item.itemDiscount > 0 ? `${item.itemDiscount}${item.itemDiscountType === 'percentage' ? '%' : '৳'}` : '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="font-bold text-[#3FB98C] tabular-nums">৳{item.subtotal.toFixed(2)}</span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 rounded-md hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
