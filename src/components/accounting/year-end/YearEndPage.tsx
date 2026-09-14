'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CalendarCheck2, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export function YearEndPage() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/company', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) setCompany(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const runClose = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/year-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`Year-end closed — ${data.voucherNumber}`);
      } else {
        toast.error(data.error || 'Year-end close failed');
      }
    } catch {
      toast.error('Year-end close failed');
    } finally {
      setRunning(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  const fYearEnd = company?.fYearEnd ? company.fYearEnd.split('T')[0] : '—';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Year-End Close</h2>
        <p className="text-sm text-gray-500">Transfer the period profit/loss to Retained Earnings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <CalendarCheck2 className="h-4 w-4" />
              <span className="text-xs font-medium">Financial year end</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{fYearEnd}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-medium">Company</span>
            </div>
            <p className="text-xl font-bold text-gray-800 mt-1">{company?.name || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-xs font-medium">Currency</span>
            </div>
            <p className="text-xl font-bold text-gray-800 mt-1">{company?.currency || 'BDT'}</p>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-[#2D9F73]" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span className="font-bold text-gray-800">
                {result.voucherNumber} — {result.netProfit >= 0 ? 'Net profit' : 'Net loss'} ৳{Math.abs(result.netProfit).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Income ৳{result.income.toFixed(2)} · Expense ৳{result.expense.toFixed(2)} — transferred to Retained Earnings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-gray-600">
              Closing the year posts a single journal: <Badge variant="secondary">JV</Badge> Dr Profit &amp; Loss A/c / Cr Retained Earnings
              (reversed for a loss). This runs <strong>once</strong> per fiscal year — the result is locked by a guard reference
              so it cannot be double-posted.
            </p>
            <Button onClick={() => setConfirmOpen(true)}>
              Run year-end close
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the fiscal year?</AlertDialogTitle>
            <AlertDialogDescription>
              This transfers the accumulated Profit &amp; Loss to Retained Earnings for the year ending {fYearEnd}.
              It can only be done once per year and cannot be undone from this screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runClose} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Confirm close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
