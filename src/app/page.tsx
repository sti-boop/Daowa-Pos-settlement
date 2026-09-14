'use client';

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import CustomerSection from '@/components/pos/CustomerSection';
import ProductSearch from '@/components/pos/ProductSearch';
import CartTable from '@/components/pos/CartTable';
import DiscountSection from '@/components/pos/DiscountSection';
import PaymentSection from '@/components/pos/PaymentSection';
import RoundOffSection from '@/components/pos/RoundOffSection';
import TotalsPanel from '@/components/pos/TotalsPanel';
import HoldOrders from '@/components/pos/HoldOrders';
import KeyboardShortcuts from '@/components/pos/KeyboardShortcuts';
import SaleNote from '@/components/pos/SaleNote';
import SaleConfirmation from '@/components/pos/SaleConfirmation';
import DeliveryOrderSection from '@/components/pos/DeliveryOrderSection';

const SalesAnalytics = lazy(() => import('@/components/pos/SalesAnalytics').then(m => ({ default: m.default })));
const ProductManager = lazy(() => import('@/components/pos/ProductManager').then(m => ({ default: m.default })));
const DailyReport = lazy(() => import('@/components/pos/DailyReport').then(m => ({ default: m.default })));

import {
  RotateCcw, Receipt, CalendarDays, Package,
  BarChart3, Copy, Check,
  Printer, Pause, Star, X, MessageSquare, Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePosStore } from '@/store/pos-store';
import { useHydrated } from '@/hooks/use-hydrated';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BkashIcon,
  NagadIcon,
  RocketIcon,
  CashIcon,
  CardIcon,
  DueIcon,
  SplitIcon,
  CodIcon,
} from '@/components/pos/PaymentIcons';
import SettlementHubOverlay from '@/components/daowa/SettlementHubOverlay';

const PAYMENT_METHOD_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  cash: { color: 'bg-[#2D9F73]/15 text-[#2D9F73]', icon: <CashIcon className="h-4 w-4" /> },
  due: { color: 'bg-red-100 text-red-700', icon: <DueIcon className="h-4 w-4" /> },
  bkash: { color: 'bg-pink-50 text-pink-700', icon: <BkashIcon className="h-4 w-auto" /> },
  nagad: { color: 'bg-orange-50 text-orange-700', icon: <NagadIcon className="h-4 w-auto" /> },
  rocket: { color: 'bg-purple-50 text-purple-700', icon: <RocketIcon className="h-4 w-auto" /> },
  card: { color: 'bg-sky-100 text-sky-700', icon: <CardIcon className="h-4 w-4" /> },
  split: { color: 'bg-[#3FB98C]/15 text-[#2D7A65]', icon: <SplitIcon className="h-4 w-4" /> },
  cod: { color: 'bg-amber-50 text-amber-700', icon: <CodIcon className="h-4 w-4" /> },
};

export default function Home() {
  const hydrated = useHydrated();
  const clearCart = usePosStore((s) => s.clearCart);
  const cartItems = usePosStore((s) => s.cartItems);
  const getGrandTotal = usePosStore((s) => s.getGrandTotal);
  const getDueAmount = usePosStore((s) => s.getDueAmount);
  const getChangeAmount = usePosStore((s) => s.getChangeAmount);
  const getSubtotal = usePosStore((s) => s.getSubtotal);
  const getTotalItemDiscount = usePosStore((s) => s.getTotalItemDiscount);
  const getTotalInvoiceDiscount = usePosStore((s) => s.getTotalInvoiceDiscount);
  const getTotalDiscount = usePosStore((s) => s.getTotalDiscount);
  const getRoundingAdjustment = usePosStore((s) => s.getRoundingAdjustment);
  const deliveryCharge = usePosStore((s) => s.deliveryCharge);
  const paymentMethod = usePosStore((s) => s.paymentMethod);
  const customer = usePosStore((s) => s.customer);
  const receivedAmount = usePosStore((s) => s.receivedAmount);
  const splitPayments = usePosStore((s) => s.splitPayments);
  const discountType = usePosStore((s) => s.discountType);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountEnabled = usePosStore((s) => s.discountEnabled);
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const addToCart = usePosStore((s) => s.addToCart);
  const saleNote = usePosStore((s) => s.saleNote);

  const [completing, setCompleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettlementHub, setShowSettlementHub] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const [successData, setSuccessData] = useState({
    total: 0, payment: '', change: 0, due: 0, items: 0,
    customerName: '', customerPhone: '',
    receiptItems: [] as { name: string; qty: number; unit: string; price: number; subtotal: number }[],
    subtotal: 0, discount: 0, delivery: 0, rounding: 0,
    received: 0, note: '', time: '', earnedPoints: 0,
  });
  const productInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const prevCartLengthRef = useRef(0);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { prevCartLengthRef.current = cartItems.length; }, [cartItems.length]);

  const grandTotal = getGrandTotal();
  const dueAmount = getDueAmount();
  const changeAmount = getChangeAmount();
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleClear = () => { clearCart(); toast.success('POS cleared'); };

  const handleCompleteSale = useCallback(() => {
    if (cartItems.length === 0) { toast.error('Cart is empty. Add products to continue.'); return; }
    const isDigitalPayment = ['bkash', 'nagad', 'card', 'rocket'].includes(paymentMethod);
    if (!isDigitalPayment && paymentMethod !== 'due' && paymentMethod !== 'split' && paymentMethod !== 'cod' && receivedAmount === 0 && grandTotal > 0) {
      toast.error('Please enter the received amount.'); return;
    }
    if (paymentMethod === 'split') {
      const totalPaid = splitPayments.reduce((sum, sp) => sum + sp.amount, 0);
      if (totalPaid === 0) { toast.error('Please add split payment amounts.'); return; }
    }

    // --- Sale validation: expired, over-margin, expiring ---
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expiredItems: string[] = [];
    const overMarginItems: string[] = [];
    const expiringItems: string[] = [];

    for (const item of cartItems) {
      // Expiry check
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 0) {
          expiredItems.push(`${item.productName} (expired on ${exp.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })})`);
        } else if (daysLeft <= 30) {
          expiringItems.push(`${item.productName} — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`);
        }
      }
      // Profit margin check
      if (item.costPrice != null && item.unitPrice > 0 && item.itemDiscount > 0) {
        const maxPct = ((item.unitPrice - item.costPrice) / item.unitPrice) * 100;
        const discPct = item.itemDiscountType === 'percentage'
          ? item.itemDiscount
          : (item.itemDiscount / item.unitPrice) * 100;
        if (discPct > maxPct) {
          overMarginItems.push(`${item.productName} (discount ${discPct.toFixed(1)}% > margin ${maxPct.toFixed(1)}%)`);
        }
      }
    }

    // BLOCK: expired products
    if (expiredItems.length > 0) {
      toast.error(`❌ Cannot sell expired products. Remove them from cart:\n${expiredItems.join('\n')}`);
      return;
    }
    // WARN: over-margin discounts (allow to proceed)
    if (overMarginItems.length > 0) {
      toast.warning(`⚠️ Discount exceeds profit margin on:
${overMarginItems.join('\n')}`);
    }
    // WARN: expiring products (allow to proceed)
    if (expiringItems.length > 0) {
      toast.warning(`⏰ Products expiring soon:\n${expiringItems.join('\n')}`);
    }

    setShowConfirmation(true);
  }, [cartItems, paymentMethod, receivedAmount, splitPayments, grandTotal]);

  const executeSale = useCallback(async () => {
    const state = usePosStore.getState();
    const cp = state.paymentMethod;
    const isDigitalPayment = ['bkash', 'nagad', 'card', 'rocket'].includes(cp);
    setShowConfirmation(false);
    setCompleting(true);
    try {
      const saleData = {
        customerId: state.customer?.id || null,
        subtotal: state.getSubtotal(),
        totalDiscount: state.getTotalDiscount(),
        discountType: state.discountType,
        discountValue: state.discountValue,
        deliveryCharge: state.deliveryCharge,
        roundingAdjust: state.getRoundingAdjustment(),
        grandTotal: state.getGrandTotal(),
        paymentMethod: cp,
        receivedAmount: cp === 'split' ? state.splitPayments.reduce((s, sp) => s + sp.amount, 0) : (isDigitalPayment || cp === 'cod') ? state.getGrandTotal() : state.receivedAmount,
        changeAmount: state.getChangeAmount(),
        dueAmount: state.getDueAmount(),
        items: state.cartItems.map((item) => ({ productId: item.productId, productName: item.productName, unitPrice: item.unitPrice, quantity: item.quantity, unit: item.unit, itemDiscount: item.itemDiscount, itemDiscountType: item.itemDiscountType, subtotal: item.subtotal })),
        splitPayments: cp === 'split' ? state.splitPayments.map((sp) => ({ method: sp.method, amount: sp.amount })) : [],
        note: state.saleNote || undefined,
        isDelivery: state.isDelivery,
        deliveryPartnerCode: state.deliveryPartnerCode,
        freeDelivery: state.freeDelivery,
      };
      const res = await apiFetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saleData) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed to complete sale'); }
      const sale = await res.json();
      setLastInvoiceNo(sale.invoiceNo);
      const now = new Date();
      setSuccessData({
        total: state.getGrandTotal(), payment: cp, change: state.getChangeAmount(), due: state.getDueAmount(),
        items: state.cartItems.length,
        customerName: state.customer?.name || 'Walk-in', customerPhone: state.customer?.phone || '',
        receiptItems: state.cartItems.map((item) => ({ name: item.productName, qty: item.quantity, unit: item.unit, price: item.unitPrice, subtotal: item.subtotal })),
        subtotal: state.getSubtotal(), discount: state.getTotalDiscount(), delivery: state.deliveryCharge,
        rounding: state.getRoundingAdjustment(),
        received: cp === 'split' ? state.splitPayments.reduce((s, sp) => s + sp.amount, 0) : isDigitalPayment ? state.getGrandTotal() : state.receivedAmount,
        note: state.saleNote || '',
        time: now.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
        earnedPoints: sale.earnedPoints || 0,
      });
      setShowSuccessDialog(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete sale');
    } finally { setCompleting(false); }
  }, []);

  const handleDiscard = () => { if (cartItems.length === 0) { toast.info('Nothing to discard.'); return; } clearCart(); toast.success('Sale discarded.'); };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false); setLastInvoiceNo('');
    setSuccessData({ total: 0, payment: '', change: 0, due: 0, items: 0, customerName: '', customerPhone: '', receiptItems: [], subtotal: 0, discount: 0, delivery: 0, rounding: 0, received: 0, note: '', time: '', earnedPoints: 0 });
    clearCart(); productInputRef.current?.focus();
  };

  const handlePrintReceipt = () => {
    const d = successData;
    const itemRows = d.receiptItems.map((item) =>
      `<tr><td style="padding:2px 0;font-size:9px;max-width:38mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</td><td style="text-align:center;padding:2px 0;font-size:9px">${item.qty}${item.unit}</td><td style="text-align:right;padding:2px 0;font-size:9px">৳${item.subtotal.toFixed(2)}</td></tr>`
    ).join('');
    const paymentRows = [
      `<div style="display:flex;justify-content:space-between;padding:1px 0"><span>Payment:</span><span style="text-transform:uppercase">${d.payment}</span></div>`,
      d.payment !== 'due' ? `<div style="display:flex;justify-content:space-between;padding:1px 0"><span>Received:</span><span>৳${d.received.toFixed(2)}</span></div>` : '',
      d.change > 0 ? `<div style="display:flex;justify-content:space-between;padding:1px 0"><span>Change:</span><span>৳${d.change.toFixed(2)}</span></div>` : '',
      d.due > 0 ? `<div style="display:flex;justify-content:space-between;padding:1px 0"><span>Due:</span><span>৳${d.due.toFixed(2)}</span></div>` : '',
    ].filter(Boolean).join('');
    const html = `<!DOCTYPE html><html><head><title>Receipt ${lastInvoiceNo}</title><style>@page{size:80mm auto;margin:2mm}body{margin:0;padding:4mm;font-family:'Courier New',Courier,monospace;font-size:10px;color:#000;width:80mm}</style></head><body>
<div style="text-align:center;margin-bottom:4px"><div style="font-size:14px;font-weight:bold">DAOWA POS</div></div>
<div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:3px 0;margin:4px 0">
<div style="display:flex;justify-content:space-between"><span>Invoice: ${lastInvoiceNo}</span><span>${d.time}</span></div>
<div>Customer: ${d.customerName}${d.customerPhone ? ` (${d.customerPhone})` : ''}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin:4px 0">
<thead><tr style="border-bottom:1px dashed #000"><th style="text-align:left;padding:2px 0;font-size:9px">Item</th><th style="text-align:center;padding:2px 0;font-size:9px">Qty</th><th style="text-align:right;padding:2px 0;font-size:9px">Amount</th></tr></thead>
<tbody>${itemRows}</tbody>
</table>
<div style="border-top:2px solid #000;border-bottom:2px solid #000;padding:4px 0;margin:4px 0;text-align:center"><div style="font-size:12px;font-weight:bold">TOTAL: ৳${d.total.toFixed(2)}</div></div>
<div style="margin:4px 0">${paymentRows}</div>
<div style="text-align:center;margin-top:6px;font-size:9px"><div style="font-weight:bold">Thank you for your purchase!</div></div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (w) { w.document.write(html); w.document.close(); }
    else { toast.error('Pop-up blocked. Please allow pop-ups for printing.'); }
  };

  const handleSmsInvoice = async () => {
    if (!successData.customerPhone) { toast.error('No customer phone number'); return; }
    setSmsSending(true);
    try {
      const d = successData;
      const items = d.receiptItems.map((i) => `${i.name} x${i.qty}${i.unit} = ৳${i.subtotal.toFixed(2)}`).join('\n');
      const msg = `DAOWA POS\nInvoice: ${lastInvoiceNo}\nDate: ${d.time}\nCustomer: ${d.customerName}\n\n${items}\n\nTotal: ৳${d.total.toFixed(2)}\nPaid: ৳${d.received.toFixed(2)} via ${d.payment.toUpperCase()}${d.change > 0 ? `\nChange: ৳${d.change.toFixed(2)}` : ''}${d.due > 0 ? `\nDue: ৳${d.due.toFixed(2)}` : ''}\n\nThank you!`;
      const res = await apiFetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: d.customerPhone, message: msg }) });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.simulated ? `Invoice SMS simulated for ${d.customerPhone}` : `Invoice SMS sent to ${d.customerPhone}`);
      } else {
        toast.error(data.error || 'Failed to send SMS');
      }
    } catch (err: any) { toast.error(err?.message || 'Failed to send SMS'); }
    finally { setSmsSending(false); }
  };

  const handleDownloadReceipt = () => {
    const d = successData; const lines: string[] = [];
    lines.push('================================');
    lines.push('          DAOWA POS');
    lines.push('================================');
    lines.push(`Invoice: ${lastInvoiceNo}`);
    lines.push(`Date: ${d.time}`);
    lines.push(`Customer: ${d.customerName}`);
    if (d.customerPhone) lines.push(`Phone: ${d.customerPhone}`);
    lines.push('--------------------------------');
    lines.push('Item              Qty    Amount');
    lines.push('--------------------------------');
    d.receiptItems.forEach((item) => {
      const name = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16);
      lines.push(`${name} ${String(item.qty + item.unit).padStart(5)} ${item.subtotal.toFixed(2).padStart(8)}`);
    });
    lines.push('================================');
    lines.push(`GRAND TOTAL:     ৳${d.total.toFixed(2)}`);
    lines.push('================================');
    lines.push(`Payment: ${d.payment.toUpperCase()}`);
    if (d.payment !== 'due') lines.push(`Received:        ৳${d.received.toFixed(2)}`);
    if (d.change > 0) lines.push(`Change:          ৳${d.change.toFixed(2)}`);
    if (d.due > 0) lines.push(`Due:             ৳${d.due.toFixed(2)}`);
    if (d.note) { lines.push(''); lines.push(`Note: ${d.note}`); }
    lines.push(''); lines.push('    Thank you for your visit!');
    lines.push('================================');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `receipt-${lastInvoiceNo}.txt`; a.click(); URL.revokeObjectURL(url);
    toast.success('Receipt downloaded');
  };

  const handleCopyReceipt = async () => {
    const d = successData; const lines: string[] = [];
    lines.push('================================');
    lines.push('     Daowa POS Receipt');
    lines.push('================================');
    lines.push(`Invoice: ${lastInvoiceNo}`);
    lines.push(`Date: ${d.time}`);
    lines.push(`Customer: ${d.customerName}`);
    lines.push('--------------------------------');
    d.receiptItems.forEach((item, idx) => {
      lines.push(`  ${idx + 1}. ${item.name}    ৳${item.price.toFixed(2)} x ${item.qty}`);
    });
    lines.push('--------------------------------');
    lines.push(`TOTAL:         ৳${d.total.toFixed(2)}`);
    lines.push(`Paid via: ${d.payment.charAt(0).toUpperCase() + d.payment.slice(1)}  ৳${d.received.toFixed(2)}`);
    if (d.change > 0) lines.push(`Change:         ৳${d.change.toFixed(2)}`);
    lines.push('================================');
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopiedReceipt(true); toast.success('Receipt copied!'); setTimeout(() => setCopiedReceipt(false), 2000); }
    catch { toast.error('Failed to copy receipt'); }
  };

  const handleHoldSale = async () => {
    if (cartItems.length === 0) return;
    try {
      const st = usePosStore.getState();
      const res = await apiFetch('/api/hold-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: customer?.name || 'Walk-in', customerPhone: customer?.phone || '', items: st.cartItems, discountEnabled: st.discountEnabled, discountType: st.discountType, discountValue: st.discountValue, deliveryCharge: st.deliveryCharge, isDelivery: st.isDelivery, deliveryPartnerCode: st.deliveryPartnerCode, note: st.saleNote || '' }) });
      if (!res.ok) throw new Error('Failed to hold sale');
      clearCart();
      toast.success('Sale held successfully.');
      await usePosStore.getState().fetchHeldOrdersCount();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to hold sale'); }
  };

  const paymentConfig = PAYMENT_METHOD_CONFIG[successData.payment] || PAYMENT_METHOD_CONFIG.cash;

  return (
    <div className="min-h-screen bg-white bg-pattern flex flex-col">
      {/* Header */}
      <header className="header-gradient sticky top-0 z-40 relative">
        <div className="top-gradient-bar" />
        <div className="max-w-[1440px] mx-auto px-3 md:px-4 lg:px-6 py-2 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {currentTime?.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }) || '...'}
              </span>
              <span className="text-gray-200">|</span>
              <span className="font-mono font-semibold tabular-nums tracking-wider text-gray-500 digital-clock">
                {currentTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) || '--:--:--'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <button onClick={() => setShowProducts(true)} className="flex items-center gap-1.5 bg-[#3FB98C]/10 text-[#3FB98C] rounded-full px-2.5 py-1 hover:bg-[#3FB98C]/20 transition-colors" title="Product Manager">
                <Package className="h-3 w-3" /><span className="text-xs font-semibold hidden sm:inline">Products</span>
              </button>
              <button onClick={() => setShowAnalytics(true)} className="flex items-center gap-1.5 bg-[#3FB98C]/10 text-[#3FB98C] rounded-full px-2.5 py-1 hover:bg-[#3FB98C]/20 transition-colors" title="Sales Analytics">
                <BarChart3 className="h-3 w-3" /><span className="text-xs font-semibold hidden sm:inline">Analytics</span>
              </button>
              <button onClick={() => setShowSettlementHub(true)} className="flex items-center gap-1.5 bg-[#3FB98C]/10 text-[#3FB98C] rounded-full px-2.5 py-1 hover:bg-[#3FB98C]/20 transition-colors" title="Settlement Hub — MFS, Courier, Rider & Card settlements, EOD cash register, returns, fees">
                <ShieldCheck className="h-3 w-3" /><span className="text-xs font-semibold hidden sm:inline">Settlement Hub</span>
              </button>
              <HoldOrders onResume={(items) => { setTimeout(() => { usePosStore.getState().replaceCart(items.map((item: any) => ({ id: crypto.randomUUID(), productId: item.productId, productName: item.productName, unitPrice: item.unitPrice, originalPrice: item.originalPrice || item.unitPrice, quantity: item.quantity, unit: item.unit, barcode: item.barcode, itemDiscount: item.itemDiscount || 0, itemDiscountType: item.itemDiscountType || 'percentage', subtotal: item.subtotal || (item.unitPrice * item.quantity), overridden: item.overridden ?? false, stock: item.stock ?? 0, category: item.category ?? '', generic: item.generic ?? '', costPrice: item.costPrice, expiryDate: item.expiryDate, }))); toast.success('Order resumed'); }, 0); }} />
              {cartItems.length > 0 && (
                <div className="bg-gray-100 rounded-lg px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5 md:gap-2">
                  <Receipt className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-500" />
                  <span className="text-xs md:text-sm font-semibold text-gray-700">{cartItems.length} items ({totalItems})</span>
                  <span className="text-gray-300 hidden sm:inline">|</span>
                  <span className="text-xs md:text-sm font-bold text-[#3FB98C]">৳{grandTotal.toFixed(2)}</span>
                </div>
              )}
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 md:p-4 lg:p-6 relative z-[1]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {/* Left Panel */}
          <div className="md:col-span-8 space-y-3 md:space-y-4">
            <div className="space-y-3 overflow-visible">
              <div className="grid grid-cols-12 gap-3 overflow-visible items-start">
                <div className="col-span-12 md:col-span-8 overflow-visible"><CustomerSection inputRef={customerInputRef} /></div>
                <div className="col-span-12 md:col-span-4"><DiscountSection /></div>
              </div>
              <div className="overflow-visible"><ProductSearch inputRef={productInputRef} /></div>
            </div>
            <div><CartTable /></div>
          </div>

          {/* Right Panel */}
          <div className="md:col-span-4 space-y-3 md:space-y-4 md:max-h-[calc(100vh-80px)] md:overflow-y-auto md:pr-1 smooth-scroll">
            <div><PaymentSection /></div>
            <div><RoundOffSection /></div>
            <div><SaleNote /></div>
            <div><TotalsPanel /></div>
            <div><DeliveryOrderSection /></div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 pt-1">
              <div className="flex gap-2">
                <Button onClick={handleHoldSale} disabled={cartItems.length === 0} className="flex-1 h-10 rounded-xl neu-btn btn-3d-press card-hover-lift border border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 font-semibold text-xs ripple-btn">
                  <Pause className="h-3.5 w-3.5 mr-1 text-amber-700" />Hold
                </Button>
                <Button onClick={handleDiscard} disabled={cartItems.length === 0 || completing} className="flex-1 h-10 rounded-xl neu-btn btn-3d-press card-hover-lift border border-red-200/80 bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 hover:border-red-300 font-semibold text-xs ripple-btn">
                  Discard
                </Button>
              </div>
              <button
                onClick={handleCompleteSale}
                disabled={cartItems.length === 0 || completing}
                className="complete-sale-shiny relative w-full md:flex-[2] h-12 rounded-xl overflow-hidden text-white font-bold text-sm shadow-lg shadow-[#3FB98C]/40 tabular-nums ripple-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all hover:shadow-xl hover:shadow-[#3FB98C]/50 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  {completing ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (<>
                    <Receipt className="h-4 w-4" />
                    Complete Sale — ৳{grandTotal.toFixed(2)}
                  </>)}
                </span>
                {/* Shimmer sweep */}
                <span className="shimmer-sweep absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-2 px-3 md:px-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm footer-gradient-border footer-pulse-line relative z-[1]">
        <div className="footer-watermark text-gray-400" aria-hidden="true" />
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="connection-dot absolute inline-flex h-full w-full rounded-full bg-[#2D9F73]/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D9F73]/50" />
            </span>
            <span className="font-medium text-gray-500">Daowa POS</span>
          </span>
        </div>
      </footer>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-[#2D9F73] to-[#3FB98C] px-6 pt-6 pb-8 overflow-hidden">
                <div className="absolute top-3 right-3">
                  <button onClick={handleCloseSuccess} className="text-white/60 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                <div className="relative flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 ring-4 ring-white/20">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="checkmark-animated" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Sale Completed!</h2>
                  <p className="text-sm text-white/75 mt-0.5">Transaction saved successfully</p>
                </div>
              </div>

              {/* Body - overlaps header */}
              <div className="relative -mt-5 px-5 pb-5">
                {/* Invoice Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Invoice</p>
                      <p className="text-base font-extrabold text-gray-800 font-mono tracking-tight">{lastInvoiceNo}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${paymentConfig.color}`}>
                      {paymentConfig.icon}{successData.payment.toUpperCase()}
                    </span>
                  </div>

                  {customer && (
                    <div className="flex items-center gap-2.5 mb-3 p-2.5 rounded-lg bg-gray-50">
                      <div className="h-8 w-8 rounded-lg bg-[#2D9F73]/15 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#2D9F73]">{customer.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{customer.name}</p>
                        <p className="text-[11px] text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary Rows */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Items</span>
                      <span className="font-semibold text-gray-800">{successData.items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grand Total</span>
                      <span className="font-extrabold text-[#2D9F73] tabular-nums text-base">৳{successData.total.toFixed(2)}</span>
                    </div>
                    {successData.change > 0 && (
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="font-semibold text-[#4169E1]">Change</span>
                        <span className="font-bold text-[#4169E1] tabular-nums text-base">৳{successData.change.toFixed(2)}</span>
                      </div>
                    )}
                    {successData.due > 0 && (
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Due</span>
                        <span className="font-bold text-red-600 tabular-nums">৳{successData.due.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loyalty Points Card */}
                {successData.earnedPoints > 0 && (
                  <div className="rounded-xl p-4 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)' }}>
                    <div className="absolute -top-3 -right-3 h-16 w-16 rounded-full bg-white/30" />
                    <div className="absolute -bottom-2 -left-2 h-12 w-12 rounded-full bg-white/20" />
                    <div className="relative flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-sm">
                        <Star className="h-5 w-5 text-amber-600 fill-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-amber-800/60 tracking-wider">Loyalty Rewards</p>
                        <p className="text-sm font-extrabold text-amber-900">
                          +{successData.earnedPoints} Points Earned!
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-black text-amber-800/80">{successData.earnedPoints}</p>
                        <p className="text-[10px] font-semibold text-amber-700/70">PTS</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrintReceipt}
                    className="flex-1 h-11 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button
                    onClick={handleCopyReceipt}
                    className="flex-1 h-11 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    {copiedReceipt ? <Check className="h-4 w-4 mr-1 text-[#2D9F73]" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiedReceipt ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={handleSmsInvoice}
                    disabled={smsSending || !successData.customerPhone}
                    className="flex-1 h-11 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-600 font-semibold text-sm hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {smsSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                    SMS Invoice
                  </Button>
                </div>
                <div className="mt-2.5">
                  <Button
                    onClick={handleCloseSuccess}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#2D9F73] to-[#3FB98C] hover:from-[#238a62] hover:to-[#35a07a] text-white font-bold text-sm shadow-lg shadow-[#2D9F73]/25 transition-all"
                  >
                    New Sale
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <SaleConfirmation customer={customer ? { name: customer.name, phone: customer.phone, address: customer.address } : null} items={cartItems.map((item) => ({ productName: item.productName, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, itemDiscount: item.itemDiscount, itemDiscountType: item.itemDiscountType, subtotal: item.subtotal }))} subtotal={getSubtotal()} totalDiscount={getTotalDiscount()} deliveryCharge={deliveryCharge} roundingAdjust={getRoundingAdjustment()} grandTotal={grandTotal} paymentMethod={paymentMethod} receivedAmount={paymentMethod === 'split' ? splitPayments.reduce((sum, sp) => sum + sp.amount, 0) : receivedAmount} changeAmount={changeAmount} dueAmount={dueAmount} splitPayments={splitPayments.map((sp) => ({ method: sp.method, amount: sp.amount }))} saleNote={saleNote || undefined} onConfirm={executeSale} onCancel={() => setShowConfirmation(false)} loading={completing} />
      )}

      {/* Lazy-loaded Sheets */}
      <Suspense fallback={null}><SalesAnalytics open={showAnalytics} onClose={() => setShowAnalytics(false)} onGenerateReport={() => { setShowAnalytics(false); setShowReport(true); }} /></Suspense>
      <Suspense fallback={null}><ProductManager open={showProducts} onClose={() => setShowProducts(false)} /></Suspense>
      <Suspense fallback={null}><DailyReport open={showReport} onClose={() => setShowReport(false)} /></Suspense>

      {/* Settlement Hub — full-screen overlay with the Daowa Settlement Hub */}
      {showSettlementHub && (
        <div className="fixed inset-0 z-50 bg-[#FCF2E5] overflow-y-auto">
          <SettlementHubOverlay onClose={() => setShowSettlementHub(false)} />
        </div>
      )}

      <KeyboardShortcuts />
    </div>
  );
}
