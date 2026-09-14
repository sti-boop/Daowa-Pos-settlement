'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HandCoins, Loader2, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ReceivableRow {
  ledgerId: string;
  ledgerName: string;
  customerName: string;
  outstanding: number;
  aging: Record<string, number>;
}

export function ReceivablesPage() {
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiveFor, setReceiveFor] = useState<ReceivableRow | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [bankName, setBankName] = useState('MTB Bank');
  const [mfsProvider, setMfsProvider] = useState('bKash');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/receivables', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setRows(data);
      else toast.error(data.error || 'Failed to load receivables');
    } catch {
      toast.error('Failed to load receivables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  const submitPayment = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/receivables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledgerName: receiveFor?.ledgerName,
          customerName: receiveFor?.customerName,
          amount: amt,
          method,
          bankLedgerName: method === 'bank' ? bankName : undefined,
          mfsProvider: method === 'mfs' ? mfsProvider : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Payment recorded — ${data.voucherNumber} (৳${amt})`);
        setReceiveFor(null);
        setAmount('');
        await load();
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Accounts Receivable</h2>
          <p className="text-sm text-gray-500">Customer-wise outstanding balances with aging</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Customers with dues</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <HandCoins className="h-4 w-4" />
              <span className="text-xs font-medium">Total outstanding</span>
            </div>
            <p className="text-2xl font-extrabold text-red-600 mt-1">৳{totalOutstanding.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-xs font-medium">Overdue (&gt;30 days)</span>
            </div>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">
              ৳{rows.reduce((s, r) => s + (r.aging['31-60'] || 0) + (r.aging['61-90'] || 0) + (r.aging['90+'] || 0), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">0–30 days</TableHead>
                <TableHead className="text-right">31–60 days</TableHead>
                <TableHead className="text-right">61–90 days</TableHead>
                <TableHead className="text-right">90+ days</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    No outstanding receivables — everyone has paid. 🎉
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.ledgerId}>
                    <TableCell className="font-medium">{r.customerName}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">৳{r.outstanding.toFixed(2)}</TableCell>
                    <TableCell className="text-right">৳{(r.aging['0-30'] || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-600">৳{(r.aging['31-60'] || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-700">৳{(r.aging['61-90'] || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-600">৳{(r.aging['90+'] || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => { setReceiveFor(r); setAmount(String(r.outstanding)); }}>
                        <HandCoins className="h-3.5 w-3.5 mr-1" /> Receive
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!receiveFor} onOpenChange={(open) => !open && setReceiveFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive payment — {receiveFor?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (৳)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={0} />
            </div>
            <div>
              <Label>Paid via</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mfs">Mobile banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === 'bank' && (
              <div>
                <Label>Bank account</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTB Bank">MTB Bank</SelectItem>
                    <SelectItem value="BRAC Bank">BRAC Bank</SelectItem>
                    <SelectItem value="City Bank">City Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {method === 'mfs' && (
              <div>
                <Label>Wallet</Label>
                <Select value={mfsProvider} onValueChange={setMfsProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Nagad">Nagad</SelectItem>
                    <SelectItem value="Rocket">Rocket</SelectItem>
                    <SelectItem value="Upay">Upay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveFor(null)}>Cancel</Button>
            <Button onClick={submitPayment} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
