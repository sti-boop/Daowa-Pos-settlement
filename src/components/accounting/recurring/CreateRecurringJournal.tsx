'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, FilePlus, AlertTriangle, Repeat, CalendarDays } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';
import { LedgerSearchSelect } from '../voucher/LedgerSearchSelect';

interface Ledger { id: string; name: string; groupName: string; }

type EntryRow = {
  ledgerId: string;
  ledgerName: string;
  debit: string;
  credit: string;
  taxRate: string;
  taxAmount: string;
};

const SCHEDULE_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Half-Yearly', label: 'Half-Yearly' },
  { value: 'Yearly', label: 'Yearly' },
];

const VOUCHER_TYPE_OPTIONS = ['Journal', 'Payment', 'Receipt', 'Sales', 'Purchase', 'Contra', 'Credit Note', 'Debit Note'];

const blankEntry = (): EntryRow => ({ ledgerId: '', ledgerName: '', debit: '', credit: '', taxRate: '0', taxAmount: '0' });

function getEntryWarnings(entry: EntryRow, idx: number): string[] {
  const warnings: string[] = [];
  const d = parseFloat(entry.debit);
  const c = parseFloat(entry.credit);
  const hasDebit = entry.debit !== '' && d > 0;
  const hasCredit = entry.credit !== '' && c > 0;

  if (hasDebit && hasCredit) {
    warnings.push('Both debit and credit cannot be filled in the same entry');
  }
  if (d < 0) warnings.push('Debit amount cannot be negative');
  if (c < 0) warnings.push('Credit amount cannot be negative');
  if (entry.ledgerId && !hasDebit && !hasCredit && entry.debit === '' && entry.credit === '') {
    warnings.push('Enter a debit or credit amount');
  }
  return warnings;
}

export function CreateRecurringJournal() {
  const { setView, refreshKey, triggerRefresh } = useAppStore();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState('Monthly');
  const [frequency, setFrequency] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [narration, setNarration] = useState('');
  const [voucherTypeName, setVoucherTypeName] = useState('Journal');
  const [entries, setEntries] = useState<EntryRow[]>([blankEntry(), blankEntry()]);

  const fetchLedgers = useCallback(async () => {
    const res = await fetch('/api/ledgers');
    const data = await res.json();
    setLedgers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchLedgers();
    })();
    return () => { cancelled = true; };
  }, [fetchLedgers, refreshKey]);

  const updateEntry = (idx: number, field: string, value: string) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'ledgerId') {
      const ledger = ledgers.find(l => l.id === value);
      if (ledger) updated[idx].ledgerName = ledger.name;
    }
    if (field === 'debit' || field === 'credit') {
      const amount = parseFloat(value) || 0;
      const taxRate = parseFloat(updated[idx].taxRate) || 0;
      if (taxRate > 0 && amount > 0) {
        updated[idx].taxAmount = String(parseFloat((amount * taxRate / 100).toFixed(2)));
      } else {
        updated[idx].taxAmount = '0';
      }
    }
    if (field === 'taxRate') {
      const rate = parseFloat(value) || 0;
      const debitAmt = parseFloat(updated[idx].debit) || 0;
      const creditAmt = parseFloat(updated[idx].credit) || 0;
      const baseAmt = debitAmt > 0 ? debitAmt : creditAmt;
      updated[idx].taxAmount = rate > 0 && baseAmt > 0 ? String(parseFloat((baseAmt * rate / 100).toFixed(2))) : '0';
    }
    setEntries(updated);
  };

  const addEntry = () => setEntries([...entries, blankEntry()]);

  const removeEntry = (idx: number) => {
    if (entries.length <= 2) return toast.error('Minimum 2 entries required');
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const isValid = Math.abs(diff) < 0.01 && entries.every(e => e.ledgerId && (parseFloat(e.debit) > 0 || parseFloat(e.credit) > 0));

  const entryWarnings: Record<number, string[]> = {};
  entries.forEach((e, i) => {
    const w = getEntryWarnings(e, i);
    if (w.length > 0) entryWarnings[i] = w;
  });
  const hasAnyWarning = Object.keys(entryWarnings).length > 0;

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Enter a name for the recurring journal');
    if (!startDate) return toast.error('Start date is required');

    if (hasAnyWarning) {
      const firstWarningIdx = Object.keys(entryWarnings)[0];
      const msgs = entryWarnings[Number(firstWarningIdx)];
      return toast.error(`Entry ${Number(firstWarningIdx) + 1}: ${msgs[0]}`);
    }

    if (!isValid) {
      return toast.error('Entries must balance (Debit = Credit) and all fields filled');
    }

    try {
      const res = await fetch('/api/recurring-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scheduleType,
          frequency,
          startDate,
          endDate: endDate || null,
          nextDate: startDate,
          narration: narration.trim(),
          voucherTypeName,
          isActive: true,
          entries: entries.map(e => ({
            ledgerId: e.ledgerId,
            ledgerName: e.ledgerName,
            debit: parseFloat(e.debit) || 0,
            credit: parseFloat(e.credit) || 0,
            taxRate: parseFloat(e.taxRate) || 0,
            taxAmount: parseFloat(e.taxAmount) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(`Recurring journal "${name}" created successfully`);
      triggerRefresh();
      setView('recurring-journals');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create recurring journal');
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded" />{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setView('recurring-journals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">New Recurring Journal</h2>
          <p className="text-sm text-muted-foreground">Set up an automated journal entry that repeats on a schedule</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Journal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Journal Name *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Monthly Rent Payment"
              />
            </div>
            <div className="grid gap-2">
              <Label>Voucher Type</Label>
              <Select value={voucherTypeName} onValueChange={setVoucherTypeName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOUCHER_TYPE_OPTIONS.map(vt => (
                    <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Narration</Label>
              <Input
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="Brief description of this recurring entry"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Schedule
          </CardTitle>
          <CardDescription className="text-xs">Define when and how often this journal should be generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label>Frequency *</Label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Every (interval) *</Label>
              <Input
                type="number"
                min={1}
                value={frequency}
                onChange={e => setFrequency(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                {frequency === 1
                  ? `Once per ${scheduleType.toLowerCase()}`
                  : `Every ${frequency} ${scheduleType.toLowerCase()}(s)`
                }
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no end date</p>
            </div>
          </div>

          {/* Schedule Summary */}
          <div className="mt-4 rounded-lg bg-muted/50 border p-3">
            <p className="text-sm">
              <span className="font-medium">Schedule Summary:</span>{' '}
              This journal will create a <Badge variant="outline" className="text-xs mx-1">{voucherTypeName}</Badge> voucher
              {frequency === 1
                ? ` every ${scheduleType.toLowerCase()}`
                : ` every ${frequency} ${scheduleType.toLowerCase()}(s)`
              }
              , starting from <span className="font-medium">{new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              {endDate && ` until ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}.
              {' '}Each execution will create a voucher with the entries defined below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Entries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <FilePlus className="h-4 w-4" /> Journal Entries (Template)
              </CardTitle>
              <CardDescription className="text-xs">
                These entries will be repeated each time the journal is executed. Debit must equal Credit.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addEntry}>
              <Plus className="h-3 w-3 mr-1" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Ledger Account</TableHead>
                  <TableHead className="w-36 text-right">Debit (BDT)</TableHead>
                  <TableHead className="w-36 text-right">Credit (BDT)</TableHead>
                  <TableHead className="w-24 text-right">VAT %</TableHead>
                  <TableHead className="w-28 text-right">Tax Amt</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => {
                  const warnings = entryWarnings[idx] || [];
                  const hasBoth = (parseFloat(entry.debit) || 0) > 0 && (parseFloat(entry.credit) || 0) > 0;
                  const hasNeg = (parseFloat(entry.debit) || 0) < 0 || (parseFloat(entry.credit) || 0) < 0;
                  const rowHasError = hasBoth || hasNeg;

                  return (
                    <TableRow key={idx} className={rowHasError ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                      <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                      <TableCell>
                        <LedgerSearchSelect
                          ledgers={ledgers}
                          value={entry.ledgerId}
                          onChange={v => updateEntry(idx, 'ledgerId', v)}
                          placeholder="Search ledger account..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className={`text-right ${hasBoth ? 'border-red-400 dark:border-red-600 focus-visible:ring-red-400' : ''}`}
                          placeholder="0.00"
                          value={entry.debit}
                          onChange={e => updateEntry(idx, 'debit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className={`text-right ${hasBoth ? 'border-red-400 dark:border-red-600 focus-visible:ring-red-400' : ''}`}
                          placeholder="0.00"
                          value={entry.credit}
                          onChange={e => updateEntry(idx, 'credit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-right" value={entry.taxRate} onChange={e => updateEntry(idx, 'taxRate', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <div className="text-right font-mono text-sm">{formatCurrency(parseFloat(entry.taxAmount) || 0)}</div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEntry(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Entry-level Warnings */}
          {hasAnyWarning && (
            <div className="border-t border-red-200 dark:border-red-800 px-4 py-3 bg-red-50/50 dark:bg-red-950/20 space-y-1.5">
              {Object.entries(entryWarnings).map(([idx, msgs]) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Entry #{Number(idx) + 1}:</span>{' '}
                    {msgs.join('. ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="border-t px-4 py-3 bg-muted/30">
            <div className="flex items-center justify-end gap-8">
              <div className="text-sm">
                <span className="text-muted-foreground">Total Debit: </span>
                <span className="font-bold font-mono">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total Credit: </span>
                <span className="font-bold font-mono">{formatCurrency(totalCredit)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Difference: </span>
                <span className={`font-bold font-mono ${Math.abs(diff) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(diff))}
                  {Math.abs(diff) < 0.01 ? ' (Balanced)' : ' (Unbalanced)'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Templates Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Common Recurring Journal Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Monthly Rent', desc: 'Dr: Rent & Utilities / Cr: Bank Account', schedule: 'Monthly' },
              { name: 'Salary Payment', desc: 'Dr: Salary & Wages / Cr: Bank or Cash', schedule: 'Monthly' },
              { name: 'Depreciation', desc: 'Dr: Depreciation / Cr: Fixed Asset', schedule: 'Monthly' },
              { name: 'Loan EMI', desc: 'Dr: Loans (Liability) + Interest / Cr: Bank', schedule: 'Monthly' },
              { name: 'Insurance Premium', desc: 'Dr: Insurance / Cr: Bank Account', schedule: 'Yearly' },
              { name: 'Internet Bill', desc: 'Dr: Rent & Utilities / Cr: Bank - bKash', schedule: 'Monthly' },
            ].map(tmpl => (
              <div key={tmpl.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{tmpl.name}</span>
                  <Badge variant="outline" className="text-[10px]">{tmpl.schedule}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tmpl.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setView('recurring-journals')}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || !name.trim()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Repeat className="h-4 w-4 mr-1.5" /> Create Recurring Journal
        </Button>
      </div>
    </div>
  );
}