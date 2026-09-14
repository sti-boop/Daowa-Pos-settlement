'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Search, Eye, Download, Upload, FileSpreadsheet, X } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';

interface Ledger {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: string;
  closingBalance?: number;
  closingType?: string;
  bin?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface LedgerGroup {
  id: string;
  name: string;
  nature: string;
}

const NATURE_TABS = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

const natureColors: Record<string, { badge: string; row: string; tabActive: string }> = {
  Asset: {
    badge: 'bg-[#4169E1]/15 text-[#4169E1]',
    row: 'hover:bg-[#4169E1]/5 border-l-2 border-l-[#4169E1]',
    tabActive: 'data-[state=active]:bg-[#4169E1]/15 data-[state=active]:text-[#4169E1]',
  },
  Liability: {
    badge: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    row: 'hover:bg-[#F59E0B]/5 border-l-2 border-l-[#F59E0B]',
    tabActive: 'data-[state=active]:bg-[#F59E0B]/15 data-[state=active]:text-[#F59E0B]',
  },
  Equity: {
    badge: 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
    row: 'hover:bg-[#8B5CF6]/5 border-l-2 border-l-[#8B5CF6]',
    tabActive: 'data-[state=active]:bg-[#8B5CF6]/15 data-[state=active]:text-[#8B5CF6]',
  },
  Income: {
    badge: 'bg-[#10B981]/15 text-[#10B981]',
    row: 'hover:bg-[#10B981]/5 border-l-2 border-l-[#10B981]',
    tabActive: 'data-[state=active]:bg-[#10B981]/15 data-[state=active]:text-[#10B981]',
  },
  Expense: {
    badge: 'bg-[#EE1127]/15 text-[#EE1127]',
    row: 'hover:bg-[#EE1127]/5 border-l-2 border-l-[#EE1127]',
    tabActive: 'data-[state=active]:bg-[#EE1127]/15 data-[state=active]:text-[#EE1127]',
  },
};

export function LedgersPage() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Ledger | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshKey, setSelectedLedgerId, setView, setSelectedReport, ledgerGroupFilter, setLedgerGroupFilter } = useAppStore();

  const [form, setForm] = useState({
    name: '', groupName: '', openingBalance: 0, balanceType: 'Dr',
    bin: '', phone: '', email: '', address: '',
  });

  // Apply store-based group filter
  useEffect(() => {
    if (ledgerGroupFilter) {
      setFilterGroup(ledgerGroupFilter);
      setLedgerGroupFilter(null);
    }
  }, [ledgerGroupFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [gRes, lRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/ledgers?includeGroup=true'),
      ]);
      if (!cancelled) {
        setGroups(await gRes.json());
        setLedgers(await lRes.json());
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = ledgers.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.groupName.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === 'all' || l.groupName === filterGroup;
    return matchSearch && matchGroup;
  });

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', groupName: '', openingBalance: 0, balanceType: 'Dr', bin: '', phone: '', email: '', address: '' });
    setDialogOpen(true);
  };

  const openEdit = (l: Ledger) => {
    setEditItem(l);
    setForm({
      name: l.name, groupName: l.groupName, openingBalance: l.openingBalance,
      balanceType: l.balanceType, bin: l.bin || '', phone: l.phone || '',
      email: l.email || '', address: l.address || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.groupName) return toast.error('Name and Group are required');
    try {
      const url = '/api/ledgers';
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      toast.success(editItem ? 'Ledger updated' : 'Ledger created');
      setDialogOpen(false);
      const [gRes, lRes] = await Promise.all([fetch('/api/groups'), fetch('/api/ledgers?includeGroup=true')]);
      setGroups(await gRes.json()); setLedgers(await lRes.json());
    } catch {
      toast.error('Failed to save ledger');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/ledgers?id=${deleteId}`, { method: 'DELETE' });
    toast.success('Ledger deactivated');
    setDeleteId(null);
    const [gRes, lRes] = await Promise.all([fetch('/api/groups'), fetch('/api/ledgers?includeGroup=true')]);
    setGroups(await gRes.json()); setLedgers(await lRes.json());
  };

  const viewLedgerReport = (id: string) => {
    setSelectedLedgerId(id);
    setSelectedReport('ledger-report');
    setView('view-report');
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

  const exportCsv = () => {
    const headers = ['Name', 'Group', 'Opening Balance', 'Balance Type', 'BIN', 'Phone', 'Email', 'Address'];
    const rows = ledgers.map(l => [
      l.name, l.groupName, l.openingBalance.toString(), l.balanceType,
      l.bin || '', l.phone || '', l.email || '', l.address || '',
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledgers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${ledgers.length} ledgers to CSV`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ledgers/import', { method: 'POST', body: formData });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Import failed');
      } else {
        const { created, skipped, errors } = result;
        if (errors && errors.length > 0) {
          toast.warning(`Imported ${created}, Skipped ${skipped}, ${errors.length} errors`);
        } else {
          toast.success(`Imported ${created} ledgers successfully`);
        }
        // Refresh data
        const [gRes, lRes] = await Promise.all([fetch('/api/groups'), fetch('/api/ledgers?includeGroup=true')]);
        setGroups(await gRes.json()); setLedgers(await lRes.json());
        setImportOpen(false);
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSampleCsv = () => {
    const sample = 'Name,Group,Opening Balance,Balance Type,BIN,Phone,Email,Address\nSample Ledger,Cash In Hand,0,Dr,,,';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger_import_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  const uniqueGroups = [...new Set(ledgers.map(l => l.groupName))].sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ledgers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={ledgers.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create Ledger
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({ledgers.length})</TabsTrigger>
          {NATURE_TABS.map(nature => (
            <TabsTrigger key={nature} value={nature} className={natureColors[nature]?.tabActive || ''}>
              {nature} ({ledgers.filter(l => {
                const g = groups.find(gr => gr.name === l.groupName);
                return g?.nature === nature;
              }).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {['all', ...NATURE_TABS].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Opening Balance</TableHead>
                      <TableHead className="text-right">Closing Balance</TableHead>
                      <TableHead>BIN</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
                    ) : filtered.filter(l => {
                      if (tab === 'all') return true;
                      const g = groups.find(gr => gr.name === l.groupName);
                      return g?.nature === tab;
                    }).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No ledgers found</TableCell></TableRow>
                    ) : (
                      filtered.filter(l => {
                        if (tab === 'all') return true;
                        const g = groups.find(gr => gr.name === l.groupName);
                        return g?.nature === tab;
                      }).map(l => {
                        const g = groups.find(gr => gr.name === l.groupName);
                        const nature = g?.nature || '';
                        const colors = natureColors[nature];
                        return (
                          <TableRow key={l.id} className={colors?.row || ''}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors?.badge || 'bg-muted text-muted-foreground'}`}>{l.groupName}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(l.openingBalance)} {l.balanceType}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(l.closingBalance ?? l.openingBalance)} {l.closingType ?? l.balanceType}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{l.bin || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewLedgerReport(l.id)} title="View Ledger"><Eye className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Ledger' : 'Create Ledger'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Ledger Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. State Bank of India" />
            </div>
            <div className="grid gap-2">
              <Label>Under Group *</Label>
              <Select value={form.groupName} onValueChange={v => setForm(f => ({ ...f, groupName: v }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name} ({g.nature})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Opening Balance</Label>
                <Input type="number" value={form.openingBalance || ''} onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Balance Type</Label>
                <Select value={form.balanceType} onValueChange={v => setForm(f => ({ ...f, balanceType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr">Debit (Dr)</SelectItem>
                    <SelectItem value="Cr">Credit (Cr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>BIN</Label>
              <Input value={form.bin} onChange={e => setForm(f => ({ ...f, bin: e.target.value }))} placeholder="e.g. 1234567890" />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Ledgers from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file with ledger account data. Required columns: Name, Group. Optional: Opening Balance, Balance Type, BIN, Phone, Email, Address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            {importing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm">Importing...</span>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={downloadSampleCsv}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample CSV
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Ledger</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the ledger. Existing vouchers will remain.</AlertDialogDescription>
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
