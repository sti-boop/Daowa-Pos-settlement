'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search, FolderTree, Package, Layers, Boxes } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';

interface StockGroup {
  id: string; name: string; parentName: string | null;
  _count?: { items: number };
  items?: { id: string }[];
}

export function StockGroupsPage() {
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { setView } = useAppStore();

  const [form, setForm] = useState({ name: '', parentName: '' });

  const loadGroups = async () => {
    const r = await fetch('/api/stock-groups');
    if (r.ok) setGroups(await r.json());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch('/api/stock-groups');
      if (!cancelled) { setGroups(await r.json()); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const itemCount = (g: StockGroup) => g._count?.items ?? g.items?.length ?? 0;
  const totalItems = groups.reduce((s, g) => s + itemCount(g), 0);
  const totalPrimary = groups.filter(g => !g.parentName).length;

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Group name required');
    const parentName = form.parentName === '__none__' ? '' : form.parentName;
    const res = await fetch('/api/stock-groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, parentName: parentName || null }),
    });
    if (!res.ok) return toast.error('Failed to create group (name may already exist)');
    toast.success('Stock group created');
    setDialogOpen(false);
    await loadGroups();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/stock-groups?id=${deleteId}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Failed to delete (group may have items)');
    toast.success('Stock group deleted');
    setDeleteId(null);
    await loadGroups();
  };

  // Build tree structure
  const roots = filtered.filter(g => !g.parentName);
  const getChildren = (parentName: string) => filtered.filter(g => g.parentName === parentName);
  // Count all descendant items (own + children) for a group
  const descendantItems = (g: StockGroup): number => {
    const kids = groups.filter(x => x.parentName === g.name);
    return itemCount(g) + kids.reduce((s, k) => s + descendantItems(k), 0);
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#4A90E2]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#4A90E2]/15 p-2.5 rounded-xl">
              <Layers className="h-5 w-5 text-[#4A90E2]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Groups</p>
              <p className="text-xl font-bold tabular-nums">{groups.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#50C878]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#50C878]/15 p-2.5 rounded-xl">
              <Package className="h-5 w-5 text-[#50C878]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-xl font-bold tabular-nums">{totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#8A5CF9]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#8A5CF9]/15 p-2.5 rounded-xl">
              <FolderTree className="h-5 w-5 text-[#8A5CF9]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Primary Groups</p>
              <p className="text-xl font-bold tabular-nums">{totalPrimary}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#E86B8C]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#E86B8C]/15 p-2.5 rounded-xl">
              <Boxes className="h-5 w-5 text-[#E86B8C]" />
            </div>
            <button className="text-left" onClick={() => setView('stock-items')}>
              <p className="text-xs text-muted-foreground hover:text-foreground transition-colors">Manage Items →</p>
              <p className="text-sm font-semibold">Go to Stock Items</p>
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stock groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setForm({ name: '', parentName: '' }); setDialogOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
              ) : roots.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-foreground mb-1">No stock groups yet</p>
                  <p className="text-sm">Create groups like &quot;Antibiotics&quot; or &quot;Medical Devices&quot; to organize your inventory</p>
                </TableCell></TableRow>
              ) : (
                roots.map(root => (
                  <GroupRow key={root.id} group={root} getChildren={getChildren} level={0} onDelete={setDeleteId} itemCount={itemCount} descendantItems={descendantItems} />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Stock Group</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Group Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Antibiotics" />
            </div>
            <div className="grid gap-2">
              <Label>Parent Group (optional)</Label>
              <Select value={form.parentName || '__none__'} onValueChange={v => setForm(f => ({ ...f, parentName: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None (Primary)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (Primary)</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Group</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? Groups containing items cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupRow({ group, getChildren, level, onDelete, itemCount, descendantItems }: {
  group: StockGroup;
  getChildren: (parentName: string) => StockGroup[];
  level: number;
  onDelete: (id: string) => void;
  itemCount: (g: StockGroup) => number;
  descendantItems: (g: StockGroup) => number;
}) {
  const children = getChildren(group.name);
  const [expanded, setExpanded] = useState(true);
  const own = itemCount(group);
  const total = descendantItems(group);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => children.length > 0 && setExpanded(!expanded)}>
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{group.name}</span>
            {children.length > 0 && (
              <span className="text-xs text-muted-foreground">({children.length}) {expanded ? '▾' : '▸'}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{group.parentName || '-'}</TableCell>
        <TableCell className="text-right">
          {own > 0 ? (
            <Badge variant="secondary" className="font-mono tabular-nums">{own}</Badge>
          ) : total > 0 ? (
            <span className="text-xs text-muted-foreground font-mono tabular-nums">{total} in sub-groups</span>
          ) : (
            <span className="text-xs text-muted-foreground">0</span>
          )}
        </TableCell>
        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(group.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && children.map(child => (
        <GroupRow key={child.id} group={child} getChildren={getChildren} level={level + 1} onDelete={onDelete} itemCount={itemCount} descendantItems={descendantItems} />
      ))}
    </>
  );
}
