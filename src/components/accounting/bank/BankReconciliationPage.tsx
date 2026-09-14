'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Landmark, CheckCircle2, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';

interface BankEntry {
  id: string;
  voucherNumber: string;
  date: string;
  narration: string;
  debit: number;
  credit: number;
  reconciled: boolean;
}

interface BankRow {
  ledgerId: string;
  name: string;
  bookBalance: number;
  entries: BankEntry[];
  reconciledCount: number;
  unreconciledCount: number;
}

interface Reconciliation {
  id: string;
  bankLedgerName: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  date: string;
  notes: string;
}

export function BankReconciliationPage() {
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankRow | null>(null);
  const [statementBalance, setStatementBalance] = useState('');
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bank-reconciliation', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setBanks(data.banks || []);
        setReconciliations(data.reconciliations || []);
      } else {
        toast.error(data.error || 'Failed to load');
      }
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openReconcile = (bank: BankRow) => {
    setSelectedBank(bank);
    setStatementBalance(String(bank.bookBalance));
    setMatchedIds(new Set(bank.entries.filter((e) => !e.reconciled).map((e) => e.id)));
    setNotes('');
  };

  const toggleMatch = (id: string) => {
    setMatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!selectedBank) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankLedgerName: selectedBank.name,
          statementBalance: Number(statementBalance),
          matchedVoucherIds: Array.from(matchedIds),
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Reconciled ${selectedBank.name} (difference ৳${data.reconciliation.difference.toFixed(2)})`);
        setSelectedBank(null);
        await load();
      } else {
        toast.error(data.error || 'Failed to reconcile');
      }
    } catch {
      toast.error('Failed to reconcile');
    } finally {
      setSaving(false);
    }
  };

  const matchedAmount = selectedBank
    ? selectedBank.entries.filter((e) => matchedIds.has(e.id)).reduce((s, e) => s + e.debit, 0)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Bank Reconciliation</h2>
          <p className="text-sm text-gray-500">Match settlement batches and deposits against your bank statement</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <Card key={bank.ledgerId}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-[#2D9F73]" />
                    <span className="font-bold text-gray-800">{bank.name}</span>
                  </div>
                  <Badge variant={bank.unreconciledCount === 0 ? 'default' : 'outline'}>
                    {bank.unreconciledCount === 0 ? 'Reconciled' : `${bank.unreconciledCount} pending`}
                  </Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Book balance</p>
                    <p className="text-2xl font-extrabold text-gray-800">৳{bank.bookBalance.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{bank.entries.length} transactions</p>
                    <p className="text-sm text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5 inline text-[#2D9F73]" /> {bank.reconciledCount} matched
                    </p>
                  </div>
                </div>
                <Button className="w-full" variant="outline" size="sm" onClick={() => openReconcile(bank)}>
                  Reconcile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reconciliations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Reconciliation history</h3>
            <div className="space-y-2">
              {reconciliations.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                  <div>
                    <span className="font-medium text-gray-700">{r.bankLedgerName}</span>
                    <span className="text-gray-400 ml-2">{r.date}</span>
                    {r.notes && <span className="text-gray-400 ml-2">— {r.notes}</span>}
                  </div>
                  <div className="text-gray-500">
                    book ৳{r.bookBalance.toFixed(2)} · stmt ৳{r.statementBalance.toFixed(2)} ·
                    <span className={r.difference === 0 ? 'text-[#2D9F73]' : 'text-amber-600'}>
                      {' '}diff ৳{r.difference.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedBank} onOpenChange={(open) => !open && setSelectedBank(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reconcile {selectedBank?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Book balance</Label>
                <div className="rounded-lg bg-gray-50 px-3 py-2 font-bold text-gray-800">
                  ৳{selectedBank?.bookBalance.toFixed(2)}
                </div>
              </div>
              <div>
                <Label>Statement balance (৳)</Label>
                <Input
                  type="number"
                  value={statementBalance}
                  onChange={(e) => setStatementBalance(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Mark transactions as cleared</Label>
              <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                {selectedBank?.entries.map((e) => {
                  const isMatched = matchedIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleMatch(e.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        isMatched ? 'bg-emerald-50' : ''
                      }`}
                    >
                      {isMatched ? (
                        <CheckCircle2 className="h-4 w-4 text-[#2D9F73] shrink-0" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-300 shrink-0" />
                      )}
                      <span className="font-mono text-xs">{e.voucherNumber}</span>
                      <span className="text-gray-500 flex-1 truncate">{e.narration}</span>
                      <span className="text-gray-700 tabular-nums">৳{(e.debit - e.credit).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Matched total: ৳{matchedAmount.toFixed(2)}
              </p>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBank(null)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Save reconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
