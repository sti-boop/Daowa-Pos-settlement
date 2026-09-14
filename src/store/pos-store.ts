import { create } from 'zustand';
import { apiFetch } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  loyaltyPoints?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  unit: string;
  barcode?: string;
  itemDiscount: number;
  itemDiscountType: 'percentage' | 'fixed';
  subtotal: number;
  overridden?: boolean;
  stock: number;
  category: string;
  generic: string;
  costPrice?: number | null;
  expiryDate?: string | null;
}

export interface SplitPaymentItem {
  method: string;
  amount: number;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface PosState {
  // Cart
  cartItems: CartItem[];
  addToCart: (item: {
    id: string;
    name: string;
    unitPrice: number;
    unit: string;
    barcode?: string;
    stock?: number;
    category?: string;
    generic?: string;
    costPrice?: number | null;
    expiryDate?: string | null;
  }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateItemPrice: (id: string, price: number) => void;
  updateItemDiscount: (id: string, value: number, type: 'percentage' | 'fixed') => void;
  resetItemOverride: (id: string) => void;
  replaceCartItem: (cartItemId: string, data: {
    id: string;
    name: string;
    unitPrice: number;
    unit: string;
    barcode?: string;
    stock?: number;
    category?: string;
    generic?: string;
    costPrice?: number | null;
    expiryDate?: string | null;
  }) => void;
  replaceCart: (items: CartItem[]) => void;
  clearCart: () => void;

  // Customer
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;

  // Payment
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  receivedAmount: number;
  setReceivedAmount: (amount: number) => void;
  splitPayments: SplitPaymentItem[];
  addSplitPayment: (sp: SplitPaymentItem) => void;
  updateSplitPayment: (idx: number, sp: SplitPaymentItem) => void;
  removeSplitPayment: (idx: number) => void;

  // Discount
  discountEnabled: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  setDiscountEnabled: (enabled: boolean) => void;
  setDiscountType: (type: 'percentage' | 'fixed') => void;
  setDiscountValue: (value: number) => void;

  // Delivery
  deliveryCharge: number;
  setDeliveryCharge: (charge: number) => void;
  isDelivery: boolean;
  setIsDelivery: (val: boolean) => void;
  deliveryPartnerCode: string;
  setDeliveryPartnerCode: (code: string) => void;
  freeDelivery: boolean;
  setFreeDelivery: (val: boolean) => void;

  // Rounding
  manualRoundOff: boolean;
  roundOffValue: number;
  setManualRoundOff: (val: boolean) => void;
  setRoundOffValue: (val: number) => void;

  // Note
  saleNote: string;
  setSaleNote: (note: string) => void;

  // Held Orders Counter
  heldOrdersCount: number;
  setHeldOrdersCount: (count: number) => void;
  fetchHeldOrdersCount: () => Promise<void>;

  // Computed getters
  getSubtotal: () => number;
  getTotalItemDiscount: () => number;
  getTotalInvoiceDiscount: () => number;
  getTotalDiscount: () => number;
  getGrandTotal: () => number;
  getRoundingAdjustment: () => number;
  getAutoRoundOff: () => number;
  getChangeAmount: () => number;
  getDueAmount: () => number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeItemSubtotal(item: CartItem): number {
  let base = item.unitPrice * item.quantity;
  if (item.itemDiscountType === 'percentage' && item.itemDiscount > 0) {
    base = base - (base * item.itemDiscount) / 100;
  } else if (item.itemDiscountType === 'fixed' && item.itemDiscount > 0) {
    base = base - item.itemDiscount * item.quantity;
  }
  return Math.round(base * 100) / 100;
}

function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Helpers (continued) ─────────────────────────────────────────────────

/** Apply percentage discount to all non-overridden cart items */
function applyPercentageToItems(
  items: CartItem[],
  pct: number,
): CartItem[] {
  if (pct <= 0) {
    return items.map((i) =>
      i.overridden
        ? i
        : { ...i, itemDiscount: 0, subtotal: computeItemSubtotal({ ...i, itemDiscount: 0, itemDiscountType: 'percentage' }) },
    );
  }
  return items.map((i) =>
    i.overridden
      ? i
      : { ...i, itemDiscount: pct, itemDiscountType: 'percentage' as const, subtotal: computeItemSubtotal({ ...i, itemDiscount: pct, itemDiscountType: 'percentage' as const }) },
  );
}

/** Reset all non-overridden item discounts to 0 */
function resetNonOverriddenDiscounts(items: CartItem[]): CartItem[] {
  return items.map((i) =>
    i.overridden
      ? i
      : { ...i, itemDiscount: 0, subtotal: computeItemSubtotal({ ...i, itemDiscount: 0 }) },
  );
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePosStore = create<PosState>((set, get) => ({
  // Cart
  cartItems: [],

  addToCart: (item) =>
    set((s) => {
      const existing = s.cartItems.find((c) => c.productId === item.id);
      if (existing) {
        return {
          cartItems: s.cartItems.map((c) =>
            c.productId === item.id
              ? { ...c, quantity: c.quantity + 1, subtotal: computeItemSubtotal({ ...c, quantity: c.quantity + 1 }) }
              : c
          ),
        };
      }
      // If percentage discount is active, apply it to new items
      const discAmt = s.discountEnabled && s.discountType === 'percentage' && s.discountValue > 0
        ? s.discountValue : 0;
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        productId: item.id,
        productName: item.name,
        unitPrice: item.unitPrice,
        originalPrice: item.unitPrice,
        quantity: 1,
        unit: item.unit,
        barcode: item.barcode,
        itemDiscount: discAmt,
        itemDiscountType: 'percentage',
        subtotal: discAmt > 0
          ? computeItemSubtotal({ unitPrice: item.unitPrice, quantity: 1, itemDiscount: discAmt, itemDiscountType: 'percentage' } as CartItem)
          : item.unitPrice,
        overridden: false,
        stock: item.stock ?? 0,
        category: item.category ?? '',
        generic: item.generic ?? '',
        costPrice: item.costPrice,
        expiryDate: item.expiryDate,
      };
      return { cartItems: [...s.cartItems, newItem] };
    }),

  removeFromCart: (id) => set((s) => ({ cartItems: s.cartItems.filter((i) => i.id !== id) })),

  updateQuantity: (id, qty) =>
    set((s) => ({
      cartItems: s.cartItems.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, qty), subtotal: computeItemSubtotal({ ...i, quantity: Math.max(0, qty) }) } : i)),
    })),

  updateItemPrice: (id, price) =>
    set((s) => ({
      cartItems: s.cartItems.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, unitPrice: price, overridden: true };
        return { ...updated, subtotal: computeItemSubtotal(updated) };
      }),
    })),

  updateItemDiscount: (id, value, type) =>
    set((s) => ({
      cartItems: s.cartItems.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, itemDiscount: value, itemDiscountType: type, overridden: true };
        return { ...updated, subtotal: computeItemSubtotal(updated) };
      }),
    })),

  resetItemOverride: (id) =>
    set((s) => {
      // When resetting, re-apply invoice percentage discount if active
      const invoiceDisc = s.discountEnabled && s.discountType === 'percentage' && s.discountValue > 0
        ? s.discountValue : 0;
      return {
        cartItems: s.cartItems.map((i) => {
          if (i.id !== id) return i;
          const updated = {
            ...i,
            unitPrice: i.originalPrice ?? i.unitPrice,
            itemDiscount: invoiceDisc,
            itemDiscountType: 'percentage' as const,
            overridden: false,
          };
          return { ...updated, subtotal: computeItemSubtotal(updated) };
        }),
      };
    }),

  replaceCartItem: (cartItemId, data) =>
    set((s) => ({
      cartItems: s.cartItems.map((i) => {
        if (i.id !== cartItemId) return i;
        return {
          ...i,
          productId: data.id,
          productName: data.name,
          unitPrice: data.unitPrice,
          originalPrice: data.unitPrice,
          unit: data.unit,
          barcode: data.barcode,
          stock: data.stock ?? 0,
          category: data.category ?? '',
          generic: data.generic ?? '',
          costPrice: data.costPrice,
          expiryDate: data.expiryDate,
          subtotal: computeItemSubtotal({ ...i, unitPrice: data.unitPrice, quantity: i.quantity }),
        };
      }),
    })),

  replaceCart: (items) => set({ cartItems: items }),
  clearCart: () =>
    set({
      cartItems: [],
      customer: null,
      receivedAmount: 0,
      splitPayments: [],
      discountEnabled: false,
      discountType: 'percentage',
      discountValue: 0,
      deliveryCharge: 0,
      isDelivery: false,
      deliveryPartnerCode: '',
      freeDelivery: false,
      manualRoundOff: false,
      roundOffValue: 0,
      saleNote: '',
      paymentMethod: 'cash',
    }),

  // Customer
  customer: null,
  setCustomer: (customer) => set({ customer }),

  // Payment
  paymentMethod: 'cash',
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  receivedAmount: 0,
  setReceivedAmount: (amount) => set({ receivedAmount: amount }),
  splitPayments: [],
  addSplitPayment: (sp) => set((s) => ({ splitPayments: [...s.splitPayments, sp] })),
  updateSplitPayment: (idx, sp) => set((s) => ({ splitPayments: s.splitPayments.map((p, i) => (i === idx ? sp : p)) })),
  removeSplitPayment: (idx) => set((s) => ({ splitPayments: s.splitPayments.filter((_, i) => i !== idx) })),

  // Discount
  discountEnabled: false,
  discountType: 'percentage',
  discountValue: 0,
  setDiscountEnabled: (enabled) =>
    set((s) => {
      if (enabled && s.discountType === 'percentage') {
        return { discountEnabled: true, cartItems: applyPercentageToItems(s.cartItems, s.discountValue) };
      }
      if (enabled && s.discountType === 'fixed') {
        // Fixed: reset per-item discounts (applied on subtotal, not items)
        return { discountEnabled: true, cartItems: resetNonOverriddenDiscounts(s.cartItems) };
      }
      // Disabling: reset all non-overridden
      return { discountEnabled: false, cartItems: resetNonOverriddenDiscounts(s.cartItems) };
    }),
  setDiscountType: (type) =>
    set((s) => {
      if (type === 'percentage') {
        return { discountType: type, cartItems: s.discountEnabled ? applyPercentageToItems(s.cartItems, s.discountValue) : s.cartItems };
      }
      // Switching to fixed: reset non-overridden item discounts
      return { discountType: type, cartItems: resetNonOverriddenDiscounts(s.cartItems) };
    }),
  setDiscountValue: (value) =>
    set((s) => {
      if (s.discountEnabled && s.discountType === 'percentage') {
        return { discountValue: value, cartItems: applyPercentageToItems(s.cartItems, value) };
      }
      return { discountValue: value };
    }),

  // Delivery
  deliveryCharge: 0,
  setDeliveryCharge: (charge) => set({ deliveryCharge: charge }),
  isDelivery: false,
  setIsDelivery: (val) => set({ isDelivery: val }),
  deliveryPartnerCode: '',
  setDeliveryPartnerCode: (code) => set({ deliveryPartnerCode: code }),
  freeDelivery: false,
  setFreeDelivery: (val) => set({ freeDelivery: val }),

  // Rounding
  manualRoundOff: false,
  roundOffValue: 0,
  setManualRoundOff: (val) => set({ manualRoundOff: val }),
  setRoundOffValue: (val) => set({ roundOffValue: val }),

  // Note
  saleNote: '',
  setSaleNote: (note) => set({ saleNote: note }),

  // Held Orders Counter
  heldOrdersCount: 0,
  setHeldOrdersCount: (count) => set({ heldOrdersCount: count }),
  fetchHeldOrdersCount: async () => {
    try {
      const res = await apiFetch('/api/hold-orders');
      if (res.ok) {
        const data = await res.json();
        set({ heldOrdersCount: Array.isArray(data) ? data.length : 0 });
      }
    } catch {
      // ignore network errors
    }
  },

  // Computed getters
  getSubtotal: () => {
    const items = get().cartItems;
    return roundToTwo(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  },

  getTotalItemDiscount: () => {
    const items = get().cartItems;
    return roundToTwo(items.reduce((sum, i) => sum + (i.unitPrice * i.quantity - i.subtotal), 0));
  },

  getTotalInvoiceDiscount: () => {
    const s = get();
    if (!s.discountEnabled) return 0;
    // Percentage discount is already applied to items, so invoice-level = 0
    if (s.discountType === 'percentage') return 0;
    // Fixed discount is applied directly on subtotal
    if (s.discountType === 'fixed') return roundToTwo(s.discountValue);
    return 0;
  },

  getTotalDiscount: () => {
    const s = get();
    return roundToTwo(s.getTotalItemDiscount() + s.getTotalInvoiceDiscount());
  },

  getGrandTotal: () => {
    const s = get();
    const subtotal = s.getSubtotal();
    const totalDiscount = s.getTotalDiscount();
    const rounding = s.getRoundingAdjustment();
    // When free delivery is enabled, the delivery charge is NOT added to the
    // customer's payable amount — it's the company's expense, not the customer's.
    const chargeToAdd = s.freeDelivery ? 0 : s.deliveryCharge;
    return roundToTwo(subtotal - totalDiscount + chargeToAdd + rounding);
  },

  getRoundingAdjustment: () => {
    const s = get();
    if (s.manualRoundOff) return s.roundOffValue;
    return s.getAutoRoundOff();
  },

  getAutoRoundOff: () => {
    const s = get();
    // Apply rounding for ALL payment methods (not just cash)
    const chargeToAdd = s.freeDelivery ? 0 : s.deliveryCharge;
    const raw = s.getSubtotal() - s.getTotalDiscount() + chargeToAdd;
    const rounded = Math.round(raw);
    return roundToTwo(rounded - raw);
  },

  getChangeAmount: () => {
    const s = get();
    const grand = s.getGrandTotal();
    if (s.paymentMethod === 'split') {
      const totalPaid = s.splitPayments.reduce((sum, sp) => sum + sp.amount, 0);
      return roundToTwo(Math.max(0, totalPaid - grand));
    }
    if (['bkash', 'nagad', 'card', 'rocket'].includes(s.paymentMethod)) return 0;
    if (s.paymentMethod === 'due') return 0;
    return roundToTwo(Math.max(0, s.receivedAmount - grand));
  },

  getDueAmount: () => {
    const s = get();
    const grand = s.getGrandTotal();
    if (s.paymentMethod === 'split') {
      const totalPaid = s.splitPayments.reduce((sum, sp) => sum + sp.amount, 0);
      return roundToTwo(Math.max(0, grand - totalPaid));
    }
    if (['bkash', 'nagad', 'card', 'rocket'].includes(s.paymentMethod)) return 0;
    if (s.paymentMethod === 'due') return grand;
    return roundToTwo(Math.max(0, grand - s.receivedAmount));
  },
}));
