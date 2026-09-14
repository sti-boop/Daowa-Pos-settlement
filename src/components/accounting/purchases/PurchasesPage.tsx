'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseItem {
  name: string;
  category?: string;
  quantity: number;
  rate: number;
  unit: string;
  batchNo?: string;
  expiryDate?: string;
}

export function PurchasesPage() {
  const [supplierName, setSupplierName] = useState('');
  const [paidVia, setPaidVia] = useState('credit');
  const [bankName, setBankName] = useState('MTB Bank');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<PurchaseItem>({
    name: '',
    category: '',
    quantity: 1,
    rate: 0,
    unit: 'pcs',
    batchNo: '',
    expiryDate: '',
  });

  const total = items.reduce((s, i) => s + i.quantity * i.rate, 0);

  const addItem = () => {
    if (!draft.name || draft.quantity <= 0 || draft.rate < 0) {
      toast.error('Item name, quantity and rate are required');
      return;
    }
    setItems((prev) => [...prev, { ...draft }]);
    setDraft({ name: '', category: '', quantity: 1, rate: 0, unit: 'pcs', batchNo: '', expiryDate: '' });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: supplierName || undefined,
          paidVia,
          bankLedgerName: paidVia === 'bank' ? bankName : undefined,
          items,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Purchase recorded — ${data.voucherNumber} (৳${data.totalAmount.toFixed(2)})`);
        setItems([]);
        setSupplierName('');
      } else {
        toast.error(data.error || 'Failed to record purchase');
      }
    } catch {
      toast.error('Failed to record purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Purchases (Stock-In)</h2>
        <p className="text-sm text-gray-500">Record supplier purchases — posts a Purchase voucher (PV) and restocks inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Square Pharmaceuticals" />
              </div>
              <div>
                <Label>Paid via</Label>
                <Select value={paidVia} onValueChange={setPaidVia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (supplier payable)</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {paidVia === 'bank' && (
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

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Items</h3>
                <Badge variant="outline">৳{total.toFixed(2)}</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div className="col-span-2">
                  <Input placeholder="Item name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div>
                  <Input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                </div>
                <div>
                  <Input type="number" placeholder="Qty" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
                </div>
                <div>
                  <Input type="number" placeholder="Rate ৳" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) })} />
                </div>
                <div className="flex gap-1">
                  <Input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                  <Button size="sm" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                          No items yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((i, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{i.name}</TableCell>
                          <TableCell>{i.quantity}{i.unit}</TableCell>
                          <TableCell className="text-right">৳{i.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">৳{(i.quantity * i.rate).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
            <div className="text-3xl font-extrabold text-gray-800">৳{total.toFixed(2)}</div>
            <p className="text-xs text-gray-500">
              Posts <Badge variant="secondary">PV voucher</Badge> — Dr Purchase Cost, Cr {paidVia === 'credit' ? (supplierName || 'Supplier') : paidVia === 'cash' ? 'Counter Cash' : bankName}.
              Stock items are automatically added to inventory and the POS product stock is restocked where matched.
            </p>
            <Button className="w-full" onClick={submit} disabled={saving || items.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-1" />}
              Record purchase
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
