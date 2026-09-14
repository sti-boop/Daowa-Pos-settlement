'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePosStore, type Customer } from '@/store/pos-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, UserPlus, X, Award, Phone, MapPin,
  MessageSquare, ChevronDown, ChevronUp, ShoppingBag, Receipt, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface CustomerSectionProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: string;
  invoiceNo: string;
  date: string;
  subtotal: number;
  totalDiscount: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  dueAmount: number;
  status: string;
  items: OrderItem[];
}

interface CustomerDetails {
  dueBalance: number;
  loyaltyPoints: number;
  totalOrders: number;
  orders: Order[];
}

/** Highlight matching tokens in text */
function HighlightCustomerText({ text, query }: { text?: string | null; query: string }) {
  if (!text || !query.trim()) return <>{text || ''}</>;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[#3FB98C]/20 text-[#2D9F73] rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function CustomerSection({ inputRef }: CustomerSectionProps) {
  const customer = usePosStore((s) => s.customer);
  const setCustomer = usePosStore((s) => s.setCustomer);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Customer details state
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [showSmsBox, setShowSmsBox] = useState(false);
  const [smsText, setSmsText] = useState('');
  const smsBoxRef = useRef<HTMLDivElement>(null);

  const searchCustomers = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/customers?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIndex(data.length > 0 ? 0 : -1);
        setOpen(true);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(query), 200);
    return () => clearTimeout(t);
  }, [query, searchCustomers]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    const loadCustomer = async () => {
      setDetailsLoading(true);
      try {
        const res = await apiFetch(`/api/customers/${customer.id}`);
        if (res.ok && active) {
          const data = await res.json();
          setDetails(data);
        }
      } catch {
        // ignore
      } finally {
        if (active) setDetailsLoading(false);
      }
    };
    loadCustomer();
    return () => {
      active = false;
    };
  }, [customer]);

  const handleSelect = (c: Customer) => {
    setCustomer(c);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setOpen(false);
    toast.success(`Customer: ${c.name} (${c.phone})`);
  };

  const handleClear = () => {
    setCustomer(null);
    setDetails(null);
    setShowHistory(false);
    setExpandedOrder(null);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newPhone.trim()) { toast.error('Name and phone are required'); return; }
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail, address: newAddress }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create customer'); }
      const c = await res.json();
      handleSelect(c);
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress('');
      setShowCreate(false);
      toast.success('Customer created');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const getDefaultSmsText = () => {
    if (!customer || !details) return '';
    const dueText = details.dueBalance > 0
      ? `\nOutstanding Due: ৳${details.dueBalance.toFixed(2)}`
      : '';
    return `Dear ${customer.name}, thank you for choosing Daowa Pharmacy!\nTotal Orders: ${details.totalOrders} | Loyalty Points: ${details.loyaltyPoints}${dueText}`;
  };

  const handleOpenSmsBox = () => {
    setSmsText(getDefaultSmsText());
    setShowSmsBox(true);
  };

  const handleSendSms = async () => {
    if (!customer || !smsText.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSmsSending(true);
    try {
      const res = await apiFetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customer.phone, message: smsText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }
      toast.success(data.simulated ? `SMS simulated for ${customer.phone}` : `SMS sent to ${customer.phone}`);
      setShowSmsBox(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send SMS');
    } finally { setSmsSending(false); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={containerRef} className="bg-white rounded-2xl border border-gray-200/70 p-3 md:p-4 shadow-sm card-hover-lift">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-[#3FB98C]" /> Customer
        </h3>
        {customer && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-6 px-2 text-[10px] text-gray-400 hover:text-red-500"
          >
            <X className="h-3 w-3 mr-1" /> Remove
          </Button>
        )}
      </div>

      {customer ? (
        <div className="space-y-2.5">
          {/* Customer Card */}
          <div className="p-2.5 rounded-xl bg-[#3FB98C]/5 border border-[#3FB98C]/20">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#3FB98C] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800 truncate">{customer.name}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {customer.phone}
                </p>
                {customer.address && (
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {customer.address}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Row: Loyalty + Due + SMS */}
            {detailsLoading ? (
              <div className="flex items-center justify-center py-2 mt-2">
                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
              </div>
            ) : details ? (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {/* Loyalty Points */}
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200/70">
                  <Award className="h-3 w-3 text-amber-600" />
                  <span className="text-[11px] font-bold text-amber-700">{details.loyaltyPoints} pts</span>
                </div>

                {/* Due Balance - red */}
                {details.dueBalance > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200/70">
                    <span className="text-[11px] font-extrabold text-red-600">
                      Due: ৳{details.dueBalance.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* SMS Button - blue */}
                <div className="relative">
                  <button
                    onClick={handleOpenSmsBox}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold transition-colors shadow-sm"
                  >
                    <MessageSquare className="h-3 w-3" />
                    SMS
                  </button>

                  {/* SMS Compose Floating Box */}
                  {showSmsBox && (
                    <div ref={smsBoxRef} className="absolute z-[60] top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
                      {/* Header */}
                      <div className="bg-blue-500 px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-white" />
                          <span className="text-xs font-bold text-white">Send SMS</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/70 font-mono">{customer.phone}</span>
                          <button
                            onClick={() => setShowSmsBox(false)}
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-3">
                        <textarea
                          value={smsText}
                          onChange={(e) => setSmsText(e.target.value)}
                          placeholder="Type your message..."
                          rows={5}
                          autoFocus
                          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleSendSms();
                            }
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-400">
                            {smsText.length}/160
                            {smsText.length > 160 && <span className="text-red-400 ml-0.5 font-bold"> (multi-part)</span>}
                          </span>
                          <Button
                            size="sm"
                            onClick={handleSendSms}
                            disabled={smsSending || !smsText.trim()}
                            className="h-7 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {smsSending ? (
                              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending</>
                            ) : (
                              <><MessageSquare className="h-3 w-3 mr-1" /> Send SMS</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Orders Badge */}
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200/70">
                  <ShoppingBag className="h-3 w-3 text-gray-500" />
                  <span className="text-[11px] font-semibold text-gray-600">{details.totalOrders} orders</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Order History Toggle */}
          {details && details.orders.length > 0 && (
            <div>
              <button
                onClick={() => { setShowHistory(!showHistory); setExpandedOrder(null); }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Order History
                </span>
                {showHistory ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>

              {showHistory && (
                <div className="mt-1.5 max-h-60 overflow-y-auto smooth-scroll rounded-lg border border-gray-100">
                  {details.orders.map((order) => (
                    <div key={order.id} className="border-b border-gray-100 last:border-0">
                      <button
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="w-full text-left px-2.5 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-bold text-gray-700">{order.invoiceNo}</span>
                              <span className="text-[9px] text-gray-400 font-medium uppercase px-1.5 py-0.5 rounded bg-gray-100">
                                {order.paymentMethod}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDate(order.date)} at {formatTime(order.date)}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-xs font-bold text-gray-800 tabular-nums">৳{order.grandTotal.toFixed(2)}</p>
                            {order.dueAmount > 0 && (
                              <p className="text-[10px] font-bold text-red-500 tabular-nums">Due: ৳{order.dueAmount.toFixed(2)}</p>
                            )}
                          </div>
                          <div className="ml-1.5">
                            {expandedOrder === order.id ? (
                              <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded: Invoice Items */}
                      {expandedOrder === order.id && (
                        <div className="px-2.5 pb-2.5 bg-gray-50/50">
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-2.5 py-1.5 flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                              <span>Item</span>
                              <div className="flex gap-4">
                                <span className="w-10 text-right">Qty</span>
                                <span className="w-16 text-right">Amount</span>
                              </div>
                            </div>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 py-1.5 flex justify-between items-center text-[11px] border-t border-gray-100"
                              >
                                <span className="text-gray-700 truncate mr-2 font-medium">{item.productName}</span>
                                <div className="flex gap-4 shrink-0">
                                  <span className="w-10 text-right text-gray-500 tabular-nums">
                                    {item.quantity}{item.unit}
                                  </span>
                                  <span className="w-16 text-right text-gray-800 font-semibold tabular-nums">
                                    ৳{item.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {/* Invoice Totals */}
                            <div className="border-t border-gray-200 px-2.5 py-1.5 space-y-0.5">
                              {order.totalDiscount > 0 && (
                                <div className="flex justify-between text-[10px] text-amber-600">
                                  <span>Discount</span>
                                  <span className="tabular-nums">-৳{order.totalDiscount.toFixed(2)}</span>
                                </div>
                              )}
                              {order.deliveryCharge > 0 && (
                                <div className="flex justify-between text-[10px] text-gray-500">
                                  <span>Delivery</span>
                                  <span className="tabular-nums">+৳{order.deliveryCharge.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-[11px] font-bold text-gray-800">
                                <span>Total</span>
                                <span className="tabular-nums">৳{order.grandTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Paid</span>
                                <span className="tabular-nums">৳{order.receivedAmount.toFixed(2)}</span>
                              </div>
                              {order.changeAmount > 0 && (
                                <div className="flex justify-between text-[10px] text-[#2D9F73]">
                                  <span>Change</span>
                                  <span className="tabular-nums">৳{order.changeAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {order.dueAmount > 0 && (
                                <div className="flex justify-between text-[10px] font-bold text-red-600">
                                  <span>Due</span>
                                  <span className="tabular-nums">৳{order.dueAmount.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (results.length > 0) {
                    setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
                    setOpen(true);
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (results.length > 0) {
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
                    setOpen(true);
                  }
                } else if (e.key === 'Escape') {
                  setOpen(false);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (results.length > 0) {
                    const chosen = selectedIndex >= 0 && selectedIndex < results.length
                      ? results[selectedIndex]
                      : results[0];
                    handleSelect(chosen);
                  } else if (query.trim()) {
                    const isDigits = /^\d+$/.test(query.replace(/[\s+-]/g, ''));
                    if (isDigits) {
                      setNewPhone(query.trim());
                      setNewName('');
                    } else {
                      setNewName(query.trim());
                      setNewPhone('');
                    }
                    setShowCreate(true);
                    setOpen(false);
                  }
                }
              }}
              placeholder="Search customer by name or phone…"
              className="pl-9 pr-12 h-10 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm"
              onFocus={() => results.length > 0 && setOpen(true)}
            />
            <button
              onClick={() => {
                const isDigits = /^\d+$/.test(query.replace(/[\s+-]/g, ''));
                if (isDigits && query.trim()) {
                  setNewPhone(query.trim());
                  setNewName('');
                } else if (query.trim()) {
                  setNewName(query.trim());
                  setNewPhone('');
                }
                setShowCreate(true);
                setOpen(false);
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-gradient-to-br from-[#3FB98C] to-[#2D9F73] hover:from-[#2D9F73] hover:to-[#2D9F73] text-white flex items-center justify-center shadow-md shadow-[#3FB98C]/30 transition-all hover:scale-105 active:scale-95"
              title="Add new customer"
              aria-label="Add new customer"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>

          {open && (results.length > 0 || loading) && (
            <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-72 overflow-y-auto smooth-scroll divide-y divide-gray-100">
              {loading && (
                <div className="px-3 py-2.5 text-xs text-gray-400 flex items-center gap-2">
                  <div className="h-3.5 w-3.5 border-2 border-[#3FB98C]/30 border-t-[#3FB98C] rounded-full animate-spin" />
                  Searching customers…
                </div>
              )}
              {!loading && results.map((c, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected ? 'bg-[#3FB98C]/10 text-gray-900' : 'hover:bg-[#3FB98C]/5 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-[#3FB98C] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          <HighlightCustomerText text={c.name} query={query} />
                        </p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                          <HighlightCustomerText text={c.phone} query={query} />
                        </p>
                        {c.address && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <HighlightCustomerText text={c.address} query={query} />
                          </p>
                        )}
                      </div>
                    </div>
                    {c.loyaltyPoints !== undefined && c.loyaltyPoints > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Award className="h-2.5 w-2.5 text-amber-600" />
                        {c.loyaltyPoints} pts
                      </span>
                    )}
                  </button>
                );
              })}
              {!loading && results.length === 0 && query.trim() && (
                <div className="px-3 py-3 text-center">
                  <p className="text-xs text-gray-400 mb-2">No customer found for &ldquo;{query}&rdquo;</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const isDigits = /^\d+$/.test(query.replace(/[\s+-]/g, ''));
                      if (isDigits) {
                        setNewPhone(query.trim());
                        setNewName('');
                      } else {
                        setNewName(query.trim());
                        setNewPhone('');
                      }
                      setShowCreate(true);
                      setOpen(false);
                    }}
                    className="h-7 text-xs rounded-lg bg-[#3FB98C] hover:bg-[#2D9F73]"
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Create customer
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-base font-bold text-gray-800">Add New Customer</h3>
            <Input placeholder="Full name *" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10" />
            <Input placeholder="Phone number *" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-10" />
            <Input placeholder="Email (optional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-10" />
            <Input placeholder="Address (optional)" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="h-10" />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 h-10 rounded-xl">Cancel</Button>
              <Button onClick={handleCreate} className="flex-1 h-10 rounded-xl bg-[#3FB98C] hover:bg-[#2D9F73]">Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
