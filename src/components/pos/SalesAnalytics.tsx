'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BarChart3, TrendingUp, TrendingDown, ShoppingCart, Banknote, Package } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface SalesAnalyticsProps {
  open: boolean;
  onClose: () => void;
  onGenerateReport: () => void;
}

interface ComparisonData {
  today: { todaySales: number; todayRevenue: number; todayDue: number; totalItems: number };
  yesterday: { todaySales: number; todayRevenue: number; todayDue: number; totalItems: number };
  changePercent: { salesChange: number; revenueChange: number };
  hourlyData: number[];
}

interface PaymentStat {
  method: string;
  count: number;
  total: number;
}

export default function SalesAnalytics({ open, onClose, onGenerateReport }: SalesAnalyticsProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStat[]>([]);
  const [loading, setLoading] = useState(false);
  const prevOpenRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [comp, payments] = await Promise.all([
        apiFetch('/api/sales?comparison=true').then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/sales?today=true&payment-stats=true').then((r) => (r.ok ? r.json() : [])),
      ]);
      setComparison(comp);
      setPaymentStats(payments);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      prevOpenRef.current = true;
      fetchData();
    }
    if (!open) {
      prevOpenRef.current = false;
    }
  }, [open, fetchData]);

  const formatTaka = (n: number) => `৳${n.toFixed(2)}`;

  const methodColors: Record<string, string> = {
    cash: 'bg-[#2D9F73] text-white',
    bkash: 'bg-pink-500 text-white',
    nagad: 'bg-orange-500 text-white',
    rocket: 'bg-purple-500 text-white',
    card: 'bg-sky-500 text-white',
    due: 'bg-red-400 text-white',
    split: 'bg-teal-500 text-white',
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-4 py-3 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-[#3FB98C]" /> Sales Analytics
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-60px)] smooth-scroll">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-[#3FB98C]/30 border-t-[#3FB98C] rounded-full animate-spin" />
            </div>
          )}

          {!loading && comparison && (
            <>
              {/* Today vs Yesterday Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-[#3FB98C]" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Today Sales</span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-800">{comparison.today.todaySales}</p>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${comparison.changePercent.salesChange >= 0 ? 'text-[#2D9F73]' : 'text-red-500'}`}>
                    {comparison.changePercent.salesChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(comparison.changePercent.salesChange).toFixed(1)}% vs yesterday
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Banknote className="h-3.5 w-3.5 text-[#3FB98C]" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Revenue</span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-800">{formatTaka(comparison.today.todayRevenue)}</p>
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${comparison.changePercent.revenueChange >= 0 ? 'text-[#2D9F73]' : 'text-red-500'}`}>
                    {comparison.changePercent.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(comparison.changePercent.revenueChange).toFixed(1)}% vs yesterday
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Items Sold</span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-800">{comparison.today.totalItems}</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Banknote className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Due</span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-800">{formatTaka(comparison.today.todayDue)}</p>
                </div>
              </div>

              {/* Hourly Sparkline */}
              {comparison.hourlyData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Hourly Revenue (Last 7h)</h4>
                  <div className="flex items-end gap-1 h-20">
                    {comparison.hourlyData.map((val, i) => {
                      const max = Math.max(...comparison.hourlyData, 1);
                      const h = (val / max) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-[#2D9F73] to-[#3FB98C] min-h-[2px] transition-all"
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[8px] text-gray-400">{val > 0 ? `${(val / 1000).toFixed(0)}k` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method Breakdown */}
              {paymentStats.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Methods</h4>
                  <div className="space-y-2">
                    {paymentStats.map((p) => {
                      const totalAll = paymentStats.reduce((s, x) => s + x.total, 0);
                      const pct = totalAll > 0 ? (p.total / totalAll) * 100 : 0;
                      return (
                        <div key={p.method} className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColors[p.method] || 'bg-gray-200 text-gray-700'}`}>
                            {p.method.toUpperCase()}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#3FB98C] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{p.count}</span>
                          <span className="text-[10px] font-bold text-gray-800 w-16 text-right tabular-nums">{formatTaka(p.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={onGenerateReport}
            className="w-full h-10 rounded-xl bg-[#3FB98C] hover:bg-[#2D9F73] text-white font-bold text-sm transition-colors"
          >
            Generate Daily Report
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
