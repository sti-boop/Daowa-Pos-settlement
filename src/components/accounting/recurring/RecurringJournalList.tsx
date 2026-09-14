'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Plus, Play, Pause, Trash2, Eye, ArrowLeft, Clock, CheckCircle, AlertCircle, Repeat, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';

interface RecurringEntryData {
  id: string;
  ledgerId: string;
  ledgerName: string;
  debit: number;
  credit: number;
  taxRate: number;
  taxAmount: number;
  ledger?: { name: string; groupName: string };
}

interface VoucherRef {
  id: string;
  voucherNumber: string;
  date: string;
  createdAt: string;
}

interface RecurringJournalData {
  id: string;
  name: string;
  scheduleType: string;
  frequency: number;
  startDate: string;
  endDate: string | null;
  nextDate: string;
  narration: string;
  voucherTypeName: string;
  isActive: boolean;
  lastExecuted: string | null;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  entries: RecurringEntryData[];
  vouchers: VoucherRef[];
}

const SCHEDULE_LABELS: Record<string, string> = {
  Daily: 'Daily',
  Weekly: 'Weekly',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  'Half-Yearly': 'Half-Yearly',
  Yearly: 'Yearly',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFrequencyLabel(scheduleType: string, frequency: number): string {
  if (frequency === 1) return SCHEDULE_LABELS[scheduleType] || scheduleType;
  return `Every ${frequency} ${scheduleType.toLowerCase()}(s)`;
}

export function RecurringJournalList() {
  const { setView, refreshKey, triggerRefresh } = useAppStore();
  const [journals, setJournals] = useState<RecurringJournalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<RecurringJournalData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const fetchJournals = useCallback(async () => {
    let url = '/api/recurring-journals';
    if (filter !== 'all') url += `?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setJournals(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchJournals();
    })();
    return () => { cancelled = true; };
  }, [fetchJournals, refreshKey]);

  const handleToggle = async (journal: RecurringJournalData) => {
    try {
      const res = await fetch('/api/recurring-journals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: journal.id, action: 'toggle' }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      toast.success(`${journal.name} ${!journal.isActive ? 'activated' : 'paused'}`);
      triggerRefresh();
    } catch {
      toast.error('Failed to update journal');
    }
  };

  const handleExecute = async (journal: RecurringJournalData) => {
    if (!confirm(`Execute "${journal.name}" now? This will create a ${journal.voucherTypeName} voucher dated ${journal.nextDate}.`)) return;
    setExecuting(journal.id);
    try {
      const res = await fetch('/api/recurring-journals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: journal.id, action: 'execute' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const result = await res.json();
      toast.success(result.message);
      if (result.autoDeactivated) {
        toast.info('Journal auto-deactivated: end date reached.');
      }
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setExecuting(null);
    }
  };

  const handleRunAllDue = async () => {
    const today = new Date().toISOString().split('T')[0];
    const dueJournals = journals.filter(j => j.isActive && j.nextDate <= today);
    if (dueJournals.length === 0) return toast.info('No journals are due');
    if (!confirm(`Run ${dueJournals.length} due journal(s) now? This will create ${dueJournals.length} voucher(s).`)) return;

    setRunningAll(true);
    let ok = 0;
    let failed = 0;
    const createdNumbers: string[] = [];
    for (const journal of dueJournals) {
      try {
        const res = await fetch('/api/recurring-journals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: journal.id, action: 'execute' }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        ok++;
        if (result.voucher?.voucherNumber) createdNumbers.push(result.voucher.voucherNumber);
      } catch {
        failed++;
      }
    }
    setRunningAll(false);
    if (ok > 0 && failed === 0) {
      toast.success(`${ok} voucher(s) created: ${createdNumbers.join(', ')}`);
    } else if (ok > 0 && failed > 0) {
      toast.warning(`${ok} succeeded, ${failed} failed. Created: ${createdNumbers.join(', ')}`);
    } else {
      toast.error('All executions failed');
    }
    triggerRefresh();
  };

  const handleDelete = async () => {
    if (!selectedJournal) return;
    try {
      await fetch(`/api/recurring-journals?id=${selectedJournal.id}`, { method: 'DELETE' });
      toast.success(`"${selectedJournal.name}" deleted`);
      setDeleteOpen(false);
      setSelectedJournal(null);
      triggerRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const activeCount = journals.filter(j => j.isActive).length;
  const overdueCount = journals.filter(j => j.isActive && j.nextDate <= today).length;
  const totalAmount = journals.filter(j => j.isActive).reduce((s, j) => {
    return s + j.entries.reduce((es, e) => es + (e.debit || 0), 0);
  }, 0);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded" />{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Recurring Journals</h2>
          <p className="text-sm text-muted-foreground">Automate periodic accounting entries like rent, salaries, depreciation</p>
        </div>
        <div className="flex gap-2">
          {overdueCount > 0 && (
            <Button variant="outline" className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400" onClick={handleRunAllDue} disabled={runningAll}>
              <Zap className={`h-4 w-4 mr-1.5 ${runningAll ? 'animate-pulse' : ''}`} /> 
              {runningAll ? 'Running...' : `Run All Due (${overdueCount})`}
            </Button>
          )}
          <Button onClick={() => setView('create-recurring')} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> New Recurring Journal
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Journals</p>
            <p className="text-xl font-bold">{journals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Due for Execution</p>
            <p className="text-xl font-bold text-amber-600">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Monthly Value (Active)</p>
            <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Filter:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Journals</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Journal Table */}
      <Card>
        <CardContent className="p-0">
          {journals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Repeat className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No recurring journals yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first recurring journal to automate periodic entries</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setView('create-recurring')}>
                <Plus className="h-3 w-3 mr-1" /> Create Recurring Journal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Next Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Executed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map((journal) => {
                    const totalDebit = journal.entries.reduce((s, e) => s + (e.debit || 0), 0);
                    const isOverdue = journal.isActive && journal.nextDate <= today;

                    return (
                      <TableRow key={journal.id} className={!journal.isActive ? 'opacity-60' : ''}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{journal.name}</p>
                            {journal.narration && (
                              <p className="text-xs text-muted-foreground truncate max-w-48">{journal.narration}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {getFrequencyLabel(journal.scheduleType, journal.frequency)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(journal.startDate)}
                            {journal.endDate ? ` — ${formatDate(journal.endDate)}` : ' — Ongoing'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={`text-sm ${isOverdue ? 'text-amber-600 font-medium' : ''}`}>
                              {formatDate(journal.nextDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{journal.voucherTypeName}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{journal.executionCount}</span>
                          {journal.lastExecuted && (
                            <p className="text-xs text-muted-foreground">
                              Last: {formatDate(journal.lastExecuted.split('T')[0])}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {journal.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Pause className="h-3 w-3 mr-1" /> Paused
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="View details"
                              onClick={() => { setSelectedJournal(journal); setDetailOpen(true); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {journal.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                title="Execute now"
                                disabled={executing === journal.id}
                                onClick={() => handleExecute(journal)}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={journal.isActive ? 'Pause' : 'Activate'}
                              onClick={() => handleToggle(journal)}
                            >
                              {journal.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Delete"
                              onClick={() => { setSelectedJournal(journal); setDeleteOpen(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              {selectedJournal?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedJournal && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Schedule</p>
                  <p className="font-medium">{getFrequencyLabel(selectedJournal.scheduleType, selectedJournal.frequency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Voucher Type</p>
                  <p className="font-medium">{selectedJournal.voucherTypeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Start Date</p>
                  <p className="font-medium">{formatDate(selectedJournal.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">End Date</p>
                  <p className="font-medium">{selectedJournal.endDate ? formatDate(selectedJournal.endDate) : 'Ongoing'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Next Execution</p>
                  <p className="font-medium">{formatDate(selectedJournal.nextDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Times Executed</p>
                  <p className="font-medium">{selectedJournal.executionCount}</p>
                </div>
              </div>
              {selectedJournal.narration && (
                <div>
                  <p className="text-muted-foreground text-xs">Narration</p>
                  <p className="font-medium">{selectedJournal.narration}</p>
                </div>
              )}

              {/* Entries Table */}
              <div>
                <p className="text-muted-foreground text-xs mb-2">Journal Entries (template)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger</TableHead>
                      <TableHead className="text-right">Debit (BDT)</TableHead>
                      <TableHead className="text-right">Credit (BDT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedJournal.entries.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {e.ledgerName}
                          {e.ledger && <span className="text-muted-foreground ml-1">({e.ledger.groupName})</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Recent Vouchers */}
              {selectedJournal.vouchers.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Recent Generated Vouchers</p>
                  <div className="space-y-1.5">
                    {selectedJournal.vouchers.map(v => (
                      <div key={v.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <div>
                          <span className="font-mono text-sm">{v.voucherNumber}</span>
                          <span className="text-muted-foreground text-xs ml-2">{formatDate(v.date)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">Generated</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {selectedJournal?.isActive && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (selectedJournal) handleExecute(selectedJournal);
                  setDetailOpen(false);
                }}
              >
                <Play className="h-3.5 w-3.5 mr-1" /> Execute Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recurring Journal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{selectedJournal?.name}&quot;? This will not delete the vouchers already generated.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}