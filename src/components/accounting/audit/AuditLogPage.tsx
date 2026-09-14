'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Plus, Pencil, Trash2, Search, ChevronRight, Loader2, ChevronDown, Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/accounting-store';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  description: string;
  before: string | null;
  after: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  CREATE: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    icon: <Plus className="h-3 w-3" />,
    label: 'Created',
  },
  UPDATE: {
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon: <Pencil className="h-3 w-3" />,
    label: 'Updated',
  },
  DELETE: {
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    icon: <Trash2 className="h-3 w-3" />,
    label: 'Deleted',
  },
  EXECUTE: {
    badge: 'bg-[#8A5CF9]/10 text-[#8A5CF9] border-[#8A5CF9]/30',
    icon: <Zap className="h-3 w-3" />,
    label: 'Executed',
  },
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString();
  const isToday = d.toDateString() === today;
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return isToday ? `Today, ${time}` : `${date}, ${time}`;
}

function prettyJson(s: string | null) {
  if (!s) return null;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const { refreshKey } = useAppStore();

  const buildParams = (cursor?: string | null) => {
    const params = new URLSearchParams();
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (typeFilter !== 'all') params.set('entityType', typeFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (cursor) params.set('cursor', cursor);
    return params;
  };

  // Reset + first page when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const r = await fetch(`/api/audit?${buildParams().toString()}`);
      const data = await r.json();
      if (!cancelled) {
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotal(data.total ?? 0);
        setHasMore(!!data.hasMore);
        setNextCursor(data.nextCursor ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [actionFilter, typeFilter, dateFrom, dateTo, refreshKey]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(`/api/audit?${buildParams(nextCursor).toString()}`);
      const data = await r.json();
      const newLogs = Array.isArray(data.logs) ? data.logs : [];
      setLogs(prev => {
        const seen = new Set(prev.map(l => l.id));
        return [...prev, ...newLogs.filter(l => !seen.has(l.id))];
      });
      setHasMore(!!data.hasMore);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = logs.filter(l =>
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.entityName.toLowerCase().includes(search.toLowerCase()) ||
    l.entityType.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: total,
    create: logs.filter(l => l.action === 'CREATE').length,
    update: logs.filter(l => l.action === 'UPDATE').length,
    delete: logs.filter(l => l.action === 'DELETE').length,
  };

  return (
    <div className="space-y-4">
      {/* Header + KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#4A90E2]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#4A90E2]/15 p-2.5 rounded-xl"><History className="h-5 w-5 text-[#4A90E2]" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Matching Events</p>
              <p className="text-xl font-bold tabular-nums">{counts.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#50C878]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#50C878]/15 p-2.5 rounded-xl"><Plus className="h-5 w-5 text-[#50C878]" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Creations</p>
              <p className="text-xl font-bold tabular-nums">{counts.create}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-[#F59E0B]/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-[#F59E0B]/15 p-2.5 rounded-xl"><Pencil className="h-5 w-5 text-[#F59E0B]" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Updates</p>
              <p className="text-xl font-bold tabular-nums">{counts.update}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-red-500/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-500/15 p-2.5 rounded-xl"><Trash2 className="h-5 w-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Deletions</p>
              <p className="text-xl font-bold tabular-nums">{counts.delete}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search audit events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-full sm:w-[150px]" />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-full sm:w-[150px]" />
        </div>
        <div className="grid gap-1 self-end">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
              <SelectItem value="EXECUTE">Executed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1 self-end">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="Voucher">Vouchers</SelectItem>
              <SelectItem value="Ledger">Ledgers</SelectItem>
              <SelectItem value="LedgerGroup">COA Groups</SelectItem>
              <SelectItem value="StockItem">Stock Items</SelectItem>
              <SelectItem value="RecurringJournal">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Action</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="hidden md:table-cell">Entity</TableHead>
                <TableHead className="text-right">When</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-foreground mb-1">No audit events yet</p>
                    <p className="text-sm">Actions like creating, editing, or deleting vouchers are recorded here automatically</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(log => {
                  const meta = ACTION_META[log.action] || ACTION_META.UPDATE;
                  return (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(log)}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        <span className="line-clamp-1">{log.description || `${log.action} ${log.entityType}`}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs font-medium">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">{formatWhen(log.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2 rounded-xl">
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Load More ({logs.length} of {total} shown)
              </>
            )}
          </Button>
        </div>
      )}
      {!hasMore && logs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">Showing all {logs.length} matching events</p>
      )}

      {/* Detail dialog with before/after diff */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const meta = detail ? (ACTION_META[detail.action] || ACTION_META.UPDATE) : null;
                return meta ? (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
                    {meta.icon} {meta.label}
                  </span>
                ) : null;
              })()}
              <span className="truncate">{detail?.entityName || detail?.entityType}</span>
            </DialogTitle>
            <DialogDescription>
              {detail?.description} · {detail ? formatWhen(detail.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {detail?.before && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Before
                </p>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto">{prettyJson(detail.before)}</pre>
              </div>
            )}
            {detail?.after && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                  <Plus className="h-3 w-3" /> After
                </p>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto">{prettyJson(detail.after)}</pre>
              </div>
            )}
            {!detail?.before && !detail?.after && (
              <p className="text-sm text-muted-foreground sm:col-span-2 text-center py-8">No snapshot data recorded</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
