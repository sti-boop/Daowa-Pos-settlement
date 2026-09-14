'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle, Boxes, FolderTree } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';

interface StockItem {
  id: string; name: string; groupName: string; hsnCode: string | null;
  vatRate: number; unit: string; openingQty: number; openingRate: number;
  openingValue: number; minStockLevel: number; isActive: boolean;
  transactions: { id: string; quantity: number; rate: number; type: string; date: string; createdAt: string }[];
}

interface StockGroup { id: string; name: string; parentName: string | null; }

export function StockItemsPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const { refreshKey } = useAppStore();

  const [form, setForm] = useState({
    name: '', groupName: '', hsnCode: '', vatRate: 0, unit: 'Nos',
    openingQty: 0, openingRate: 0, openingValue: 0, minStockLevel: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [gRes, iRes] = await Promise.all([
        fetch('/api/stock-groups').then(r => r.json()),
        fetch('/api/stock-items?transactions=true').then(r => r.json()),
      ]);
      if (!cancelled) { setGroups(gRes); setItems(iRes); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.hsnCode?.toLowerCase().includes(search.toLowerCase()) ||
    i.groupName.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', groupName: '', hsnCode: '', vatRate: 0, unit: 'Nos', openingQty: 0, openingRate: 0, openingValue: 0, minStockLevel: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setForm({
      name: item.name, groupName: item.groupName, hsnCode: item.hsnCode || '',
      vatRate: item.vatRate, unit: item.unit, openingQty: item.openingQty,
      openingRate: item.openingRate, openingValue: item.openingValue, minStockLevel: item.minStockLevel,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.groupName) return toast.error('Name and Group are required');
    try {
      const url = '/api/stock-items';
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      toast.success(editItem ? 'Item updated' : 'Item created');
      setDialogOpen(false);
      const [gRes2, iRes2] = await Promise.all([
        fetch('/api/stock-groups').then(r => r.json()),
        fetch('/api/stock-items?transactions=true').then(r => r.json()),
      ]);
      setGroups(gRes2); setItems(iRes2);
    } catch {
      toast.error('Failed to save item');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/stock-items?id=${deleteId}`, { method: 'DELETE' });
    toast.success('Item deactivated');
    setDeleteId(null);
    const [gRes2, iRes2] = await Promise.all([
      fetch('/api/stock-groups').then(r => r.json()),
      fetch('/api/stock-items?transactions=true').then(r => r.json()),
    ]);
    setGroups(gRes2); setItems(iRes2);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

  const getStockInfo = (item: StockItem) => {
    const inward = item.transactions.filter(t => t.type === 'Inward').reduce((s, t) => s + t.quantity, 0);
    const outward = item.transactions.filter(t => t.type === 'Outward').reduce((s, t) => s + t.quantity, 0);
    const closing = item.openingQty + inward - outward;
    return { inward, outward, closing: parseFloat(closing.toFixed(2)), isLow: closing <= item.minStockLevel };
  };

  // KPI summary
  const activeItems = items.filter(i => i.isActive);
  const totalStockValue = activeItems.reduce((s, i) => {
    const info = getStockInfo(i);
    return s + info.closing * i.openingRate;
  }, 0);
  const lowStockCount = activeItems.filter(i => getStockInfo(i).isLow).length;
  const groupCount = new Set(activeItems.map(i => i.groupName)).size;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#4A90E2]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#4A90E2]/15 p-2.5 rounded-xl">
              <Package className="h-5 w-5 text-[#4A90E2]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold tabular-nums">{activeItems.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#50C878]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#50C878]/15 p-2.5 rounded-xl">
              <Boxes className="h-5 w-5 text-[#50C878]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stock Value</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalStockValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`rounded-2xl border-0 shadow-sm bg-gradient-to-br ${lowStockCount > 0 ? 'from-red-500/15 to-transparent' : 'from-[#8A5CF9]/10 to-transparent'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${lowStockCount > 0 ? 'bg-red-500/15' : 'bg-[#8A5CF9]/15'}`}>
              <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? 'text-red-500' : 'text-[#8A5CF9]'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
              <p className={`text-xl font-bold tabular-nums ${lowStockCount > 0 ? 'text-red-600' : ''}`}>{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#E86B8C]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#E86B8C]/15 p-2.5 rounded-xl">
              <FolderTree className="h-5 w-5 text-[#E86B8C]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Groups Used</p>
              <p className="text-xl font-bold tabular-nums">{groupCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search medicines & products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">VAT%</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-foreground mb-1">No stock items found</p>
                  <p className="text-sm">Add medicines and healthcare products to track inventory</p>
                </TableCell></TableRow>
              ) : (
                filtered.map(item => {
                  const info = getStockInfo(item);
                  return (
                    <TableRow key={item.id} className={info.isLow ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell className="font-medium">{item.name} {info.isLow && <span className="text-red-500 text-xs ml-1">LOW</span>}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.groupName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{item.hsnCode || '-'}</TableCell>
                      <TableCell className="text-right">{item.vatRate}%</TableCell>
                      <TableCell className="text-right font-mono">{item.openingQty} {item.unit}</TableCell>
                      <TableCell className={`text-right font-mono font-medium ${info.isLow ? 'text-red-600' : ''}`}>{info.closing} {item.unit}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.openingRate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(info.closing * item.openingRate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Stock Item' : 'Add Stock Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Item Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Under Group *</Label>
                <Select value={form.groupName} onValueChange={v => setForm(f => ({ ...f, groupName: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Nos', 'Kg', 'Gm', 'Mg', 'Ltr', 'Ml', 'Box', 'Strip', 'Tube', 'Bottle', 'Pack'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>HSN Code</Label>
                <Input value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} placeholder="e.g. 30049099" />
              </div>
              <div className="grid gap-2">
                <Label>VAT Rate (%)</Label>
                <Select value={String(form.vatRate)} onValueChange={v => setForm(f => ({ ...f, vatRate: parseFloat(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Opening Qty</Label>
                <Input type="number" value={form.openingQty || ''} onChange={e => setForm(f => ({ ...f, openingQty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Opening Rate</Label>
                <Input type="number" value={form.openingRate || ''} onChange={e => setForm(f => ({ ...f, openingRate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Opening Value</Label>
                <Input type="number" value={form.openingValue || (form.openingQty * form.openingRate || '')} onChange={e => setForm(f => ({ ...f, openingValue: parseFloat(e.target.value) || 0 }))} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Min Stock Level (Alert)</Label>
              <Input type="number" value={form.minStockLevel || ''} onChange={e => setForm(f => ({ ...f, minStockLevel: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Item</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the stock item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}