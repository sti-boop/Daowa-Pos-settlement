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
import { Plus, Loader2, RefreshCw, TrendingDown, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface FixedAsset {
  id: string;
  name: string;
  groupName: string;
  cost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  method: string;
  rate: number;
  purchaseDate: string;
  accumulatedDepreciation: number;
  lastDepreciationDate: string | null;
  netBookValue: number;
  monthlyDepreciation: number;
  isActive: boolean;
}

const ASSET_GROUPS = [
  'Land & Building',
  'Furniture & Fixtures',
  'Electrical, Computers & IT Equipment',
  'Vehicles',
  'Machinery',
];

export function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    groupName: 'Electrical, Computers & IT Equipment',
    cost: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    method: 'straight_line',
    rate: '10',
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fixed-assets', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setAssets(data);
      else toast.error(data.error || 'Failed to load assets');
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalAccum = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
  const totalNbv = assets.reduce((s, a) => s + a.netBookValue, 0);

  const createAsset = async () => {
    if (!form.name || !Number(form.cost)) {
      toast.error('Name and cost are required');
      return;
    }
    try {
      const res = await fetch('/api/fixed-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          groupName: form.groupName,
          cost: Number(form.cost),
          salvageValue: Number(form.salvageValue),
          usefulLifeMonths: Number(form.usefulLifeMonths),
          method: form.method,
          rate: Number(form.rate),
          purchaseDate: form.purchaseDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Asset "${data.name}" registered`);
        setOpen(false);
        setForm((f) => ({ ...f, name: '', cost: '', salvageValue: '0' }));
        await load();
      } else {
        toast.error(data.error || 'Failed to register asset');
      }
    } catch {
      toast.error('Failed to register asset');
    }
  };

  const runDepreciation = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/fixed-assets/depreciate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.posted) {
          toast.success(`Depreciation posted — ${data.voucherNumber} (৳${data.amount.toFixed(2)})`);
        } else {
          toast.info(data.message || 'Nothing to depreciate');
        }
        await load();
      } else {
        toast.error(data.error || 'Depreciation failed');
      }
    } catch {
      toast.error('Depreciation failed');
    } finally {
      setRunning(false);
    }
  };

  const deleteAsset = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the asset register?`)) return;
    try {
      const res = await fetch(`/api/fixed-assets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Asset removed');
        await load();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove asset');
      }
    } catch {
      toast.error('Failed to remove asset');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Fixed Assets &amp; Depreciation</h2>
          <p className="text-sm text-gray-500">Register assets, track depreciation, post automatically</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={runDepreciation} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            Run depreciation
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add asset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium">Total cost</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">৳{totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-gray-500">Accumulated depreciation</div>
            <p className="text-2xl font-extrabold text-gray-700 mt-1">৳{totalAccum.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-gray-500">Net book value</div>
            <p className="text-2xl font-extrabold text-[#2D9F73] mt-1">৳{totalNbv.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Accum. dep.</TableHead>
                <TableHead className="text-right">NBV</TableHead>
                <TableHead className="text-right">Monthly dep.</TableHead>
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
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    No fixed assets registered yet. Add one to start depreciating.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.groupName}</Badge>
                    </TableCell>
                    <TableCell className="text-right">৳{a.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-600">৳{a.accumulatedDepreciation.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">৳{a.netBookValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-[#2D9F73]">৳{a.monthlyDepreciation.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => deleteAsset(a.id, a.name)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register fixed asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Asset name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Delivery Van 02" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Group</Label>
                <Select value={form.groupName} onValueChange={(v) => setForm({ ...form, groupName: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purchase date</Label>
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost (৳)</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div>
                <Label>Salvage value (৳)</Label>
                <Input type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Useful life (months)</Label>
                <Input type="number" value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} />
              </div>
              <div>
                <Label>Depreciation method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight line</SelectItem>
                    <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.method === 'reducing_balance' && (
              <div>
                <Label>Annual rate (%)</Label>
                <Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createAsset}>Save asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
