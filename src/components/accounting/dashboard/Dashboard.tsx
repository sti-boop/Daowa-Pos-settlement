'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Pencil } from 'lucide-react';
import {
  TrendingDown, FileText, Landmark, Wallet,
  TrendingUp, ArrowRight, CreditCard, Banknote, Building2, Users,
  Boxes
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/accounting-store';
import { KpiCard, type KpiVariant } from './KpiCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardData {
  periodLabel?: string;
  periodFrom?: string;
  periodTo?: string;
  company: { name: string } | null;
  vouchersThisMonth: number;
  salesThisMonth: number;
  purchaseThisMonth: number;
  ledgerCount: number;
  cashInHand: number;
  cashAtBank: number;
  recentVouchers: { id: string; date: string; voucherType: { name: string }; voucherNumber: string; narration: string; totalAmount: number; entries: { ledgerName: string; debit: number; credit: number }[] }[];
  monthlySales: { month: string; amount: number }[];
  topItems: { name: string; qty: number; value: number }[];
  totalReceivables: number;
  totalPayables: number;
  inventory: {
    value: number;
    updatedAt: string | null;
  };
}

const COLORS = ['#4A90E2', '#E86B8C', '#50C878', '#5B7CFF', '#FF6B6B', '#FFA07A', '#8A5CF9', '#5D7A92'];

const CHART_COLORS = ['#4A90E2', '#5B7CFF', '#E86B8C', '#50C878', '#8A5CF9', '#FFA07A'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);
}

// KPI variant mapping for vibrant 3D cards
const kpiVariants: KpiVariant[] = [
  'income',
  'expenses',
  'receivables',
  'payables',
  'vouchers',
  'ledgers',
  'cash',
  'bank',
];

export function Dashboard() {
  const [result, setResult] = useState<{ period: string; data: DashboardData } | null>(null);
  const [period, setPeriod] = useState('this-month');
  const { setView, setSelectedReport, setSelectedLedgerId, setVoucherListFilter, setLedgerGroupFilter, setSelectedVoucherType, setVoucherListDates, triggerRefresh } = useAppStore();

  // Inventory value edit state (external system value, entered manually)
  const [inventoryEditOpen, setInventoryEditOpen] = useState(false);
  const [editInventoryValue, setEditInventoryValue] = useState('');
  const [savingInventory, setSavingInventory] = useState(false);

  // Load dashboard data whenever the selected period changes.
  // Stale-while-loading: previous period data stays visible until new data arrives
  // only when periods differ; skeleton shows on first load / period switch.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard?period=${period}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setResult({ period, data: d }); });
    return () => { cancelled = true; };
  }, [period]);

  const loading = !result || result.period !== period;
  const data = result?.data;

  const reloadCurrentPeriod = () => {
    fetch(`/api/dashboard?period=${period}`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setResult({ period, data: d }); });
  };

  const handleSaveInventoryValue = async () => {
    const value = parseFloat(editInventoryValue);
    if (isNaN(value) || value < 0) return toast.error('Enter a valid non-negative amount');
    setSavingInventory(true);
    try {
      const res = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryValue: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      toast.success(`Inventory value updated to ${formatCurrency(value)}`);
      setInventoryEditOpen(false);
      reloadCurrentPeriod();
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update inventory value');
    } finally {
      setSavingInventory(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[95px] rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[380px] rounded-2xl" />
          <Skeleton className="h-[380px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard</p>;

  const goToVouchers = (type: string | null) => {
    setVoucherListFilter(type);
    setVoucherListDates(data?.periodFrom && data?.periodTo && data.periodFrom !== '1970-01-01' ? { from: data.periodFrom, to: data.periodTo } : null);
    setView('voucher-list');
  };

  const kpis = [
    { title: `Income (${data.periodLabel || 'This Month'})`, value: formatCurrency(data.salesThisMonth), icon: <TrendingUp className="h-3.5 w-3.5" />, subtitle: 'Revenue this period', variant: kpiVariants[0] as KpiVariant, action: () => goToVouchers('Income') },
    { title: `Expenses (${data.periodLabel || 'This Month'})`, value: formatCurrency(data.purchaseThisMonth), icon: <Wallet className="h-3.5 w-3.5" />, subtitle: 'Total expenses', variant: kpiVariants[1] as KpiVariant, action: () => goToVouchers('Expense') },
    { title: 'Receivables', value: formatCurrency(data.totalReceivables), icon: <Users className="h-3.5 w-3.5" />, subtitle: 'Amount to collect', variant: kpiVariants[2] as KpiVariant, action: () => { setLedgerGroupFilter('Receivables'); setView('ledgers'); } },
    { title: 'Payables', value: formatCurrency(data.totalPayables), icon: <CreditCard className="h-3.5 w-3.5" />, subtitle: 'Amount to pay', variant: kpiVariants[3] as KpiVariant, action: () => { setLedgerGroupFilter('Payables'); setView('ledgers'); } },
    { title: `Vouchers (${data.periodLabel || 'This Month'})`, value: String(data.vouchersThisMonth), icon: <FileText className="h-3.5 w-3.5" />, subtitle: 'Total entries', variant: kpiVariants[4] as KpiVariant, action: () => goToVouchers(null) },
    { title: 'Active Ledgers', value: String(data.ledgerCount), icon: <Landmark className="h-3.5 w-3.5" />, subtitle: 'Chart of accounts', variant: kpiVariants[5] as KpiVariant, action: () => { setLedgerGroupFilter(null); setView('ledgers'); } },
    { title: 'Cash in Hand', value: formatCurrency(data.cashInHand), icon: <Banknote className="h-3.5 w-3.5" />, subtitle: 'Physical cash', variant: kpiVariants[6] as KpiVariant, action: () => { setLedgerGroupFilter('Cash In Hand'); setView('ledgers'); } },
    { title: 'Cash at Bank', value: formatCurrency(data.cashAtBank), icon: <Building2 className="h-3.5 w-3.5" />, subtitle: 'Bank balances', variant: kpiVariants[7] as KpiVariant, action: () => { setLedgerGroupFilter('Cash at Bank'); setView('ledgers'); } },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Financial overview for <span className="font-semibold text-foreground">{data.periodLabel || 'This Month'}</span></span>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[170px] rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="fy">This Fiscal Year</SelectItem>
            <SelectItem value="last-fy">Last Fiscal Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards — Compact Light-Shaded Glassmorphism */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4" style={{ perspective: '1000px' }}>
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            variant={kpi.variant}
            onClick={kpi.action}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Trend Chart */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Income Trend</CardTitle>
            <CardDescription>Last 6 months income performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthlySales} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} width={48} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#4A90E2" radius={[6, 6, 0, 0]} name="Income" maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Income Sources */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Income Sources</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.topItems}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.topItems.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No income data yet. Create income/receipt vouchers to see top sources.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Position Summary */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Cash Position
                </CardTitle>
                <CardDescription>Current cash balances</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setLedgerGroupFilter(null); setView('ledgers'); }}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cash in Hand</p>
                    <p className="text-xs text-muted-foreground">Counter cash, safe, petty cash</p>
                  </div>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(data.cashInHand)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-sky-100 dark:bg-sky-900/50 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cash at Bank</p>
                    <p className="text-xs text-muted-foreground">All bank accounts</p>
                  </div>
                </div>
                <span className="text-lg font-bold font-mono text-sky-700 dark:text-sky-400">{formatCurrency(data.cashAtBank)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm font-medium">Total Cash</p>
                </div>
                <span className="text-lg font-bold font-mono">{formatCurrency(data.cashInHand + data.cashAtBank)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Vouchers */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Vouchers</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setVoucherListFilter(null); setVoucherListDates(null); setView('voucher-list'); }}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentVouchers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.recentVouchers.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{v.voucherType.name} - {v.voucherNumber}</p>
                      <p className="text-xs text-muted-foreground">{v.date} {v.narration ? `| ${v.narration}` : ''}</p>
                    </div>
                    <span className="text-sm font-semibold ml-2">{formatCurrency(v.totalAmount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No vouchers created yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Inventory Value — managed by external backend software, entered manually */}
      {data.inventory && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[#8A5CF9]" />
                  Current Inventory Value
                </CardTitle>
                <CardDescription>
                  {data.inventory.updatedAt
                    ? `Last updated ${new Date(data.inventory.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'Set the value from your inventory system'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => { setEditInventoryValue(String(data.inventory.value ?? 0)); setInventoryEditOpen(true); }}>
                <Pencil className="h-3 w-3" /> Update
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border p-6 bg-gradient-to-br from-[#8A5CF9]/5 to-transparent">
              <p className="text-xs text-muted-foreground mb-1">Inventory value (from external system)</p>
              <p className="text-4xl font-bold font-mono text-[#8A5CF9] tabular-nums">
                {formatCurrency(data.inventory.value ?? 0)}
              </p>
              {!data.inventory.updatedAt && (
                <p className="text-xs text-muted-foreground mt-3">
                  No value set yet — click Update to enter the current inventory value from your inventory management software.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory value edit dialog */}
      <Dialog open={inventoryEditOpen} onOpenChange={setInventoryEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-[#8A5CF9]" /> Update Inventory Value
            </DialogTitle>
            <DialogDescription>
              Enter the current inventory value calculated by your external inventory system.
              {data.inventory?.updatedAt && (
                <span className="block mt-1">
                  Current value: {formatCurrency(data.inventory.value ?? 0)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inventory-value">Inventory Value (BDT)</Label>
              <Input
                id="inventory-value"
                type="number"
                step="0.01"
                min="0"
                value={editInventoryValue}
                onChange={e => setEditInventoryValue(e.target.value)}
                placeholder="e.g. 150000"
                className="font-mono text-lg h-11"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveInventoryValue} disabled={savingInventory || editInventoryValue === ''}>
              {savingInventory ? 'Saving...' : 'Save Value'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
