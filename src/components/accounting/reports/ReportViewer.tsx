'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, type ReportType } from '@/lib/accounting-store';
import { exportReportPdf, buildTablesForReport } from '@/lib/report-pdf';

interface CompanyInfo {
  name: string; address?: string; phone?: string; email?: string;
  bin?: string; tin?: string; logo?: string;
}

const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

const REPORT_TITLES: Record<ReportType, string> = {
  'trial-balance': 'Trial Balance',
  'pnl': 'Profit & Loss Statement',
  'balance-sheet': 'Balance Sheet',
  'day-book': 'Day Book',
  'ledger-report': 'Ledger Report',
  'sales-register': 'Sales Register',
  'purchase-register': 'Purchase Register',
  'stock-summary': 'Stock Summary',
  'vat-report': 'VAT Report',
};

export function ReportViewer() {
  const { selectedReport, setView, selectedLedgerId, ledgers: allLedgers } = useAppStore();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerName, setLedgerName] = useState('');
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(d => { if (d.id) setCompany(d); });
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError('');
    try {
      let url = `/api/reports?report=${selectedReport}&to=${toDate}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (selectedReport === 'ledger-report' && selectedLedgerId) url += `&ledgerId=${selectedLedgerId}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Report failed');
      setData(json);

      // Set ledger name for ledger report
      if (selectedReport === 'ledger-report' && json.ledger) {
        setLedgerName(json.ledger.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    }
    setLoading(false);
  }, [selectedReport, fromDate, toDate, selectedLedgerId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handlePrint = () => window.print();
  const handleBack = () => setView('reports');

  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!selectedReport || !data) return toast.error('Report data not ready');
    setExportingPdf(true);
    try {
      const { tables, summaryBlocks, periodLabel, note } = buildTablesForReport(selectedReport, data as Record<string, unknown>);
      const rangeLabel = fromDate ? `${fromDate} to ${toDate}` : `As at ${toDate}`;
      const safeName = (REPORT_TITLES[selectedReport] || 'report').replace(/[^a-z0-9]+/gi, '_');
      const result = await exportReportPdf(
        {
          title: REPORT_TITLES[selectedReport] || 'Report',
          company: company ? { name: company.name, address: company.address, phone: company.phone, logo: company.logo } : null,
          periodLabel: periodLabel || rangeLabel,
          tables,
          summaryBlocks,
          note,
        },
        `${safeName}_${toDate}.pdf`,
      );
      if (!result.ok) throw new Error(result.error);
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (!selectedReport) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-lg font-semibold">{REPORT_TITLES[selectedReport]}</h2>
            {selectedReport === 'ledger-report' && ledgerName && (
              <p className="text-sm text-muted-foreground">{ledgerName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2 items-end">
            {(selectedReport === 'pnl' || selectedReport === 'day-book' || selectedReport === 'sales-register' || selectedReport === 'purchase-register' || selectedReport === 'vat-report' || selectedReport === 'ledger-report') && (
              <div className="grid gap-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40 h-9" />
              </div>
            )}
            <div className="grid gap-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40 h-9" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchReport} className="h-9">Refresh</Button>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrint} title="Print"><Printer className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleExportPdf} disabled={exportingPdf || loading || !!error} title="Export PDF">
            {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-12"><div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="text-muted-foreground text-sm">Loading report...</p></div></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="py-12"><div className="flex flex-col items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-destructive text-sm">{error}</p></div></CardContent></Card>
      ) : (
        <div className="print:shadow-none" ref={reportRef}>
          {/* Print Header — only visible when printing */}
          {company && (
            <div className="print-header mb-6 pb-4 border-b-2 border-black">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {company.logo && (
                    <img src={company.logo} alt="" className="h-16 w-16 object-contain" />
                  )}
                  <div>
                    <h1 className="text-xl font-bold">{company.name || 'Company'}</h1>
                    {company.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      {company.phone && <span>Phone: {company.phone}</span>}
                      {company.email && <span>Email: {company.email}</span>}
                    </div>
                    {(company.bin || company.tin) && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {company.bin && <span>BIN: {company.bin}</span>}
                        {company.tin && <span>TIN: {company.tin}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold">{REPORT_TITLES[selectedReport]}</h2>
                  {selectedReport === 'ledger-report' && ledgerName && (
                    <p className="text-sm">{ledgerName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {fromDate || 'Beginning'} to {toDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Printed: {new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            </div>
          )}
          {selectedReport === 'trial-balance' && <TrialBalanceView data={data as { rows: { ledgerName: string; groupName: string; nature: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number }} />}
          {selectedReport === 'pnl' && <PnLView data={data as { fromDate: string; toDate: string; income: { group: string; amount: number }[]; expense: { group: string; amount: number }[]; totalIncome: number; totalExpense: number; netProfit: number }} />}
          {selectedReport === 'balance-sheet' && <BalanceSheetView data={data as { toDate: string; assets: { group: string; amount: number }[]; liabilities: { group: string; amount: number }[]; totalAssets: number; totalLiabilities: number; difference: number }} />}
          {selectedReport === 'day-book' && <DayBookView data={data as { fromDate: string; toDate: string; rows: { date: string; voucherType: string; voucherNumber: string; narration: string; debitTotal: number; creditTotal: number; entries: { ledgerName: string; debit: number; credit: number }[] }[]; totalDebit: number; totalCredit: number }} />}
          {selectedReport === 'ledger-report' && <LedgerReportView data={data as { ledger: { name: string; group: string; nature: string }; openingBalance: number; openingType: string; from: string; to: string; entries: { date: string; voucherType: string; voucherNumber: string; narration: string; debit: number; credit: number; balance: number; balanceType: string }[]; totalDebit: number; totalCredit: number; closingBalance: number; closingType: string }} />}
          {selectedReport === 'sales-register' && <SalesRegisterView data={data as { rows: { id: string; date: string; voucherNumber: string; party: string; amount: number; tax: number; items: { name: string; qty: number; rate: number; value: number }[] }[]; total: number; totalTax: number; fromDate: string; toDate: string }} />}
          {selectedReport === 'purchase-register' && <SalesRegisterView data={data as { rows: { id: string; date: string; voucherNumber: string; party: string; amount: number; tax: number; items: { name: string; qty: number; rate: number; value: number }[] }[]; total: number; totalTax: number; fromDate: string; toDate: string }} isPurchase />}
          {selectedReport === 'stock-summary' && <StockSummaryView data={data as { rows: { id: string; name: string; group: string; hsnCode: string; unit: string; openingQty: number; inwardQty: number; outwardQty: number; closingQty: number; closingValue: number; minStockLevel: number; isLow: boolean }[]; totalValue: number; totalItems: number; lowStockCount: number; lowStockItems: { name: string; closingQty: number; minLevel: number }[] }} />}
          {selectedReport === 'vat-report' && <VATReportView data={data as { fromDate: string; toDate: string; outputVAT: number; inputVAT: number; netPayable: number; netRefund: number }} />}
        </div>
      )}
    </div>
  );
}

function TrialBalanceView({ data }: { data: { rows: { ledgerName: string; groupName: string; nature: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number } }) {
  const natureColors: Record<string, string> = {
    Asset: 'bg-blue-100 text-blue-800', Liability: 'bg-red-100 text-red-800',
    Income: 'bg-emerald-100 text-emerald-800', Expense: 'bg-orange-100 text-orange-800',
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Trial Balance</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ledger</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.ledgerName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.groupName}</TableCell>
                <TableCell><Badge variant="secondary" className={`text-xs ${natureColors[r.nature] || ''}`}>{r.nature}</Badge></TableCell>
                <TableCell className="text-right font-mono">{r.debit > 0 ? formatCurrency(r.debit) : ''}</TableCell>
                <TableCell className="text-right font-mono">{r.credit > 0 ? formatCurrency(r.credit) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/30">
              <TableCell colSpan={3} className="text-right">Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalDebit)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalCredit)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3} className="text-right text-muted-foreground">Difference</TableCell>
              <TableCell colSpan={2} className="text-right font-mono">
                {data.totalDebit !== data.totalCredit ? (
                  <Badge variant="destructive">{formatCurrency(Math.abs(data.totalDebit - data.totalCredit))} difference</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Balanced</Badge>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PnLView({ data }: { data: { fromDate: string; toDate: string; income: { group: string; amount: number }[]; expense: { group: string; amount: number }[]; totalIncome: number; totalExpense: number; netProfit: number } }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
          <CardDescription>{data.fromDate || 'Beginning'} to {data.toDate}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Income Side */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-700">Income (Credits)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.income.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.group}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-emerald-50 dark:bg-emerald-950/30">
                  <TableCell>Total Income</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">{formatCurrency(data.totalIncome)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense Side */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Expenses (Debits)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.expense.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.group}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-red-50 dark:bg-red-950/30">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right font-mono text-red-700">{formatCurrency(data.totalExpense)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit */}
      <Card className={data.netProfit >= 0 ? 'border-emerald-300' : 'border-red-300'}>
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-lg font-semibold">
            {data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
          </span>
          <span className={`text-2xl font-bold font-mono ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(Math.abs(data.netProfit))}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSheetView({ data }: { data: { toDate: string; assets: { group: string; amount: number }[]; liabilities: { group: string; amount: number }[]; totalAssets: number; totalLiabilities: number; difference: number } }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Balance Sheet</CardTitle>
          <CardDescription>As at {data.toDate}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700">Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.assets.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.group}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(a.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-blue-50 dark:bg-blue-950/30">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right font-mono text-blue-700">{formatCurrency(data.totalAssets)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.liabilities.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.group}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(l.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-red-50 dark:bg-red-950/30">
                  <TableCell>Total Liabilities & Equity</TableCell>
                  <TableCell className="text-right font-mono text-red-700">{formatCurrency(data.totalLiabilities)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {data.difference > 0 && (
        <Card className="border-orange-300 bg-orange-50/50 dark:bg-orange-950/10">
          <CardContent className="py-3 px-4 text-sm text-orange-700 dark:text-orange-400">
            <p className="font-semibold text-center">
              Difference: {formatCurrency(data.difference)}
            </p>
            <p className="text-xs text-center mt-1 text-orange-600/90 dark:text-orange-400/80">
              Assets exceed Liabilities &amp; Equity. This is expected when ledger opening balances
              are only partially entered — complete opening entries on both sides to balance the sheet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DayBookView({ data }: { data: { fromDate: string; toDate: string; rows: { date: string; voucherType: string; voucherNumber: string; narration: string; debitTotal: number; creditTotal: number; entries: { ledgerName: string; debit: number; credit: number }[] }[]; totalDebit: number; totalCredit: number } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Day Book</CardTitle>
        <CardDescription>{data.fromDate || 'All'} to {data.toDate}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Voucher No</TableHead>
              <TableHead>Ledger</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Narration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((v, vi) => (
              v.entries.map((e, ei) => (
                <TableRow key={`${vi}-${ei}`}>
                  {ei === 0 && (
                    <>
                      <TableCell rowSpan={v.entries.length} className="font-mono text-sm align-top">{v.date}</TableCell>
                      <TableCell rowSpan={v.entries.length} className="align-top"><Badge variant="secondary">{v.voucherType}</Badge></TableCell>
                      <TableCell rowSpan={v.entries.length} className="font-mono text-sm align-top">{v.voucherNumber}</TableCell>
                    </>
                  )}
                  <TableCell className="text-sm">{e.ledgerName}</TableCell>
                  <TableCell className="text-right font-mono">{e.debit > 0 ? formatCurrency(e.debit) : ''}</TableCell>
                  <TableCell className="text-right font-mono">{e.credit > 0 ? formatCurrency(e.credit) : ''}</TableCell>
                  {ei === 0 && (
                    <TableCell rowSpan={v.entries.length} className="text-xs text-muted-foreground align-top max-w-48 truncate">{v.narration}</TableCell>
                  )}
                </TableRow>
              ))
            ))}
            <TableRow className="font-bold bg-muted/30">
              <TableCell colSpan={4} className="text-right">Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalDebit)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalCredit)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LedgerReportView({ data }: { data: { ledger: { name: string; group: string; nature: string }; openingBalance: number; openingType: string; from: string; to: string; entries: { date: string; voucherType: string; voucherNumber: string; narration: string; debit: number; credit: number; balance: number; balanceType: string }[]; totalDebit: number; totalCredit: number; closingBalance: number; closingType: string } }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{data.ledger.name}</CardTitle>
        <CardDescription>Group: {data.ledger.group} | {data.ledger.nature}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vch No</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening */}
            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-medium">Opening Balance</TableCell>
              <TableCell className="text-right font-mono">{data.openingType === 'Dr' ? formatCurrency(data.openingBalance) : ''}</TableCell>
              <TableCell className="text-right font-mono">{data.openingType === 'Cr' ? formatCurrency(data.openingBalance) : ''}</TableCell>
              <TableCell className="text-right font-mono font-medium">{data.openingType} {formatCurrency(data.openingBalance)}</TableCell>
            </TableRow>

            {data.entries.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{e.date}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{e.voucherType}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{e.voucherNumber}</TableCell>
                <TableCell className="text-sm max-w-48 truncate">{e.narration}</TableCell>
                <TableCell className="text-right font-mono">{e.debit > 0 ? formatCurrency(e.debit) : ''}</TableCell>
                <TableCell className="text-right font-mono">{e.credit > 0 ? formatCurrency(e.credit) : ''}</TableCell>
                <TableCell className="text-right font-mono text-sm">{e.balanceType} {formatCurrency(e.balance)}</TableCell>
              </TableRow>
            ))}

            {/* Totals */}
            <TableRow className="font-bold bg-muted/30">
              <TableCell colSpan={4} className="text-right">Period Totals</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalDebit)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalCredit)}</TableCell>
              <TableCell />
            </TableRow>

            {/* Closing */}
            <TableRow className="font-bold bg-emerald-50 dark:bg-emerald-950/30">
              <TableCell colSpan={4} className="text-right">Closing Balance</TableCell>
              <TableCell colSpan={2} />
              <TableCell className="text-right font-mono text-emerald-700">{data.closingType} {formatCurrency(data.closingBalance)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SalesRegisterView({ data, isPurchase }: { data: { rows: { id: string; date: string; voucherNumber: string; party: string; amount: number; tax: number; items: { name: string; qty: number; rate: number; value: number }[] }[]; total: number; totalTax: number; fromDate: string; toDate: string }; isPurchase?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{isPurchase ? 'Purchase' : 'Sales'} Register</CardTitle>
        <CardDescription>{data.fromDate || 'All'} to {data.toDate}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vch No</TableHead>
              <TableHead>Party</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map(r => (
              <>
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <TableCell><span className="text-muted-foreground text-xs">{r.items.length > 0 ? (expandedId === r.id ? '▾' : '▸') : ''}</span></TableCell>
                  <TableCell className="font-mono text-sm">{r.date}</TableCell>
                  <TableCell className="font-mono text-sm">{r.voucherNumber}</TableCell>
                  <TableCell>{r.party}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.tax)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(r.amount + r.tax)}</TableCell>
                </TableRow>
                {expandedId === r.id && r.items.length > 0 && (
                  <TableRow key={`${r.id}-detail`} className="bg-muted/20">
                    <TableCell colSpan={7} className="px-8 py-2">
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="font-medium">Item</div>
                        <div className="text-right">Qty</div>
                        <div className="text-right">Rate</div>
                        <div className="text-right">Value</div>
                        {r.items.map((item, i) => (
                          <>
                            <div>{item.name}</div>
                            <div className="text-right font-mono">{item.qty}</div>
                            <div className="text-right font-mono">{formatCurrency(item.rate)}</div>
                            <div className="text-right font-mono">{formatCurrency(item.value)}</div>
                          </>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            <TableRow className="font-bold bg-muted/30">
              <TableCell colSpan={4} className="text-right">Total</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.total)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.totalTax)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(data.total + data.totalTax)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StockSummaryView({ data }: { data: { rows: { id: string; name: string; group: string; hsnCode: string; unit: string; openingQty: number; inwardQty: number; outwardQty: number; closingQty: number; closingValue: number; minStockLevel: number; isLow: boolean }[]; totalValue: number; totalItems: number; lowStockCount: number; lowStockItems: { name: string; closingQty: number; minLevel: number }[] } }) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{data.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Total Stock Value</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
            <p className={`text-2xl font-bold ${data.lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{data.lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Inward</TableHead>
                  <TableHead className="text-right">Outward</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map(r => (
                  <TableRow key={r.id} className={r.isLow ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell className="font-medium">{r.name} {r.isLow && <Badge variant="destructive" className="text-[10px] ml-1">LOW</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.group}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.openingQty} {r.unit}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-700">+{r.inwardQty}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-700">-{r.outwardQty}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{r.closingQty} {r.unit}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(r.closingValue)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={6} className="text-right">Total Stock Value</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(data.totalValue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VATReportView({ data }: { data: { fromDate: string; toDate: string; outputVAT: number; inputVAT: number; netPayable: number; netRefund: number } }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">VAT Summary</CardTitle>
          <CardDescription>{data.fromDate || 'All'} to {data.toDate}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Output VAT */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-emerald-700">Output VAT (Collected on Sales)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow className="font-bold bg-emerald-50 dark:bg-emerald-950/30"><TableCell>Total Output VAT</TableCell><TableCell className="text-right font-mono text-emerald-700">{formatCurrency(data.outputVAT)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Input VAT */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-blue-700">Input VAT (Paid on Purchases)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow className="font-bold bg-blue-50 dark:bg-blue-950/30"><TableCell>Total Input VAT</TableCell><TableCell className="text-right font-mono text-blue-700">{formatCurrency(data.inputVAT)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className={data.netPayable > 0 ? 'border-red-300' : 'border-emerald-300'}>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-semibold">
              {data.netPayable > 0 ? 'Net VAT Payable' : 'Net VAT Refund'}
            </span>
          </div>
          <span className={`text-2xl font-bold font-mono ${data.netPayable > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatCurrency(data.netPayable > 0 ? data.netPayable : data.netRefund)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}