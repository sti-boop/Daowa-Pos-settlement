'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Scale, TrendingUp, Building, BookOpen, FileText,
  ShoppingCart, Package, Receipt, ArrowRight, Loader2
} from 'lucide-react';
import { useAppStore, type ReportType, type AppView } from '@/lib/accounting-store';

const REPORT_LIST: { key: ReportType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { key: 'trial-balance', label: 'Trial Balance', description: 'Debit & Credit balances of all ledgers', icon: <Scale className="h-5 w-5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  { key: 'pnl', label: 'Profit & Loss', description: 'Income vs Expense for a period', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' },
  { key: 'balance-sheet', label: 'Balance Sheet', description: 'Assets vs Liabilities snapshot', icon: <Building className="h-5 w-5" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
  { key: 'day-book', label: 'Day Book', description: 'All transactions date-wise', icon: <BookOpen className="h-5 w-5" />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
  { key: 'ledger-report', label: 'Ledger Report', description: 'Individual ledger account statement', icon: <FileText className="h-5 w-5" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200' },
  { key: 'sales-register', label: 'Sales Register', description: 'All sales transactions with details', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  { key: 'purchase-register', label: 'Purchase Register', description: 'All purchase transactions with details', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
  { key: 'stock-summary', label: 'Stock Summary', description: 'Current stock position of all items', icon: <Package className="h-5 w-5" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
  { key: 'vat-report', label: 'VAT Report', description: 'Input/Output VAT summary', icon: <Receipt className="h-5 w-5" />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' },
];

export function ReportsPage() {
  const { setView, setSelectedReport, setSelectedLedgerId } = useAppStore();
  const [ledgers, setLedgers] = useState<{ id: string; name: string }[]>([]);
  const [selectedLedger, setSelectedLedger] = useState('');

  useEffect(() => {
    fetch('/api/ledgers').then(r => r.json()).then(setLedgers);
  }, []);

  const handleOpen = (reportKey: ReportType) => {
    if (reportKey === 'ledger-report') {
      if (!selectedLedger) return;
      setSelectedLedgerId(selectedLedger);
    }
    setSelectedReport(reportKey);
    setView('view-report');
  };

  return (
    <div className="space-y-6">
      {/* Ledger Report Selector */}
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 w-full">
              <Label className="text-sm font-medium">Select Ledger for Ledger Report</Label>
              <Select value={selectedLedger} onValueChange={setSelectedLedger}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a ledger..." /></SelectTrigger>
                <SelectContent>
                  {ledgers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleOpen('ledger-report')}
              disabled={!selectedLedger}
              className="mt-6 shrink-0 bg-emerald-600 hover:bg-emerald-700"
            >
              View Report <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_LIST.filter(r => r.key !== 'ledger-report').map(report => (
          <Card
            key={report.key}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
            onClick={() => handleOpen(report.key)}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${report.color}`}>
                  {report.icon}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CardTitle className="text-base">{report.label}</CardTitle>
              <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}