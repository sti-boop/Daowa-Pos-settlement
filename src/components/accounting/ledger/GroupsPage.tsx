'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, FolderTree, Filter, ChevronDown, ChevronRight, Info, Upload, Download, FileSpreadsheet, X, AlertTriangle, CheckCircle2, XCircle, Loader2, ExternalLink, ArrowRight, BookOpen, ShieldAlert, Zap, Sword, Landmark, CreditCard, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { useRef, useCallback } from 'react';
import styles from './coa-card.module.css';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';

interface LedgerGroup {
  id: string;
  name: string;
  code: string;
  parentName: string | null;
  isPrimary: boolean;
  nature: string;
  classification: string;
  subCategory: string;
  affectsGrossProfit: boolean;
  isTaxRelated: boolean;
  isReserved: boolean;
  notes: string;
  _count?: { ledgers: number; children: number };
}

const NATURE_OPTIONS = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

/** Standard professional 4-digit COA code ranges per nature */
const NATURE_META: Record<string, { icon: React.ReactNode; range: string }> = {
  Asset: { icon: <Landmark className="h-3.5 w-3.5" />, range: '1000–1999' },
  Liability: { icon: <CreditCard className="h-3.5 w-3.5" />, range: '2000–2999' },
  Equity: { icon: <PieChart className="h-3.5 w-3.5" />, range: '3000–3999' },
  Income: { icon: <TrendingUp className="h-3.5 w-3.5" />, range: '4000–4999' },
  Expense: { icon: <TrendingDown className="h-3.5 w-3.5" />, range: '5000–5999' },
};
const CLASSIFICATION_OPTIONS = ['Balance Sheet', 'Profit & Loss'];
const SUB_CATEGORY_OPTIONS = [
  'Current', 'Long-Term', 'Bank', 'Cash', 'Inventory',
  'Fixed Asset', 'Equipment', 'Fixtures',
  'Payables', 'Taxes', 'Accrued', 'Loans',
  'Equity', 'Capital', 'Earnings', 'Drawings',
  'Revenue', 'Shipping', 'Cost of Sales', 'Wastage',
  'Direct Expense', 'Distribution', 'Packaging',
  'Operating Exp', 'Rent', 'Utilities', 'Technology',
  'Marketing', 'Payroll', 'Legal/Licenses',
];

interface ImportPreviewRow {
  row: number;
  name: string;
  code: string;
  parent: string;
  nature: string;
  classification: string;
  subCategory: string;
  affectsGrossProfit: string;
  isTaxRelated: string;
  notes: string;
  errors?: string[];
}

interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  total: number;
  errors?: { row: number; name: string; errors: string[] }[];
  error?: string;
}

interface DeleteDependency {
  group: { id: string; name: string; code: string };
  canDelete: boolean;
  isReserved: boolean;
  directChildren: { id: string; name: string; code: string; isReserved: boolean }[];
  directLedgers: { id: string; name: string; balanceType: string; openingBalance: number; hasVouchers: boolean; voucherCount: number; hasRecurring: boolean; recurringCount: number; canDelete: boolean }[];
  allDescendants: { id: string; name: string; code: string; depth: number; isReserved: boolean; hasChildren: boolean; hasLedgers: boolean; canDelete: boolean; deleteReason: string }[];
  totalDescendantLedgers: number;
  totalLedgers: number;
  totalVoucherEntries: number;
  totalRecurringEntries: number;
}

function CoaKpiCard({ nature, count, ledgerCount, bgClass, isActive, onClick }: { nature: string; count: number; ledgerCount: number; bgClass: string; isActive: boolean; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  // Counter animation via direct DOM updates (same pattern as main dashboard KpiCard)
  function animateCount(element: HTMLElement, target: number, duration: number) {
    const startTime = performance.now();
    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 2);
      const current = Math.floor(target * easeOutProgress);
      element.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString();
      }
    }
    requestAnimationFrame(update);
  }

  useEffect(() => {
    if (!valueRef.current) return;
    animateCount(valueRef.current, count, 400);
  }, [count]);

  // Re-animate on hover (same as main KpiCard)
  const handleMouseEnter = useCallback(() => {
    if (valueRef.current) animateCount(valueRef.current, count, 300);
  }, [count]);

  // 3D tilt + cursor light (identical to main KpiCard)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  const meta = NATURE_META[nature] || { icon: <BookOpen className="h-3.5 w-3.5" />, range: '' };

  return (
    <div
      ref={cardRef}
      className={`${styles.kpiCard} ${bgClass} ${isActive ? styles.kpiCardActive : ''}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={isActive ? `Showing ${nature} accounts` : `Filter by ${nature} (${meta.range})`}
      role="button"
      aria-pressed={isActive}
      aria-label={`${nature} accounts, ${meta.range}`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{nature}</span>
        <div className={styles.iconBadge}>{meta.icon}</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardValue} ref={valueRef}>{count.toLocaleString()}</div>
        <div className={styles.cardSubtitle}>{ledgerCount} ledger{ledgerCount !== 1 ? 's' : ''}</div>
        <span className={styles.codeRange}>{meta.range}</span>
      </div>
    </div>
  );
}

export function GroupsPage() {
  const [groups, setGroups] = useState<LedgerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterNature, setFilterNature] = useState('all');
  const [filterClassification, setFilterClassification] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<LedgerGroup | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDeps, setDeleteDeps] = useState<DeleteDependency | null>(null);
  const [deleteDepsLoading, setDeleteDepsLoading] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [editItem, setEditItem] = useState<LedgerGroup | null>(null);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const { refreshKey } = useAppStore();

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const emptyForm = {
    name: '', code: '', parentName: '', nature: 'Asset' as string,
    classification: 'Balance Sheet', subCategory: '',
    affectsGrossProfit: false, isTaxRelated: false, notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch('/api/groups');
      const d = await r.json();
      if (!cancelled) { setGroups(d); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Build tree structure
  const buildTree = (items: LedgerGroup[]): (LedgerGroup & { children?: LedgerGroup[] })[] => {
    const map = new Map<string, LedgerGroup & { children: LedgerGroup[] }>();
    items.forEach(item => map.set(item.id, { ...item, children: [] }));
    const roots: (LedgerGroup & { children: LedgerGroup[] })[] = [];
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parentName) {
        const parent = items.find(g => g.name === item.parentName);
        if (parent && map.has(parent.id)) {
          map.get(parent.id)!.children.push(node);
          return;
        }
      }
      roots.push(node);
    });
    return roots;
  };

  const filtered = groups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.nature.toLowerCase().includes(search.toLowerCase()) ||
      g.subCategory.toLowerCase().includes(search.toLowerCase());
    const matchNature = filterNature === 'all' || g.nature === filterNature;
    const matchClass = filterClassification === 'all' || g.classification === filterClassification;
    return matchSearch && matchNature && matchClass;
  });

  const tree = buildTree(filtered);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (g: LedgerGroup) => {
    setEditItem(g);
    setForm({
      name: g.name, code: g.code, parentName: g.parentName || '', nature: g.nature,
      classification: g.classification, subCategory: g.subCategory,
      affectsGrossProfit: g.affectsGrossProfit, isTaxRelated: g.isTaxRelated, notes: g.notes,
    });
    setDialogOpen(true);
  };

  const openDetail = (g: LedgerGroup) => {
    setDetailItem(g);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Account name is required');
    if (!form.code.trim()) return toast.error('Account code is required');
    try {
      const payload = {
        ...form,
        parentName: (!form.parentName || form.parentName === '__none__') ? null : form.parentName,
        subCategory: (!form.subCategory || form.subCategory === '__none__') ? '' : form.subCategory,
      };
      if (editItem) {
        await fetch('/api/groups', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editItem.id, ...payload }) });
        toast.success('Account updated');
      } else {
        await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        toast.success('Account created');
      }
      setDialogOpen(false);
      const r2 = await fetch('/api/groups');
      if (r2.ok) setGroups(await r2.json());
    } catch {
      toast.error('Failed to save account');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/groups?id=${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete');
        setDeleteId(null);
        setDeleteDeps(null);
        setForceConfirm(false);
        return;
      }
      toast.success('Account deleted');
      setDeleteId(null);
      setDeleteDeps(null);
      setForceConfirm(false);
      const r2 = await fetch('/api/groups');
      if (r2.ok) setGroups(await r2.json());
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleForceDelete = async () => {
    if (!deleteId) return;
    setForceDeleting(true);
    try {
      const res = await fetch(`/api/groups?id=${deleteId}&force=true`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Force delete failed');
        setForceDeleting(false);
        setForceConfirm(false);
        return;
      }
      const s = data.stats || {};
      const parts: string[] = [];
      if (s.groupsDeleted) parts.push(`${s.groupsDeleted} account(s)`);
      if (s.ledgersDeleted) parts.push(`${s.ledgersDeleted} ledger(s)`);
      if (s.voucherEntriesDeleted) parts.push(`${s.voucherEntriesDeleted} voucher entry(ies)`);
      if (s.vouchersDeleted) parts.push(`${s.vouchersDeleted} voucher(s)`);
      if (s.recurringEntriesDeleted) parts.push(`${s.recurringEntriesDeleted} recurring entry(ies)`);
      if (s.recurringJournalsDeleted) parts.push(`${s.recurringJournalsDeleted} recurring journal(s)`);
      toast.success(`Force deleted: ${parts.join(', ')}`);
      setDeleteId(null);
      setDeleteDeps(null);
      setForceConfirm(false);
      const r2 = await fetch('/api/groups');
      if (r2.ok) setGroups(await r2.json());
    } catch {
      toast.error('Force delete failed');
    }
    setForceDeleting(false);
  };

  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [deletingLedgerId, setDeletingLedgerId] = useState<string | null>(null);

  const openDeleteDialog = async (id: string) => {
    setDeleteId(id);
    setDeleteDeps(null);
    setDeleteDepsLoading(true);
    setForceConfirm(false);
    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: 'PATCH' });
      if (res.ok) {
        setDeleteDeps(await res.json());
      }
    } catch { /* silently fail — dialog still shows basic info from groups state */ }
    setDeleteDepsLoading(false);
  };

  const refreshDeleteDeps = async () => {
    if (!deleteId) return;
    setDeleteDepsLoading(true);
    try {
      const res = await fetch(`/api/groups?id=${deleteId}`, { method: 'PATCH' });
      if (res.ok) {
        setDeleteDeps(await res.json());
      }
    } catch { /* ignore */ }
    setDeleteDepsLoading(false);
  };

  const handleDeleteSubAccount = async (childId: string) => {
    setDeletingChildId(childId);
    try {
      const res = await fetch(`/api/groups?id=${childId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete sub-account');
        setDeletingChildId(null);
        return;
      }
      toast.success('Sub-account deleted');
      // Refresh the groups list AND the dependency check
      const r2 = await fetch('/api/groups');
      if (r2.ok) setGroups(await r2.json());
      await refreshDeleteDeps();
    } catch {
      toast.error('Failed to delete sub-account');
    }
    setDeletingChildId(null);
  };

  const handleDeleteLedgerInline = async (ledgerId: string) => {
    setDeletingLedgerId(ledgerId);
    try {
      const res = await fetch(`/api/ledgers?id=${ledgerId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete ledger');
        setDeletingLedgerId(null);
        return;
      }
      toast.success('Ledger deleted');
      // Refresh the groups list AND the dependency check
      const r2 = await fetch('/api/groups');
      if (r2.ok) setGroups(await r2.json());
      await refreshDeleteDeps();
    } catch {
      toast.error('Failed to delete ledger');
    }
    setDeletingLedgerId(null);
  };

  const fetchGroups = async () => {
    const r = await fetch('/api/groups');
    if (r.ok) setGroups(await r.json());
  };

  const exportCsv = () => {
    const headers = ['Name', 'Code', 'Parent', 'Nature', 'Classification', 'Sub-Category', 'Affects GP', 'Tax Related', 'Notes'];
    const rows = groups.map(g => [
      g.name, g.code, g.parentName || '', g.nature, g.classification, g.subCategory || '',
      g.affectsGrossProfit ? 'true' : 'false', g.isTaxRelated ? 'true' : 'false', g.notes || '',
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
    a.download = `Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${groups.length} accounts to CSV`);
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Code', 'Parent', 'Nature', 'Classification', 'Sub-Category', 'Affects GP', 'Tax Related', 'Notes'];
    const sampleRows = [
      ['Current Assets', '1', '', 'Asset', 'Balance Sheet', 'Current', 'false', 'false', 'All current asset accounts'],
      ['Bank Accounts', '1-001', 'Current Assets', 'Asset', 'Balance Sheet', 'Bank', 'false', 'false', ''],
      ['Sonali Bank', '1-001-01', 'Bank Accounts', 'Asset', 'Balance Sheet', 'Bank', 'false', 'false', 'Primary bank account'],
      ['Cash in Hand', '1-002', 'Current Assets', 'Asset', 'Balance Sheet', 'Cash', 'false', 'false', ''],
      ['Sales Revenue', '5-001', '', 'Income', 'Profit & Loss', 'Revenue', 'false', 'false', ''],
      ['Cost of Goods Sold', '6-001', '', 'Expense', 'Profit & Loss', 'Cost of Sales', 'true', 'false', ''],
    ];
    const csvContent = [headers, ...sampleRows].map(row => row.map(cell => {
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
    a.download = 'Chart_of_Accounts_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvPreview = (text: string): ImportPreviewRow[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = false; }
          } else { current += ch; }
        } else {
          if (ch === '"') { inQuotes = true; }
          else if (ch === ',') { result.push(current.trim()); current = ''; }
          else { current += ch; }
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[_\s-]+/g, ''));
    const colMap: Record<string, number> = {};
    const aliasMap: Record<string, string> = {
      'name': 'name', 'accountname': 'name', 'account': 'name',
      'code': 'code', 'accountcode': 'code',
      'parent': 'parent', 'parentaccount': 'parent', 'parentname': 'parent',
      'nature': 'nature', 'accountnature': 'nature',
      'classification': 'classification',
      'subcategory': 'subcategory', 'sub-category': 'subcategory', 'sub_category': 'subcategory',
      'affectsgrossprofit': 'affectsgrossprofit', 'affectsgp': 'affectsgrossprofit', 'gp': 'affectsgrossprofit',
      'istaxrelated': 'istaxrelated', 'taxrelated': 'istaxrelated', 'tax': 'istaxrelated',
      'notes': 'notes', 'description': 'notes', 'note': 'notes',
    };
    for (let i = 0; i < header.length; i++) {
 const mapped = aliasMap[header[i]] || header[i];
      colMap[mapped] = i;
    }

    const rows: ImportPreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const get = (key: string) => colMap[key] !== undefined ? (cols[colMap[key]] || '').trim() : '';
      rows.push({
        row: i + 1,
        name: get('name'),
        code: get('code'),
        parent: get('parent'),
        nature: get('nature'),
        classification: get('classification'),
        subCategory: get('subcategory'),
        affectsGrossProfit: get('affectsgrossprofit'),
        isTaxRelated: get('istaxrelated'),
        notes: get('notes'),
      });
    }
    return rows;
  };

  const handlePreview = async () => {
    if (!importFile) return;
    const text = await importFile.text();
    const preview = parseCsvPreview(text);
    setImportPreview(preview);
    setImportStep('preview');
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const res = await fetch('/api/groups/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text }),
      });
      const data: ImportResult = await res.json();
      setImportResult(data);
      setImportStep('result');
      if (data.success && data.created > 0) {
        toast.success(`${data.created} account${data.created !== 1 ? 's' : ''} imported successfully`);
      } else if (data.skipped > 0) {
        toast.warning(`${data.skipped} row(s) skipped due to errors`);
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const natureColors: Record<string, string> = {
    Asset: 'bg-[#4169E1]/15 text-[#4169E1]',
    Liability: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    Equity: 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
    Income: 'bg-[#10B981]/15 text-[#10B981]',
    Expense: 'bg-[#EE1127]/15 text-[#EE1127]',
  };

  const classColors: Record<string, string> = {
    'Balance Sheet': 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    'Profit & Loss': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };

  const renderRow = (g: LedgerGroup, depth: number, hasChildren: boolean) => {
    const isExpanded = expandedCodes.has(g.code || g.name);
    return (
      <TableRow key={g.id} className={depth > 0 ? 'bg-muted/20' : ''}>
        <TableCell className="font-medium" style={{ paddingLeft: `${12 + depth * 24}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button onClick={() => toggleExpand(g.code || g.name)} className="p-0.5 hover:bg-muted rounded">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{g.name}</span>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs">{g.code || '-'}</TableCell>
        <TableCell className="text-muted-foreground text-xs">{g.parentName || '-'}</TableCell>
        <TableCell><Badge variant="secondary" className={`text-xs ${natureColors[g.nature]}`}>{g.nature}</Badge></TableCell>
        <TableCell><Badge variant="outline" className={`text-xs ${classColors[g.classification] || ''}`}>{g.classification}</Badge></TableCell>
        <TableCell className="text-xs">{g.subCategory || '-'}</TableCell>
        <TableCell className="text-center">
          {g.affectsGrossProfit && <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">GP</Badge>}
        </TableCell>
        <TableCell className="text-center">
          {g.isTaxRelated && <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">Tax</Badge>}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details" onClick={() => openDetail(g)}>
              <Info className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${g.isReserved ? 'text-muted-foreground/50 hover:text-destructive' : 'text-destructive'}`}
              title={g.isReserved ? 'Delete (system reserved)' : 'Delete'}
              onClick={() => openDeleteDialog(g.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderTree = (nodes: (LedgerGroup & { children?: LedgerGroup[] })[], depth: number) => {
    const rows: React.ReactNode[] = [];
    for (const node of nodes) {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedCodes.has(node.code || node.name);
      rows.push(renderRow(node, depth, hasChildren));
      if (hasChildren && isExpanded) {
        rows.push(...renderTree(node.children, depth + 1));
      }
    }
    return rows;
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, code, nature, category..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterNature} onValueChange={setFilterNature}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Natures" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Natures</SelectItem>
              {NATURE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterClassification} onValueChange={setFilterClassification}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Classifications" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {CLASSIFICATION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={exportCsv} className="gap-2 rounded-xl" disabled={groups.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => { setImportStep('upload'); setImportResult(null); setImportPreview([]); setImportFile(null); setImportOpen(true); }} className="gap-2 rounded-xl">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-[#4A90E2] to-[#5BA0F2] hover:from-[#3A80D2] hover:to-[#4A90E2] text-white border-0 rounded-xl">
            <Plus className="h-4 w-4" /> Create Account
          </Button>
        </div>
      </div>

      {/* Summary Cards — main dashboard KPI style with code ranges */}
      <div className={styles.cardGrid}>
        {NATURE_OPTIONS.map(n => {
          const natureGroups = groups.filter(g => g.nature === n);
          const count = natureGroups.length;
          const ledgerCount = natureGroups.reduce((s, g) => s + (g._count?.ledgers ?? 0), 0);
          const isActive = filterNature === n;
          const bgClass: Record<string, string> = {
            'Asset': styles.bgAsset,
            'Liability': styles.bgLiability,
            'Equity': styles.bgEquity,
            'Income': styles.bgIncome,
            'Expense': styles.bgExpense,
          };
          return <CoaKpiCard key={n} nature={n} count={count} ledgerCount={ledgerCount} bgClass={bgClass[n]} isActive={isActive} onClick={() => setFilterNature(filterNature === n ? 'all' : n)} />;
        })}
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Account Name</TableHead>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead className="min-w-[140px]">Parent</TableHead>
                  <TableHead className="w-24">Nature</TableHead>
                  <TableHead className="w-28">Classification</TableHead>
                  <TableHead className="w-28">Sub-Category</TableHead>
                  <TableHead className="w-14 text-center">GP</TableHead>
                  <TableHead className="w-14 text-center">Tax</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No accounts found</TableCell></TableRow>
                ) : (
                  renderTree(tree, 0)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Account' : 'Create Account'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Account Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. 1-001-A" />
              </div>
              <div className="grid gap-2">
                <Label>Account Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bank Accounts" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nature *</Label>
                <Select value={form.nature} onValueChange={v => {
                  const cls = (v === 'Income' || v === 'Expense') ? 'Profit & Loss' : 'Balance Sheet';
                  setForm(f => ({ ...f, nature: v, classification: cls }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NATURE_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Classification</Label>
                <Select value={form.classification} onValueChange={v => setForm(f => ({ ...f, classification: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sub-Category</Label>
                <Select value={form.subCategory} onValueChange={v => setForm(f => ({ ...f, subCategory: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {SUB_CATEGORY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Parent Account</Label>
                <Select value={form.parentName} onValueChange={v => setForm(f => ({ ...f, parentName: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Primary)</SelectItem>
                    {groups.filter(g => g.id !== editItem?.id).map(g => (
                      <SelectItem key={g.id} value={g.name}>{g.name} ({g.code || '—'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.affectsGrossProfit} onCheckedChange={v => setForm(f => ({ ...f, affectsGrossProfit: !!v }))} />
                <Label className="text-sm">Affects Gross Profit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.isTaxRelated} onCheckedChange={v => setForm(f => ({ ...f, isTaxRelated: !!v }))} />
                <Label className="text-sm">Tax Related</Label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Description or notes about this account..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" /> {detailItem?.name}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Code:</span> <span className="font-mono font-medium">{detailItem.code || '-'}</span></div>
                <div><span className="text-muted-foreground">Nature:</span> <Badge variant="secondary" className={`text-xs ml-1 ${natureColors[detailItem.nature]}`}>{detailItem.nature}</Badge></div>
                <div><span className="text-muted-foreground">Classification:</span> <Badge variant="outline" className={`text-xs ml-1 ${classColors[detailItem.classification] || ''}`}>{detailItem.classification}</Badge></div>
                <div><span className="text-muted-foreground">Sub-Category:</span> <span>{detailItem.subCategory || '-'}</span></div>
                <div><span className="text-muted-foreground">Parent:</span> <span>{detailItem.parentName || 'None (Primary)'}</span></div>
                <div><span className="text-muted-foreground">Primary:</span> <span>{detailItem.isPrimary ? 'Yes' : 'No'}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Affects GP:</span>
                  <span>{detailItem.affectsGrossProfit ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax Related:</span>
                  <span>{detailItem.isTaxRelated ? 'Yes' : 'No'}</span>
                </div>
                <div><span className="text-muted-foreground">System Reserved:</span> <span>{detailItem.isReserved ? 'Yes' : 'No'}</span></div>
              </div>
              {detailItem.notes && (
                <div className="text-sm bg-muted/50 p-3 rounded-lg">
                  <span className="text-muted-foreground">Notes: </span>{detailItem.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setDetailOpen(false); if (detailItem) setDeleteId(detailItem.id); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button variant="outline" onClick={() => { setDetailOpen(false); if (detailItem) openEdit(detailItem); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) setImportOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Chart of Accounts from CSV
            </DialogTitle>
          </DialogHeader>

          {importStep === 'upload' && (
            <div className="flex-1 overflow-y-auto py-2 space-y-4">
              {/* Template Download */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-[#4A90E2] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Download CSV Template</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Download a pre-formatted Excel-compatible CSV template with sample data and all valid options.
                      You can open it in Excel, fill in your accounts, then save as CSV and upload here.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5">
                        <Download className="h-3.5 w-3.5" /> Download Template (.csv)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  importFile ? 'border-[#4A90E2] bg-[#4A90E2]/5' : 'border-muted-foreground/25 hover:border-[#4A90E2]/50 hover:bg-muted/30'
                }`}
                onClick={() => document.getElementById('csv-upload')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}
              >
                <input id="csv-upload" type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }} />
                <Upload className={`h-10 w-10 mx-auto mb-3 ${importFile ? 'text-[#4A90E2]' : 'text-muted-foreground/40'}`} />
                {importFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB — Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Click to upload or drag & drop a CSV file</p>
                    <p className="text-xs text-muted-foreground">Supports .csv files exported from Excel or any spreadsheet software</p>
                  </div>
                )}
              </div>

              {/* Column Guide */}
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required CSV Columns</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                  <div><span className="font-medium text-foreground">Name</span> <span className="text-muted-foreground">(required)</span></div>
                  <div><span className="font-medium text-foreground">Code</span> <span className="text-muted-foreground">(required)</span></div>
                  <div><span className="font-medium text-foreground">Nature</span> <span className="text-muted-foreground">(required)</span></div>
                  <div><span className="text-muted-foreground">Parent</span></div>
                  <div><span className="text-muted-foreground">Classification</span></div>
                  <div><span className="text-muted-foreground">Sub-Category</span></div>
                  <div><span className="text-muted-foreground">Affects GP</span> <span className="text-muted-foreground">(true/false)</span></div>
                  <div><span className="text-muted-foreground">Tax Related</span> <span className="text-muted-foreground">(true/false)</span></div>
                  <div><span className="text-muted-foreground">Notes</span></div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button onClick={handlePreview} disabled={!importFile} className="gap-1.5">
                  Preview Data <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {importStep === 'preview' && (
            <div className="flex-1 overflow-hidden flex flex-col py-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                  {importPreview.filter(r => !r.errors || r.errors.length === 0).length} valid rows
                </Badge>
                {importPreview.filter(r => r.errors && r.errors.length > 0).length > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                    {importPreview.filter(r => r.errors && r.errors.length > 0).length} rows with errors
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Total: {importPreview.length} rows</span>
              </div>

              <div className="flex-1 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium w-10">#</th>
                      <th className="px-2 py-1.5 text-left font-medium min-w-[120px]">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium w-20">Code</th>
                      <th className="px-2 py-1.5 text-left font-medium min-w-[100px]">Parent</th>
                      <th className="px-2 py-1.5 text-left font-medium w-20">Nature</th>
                      <th className="px-2 py-1.5 text-left font-medium w-24">Classification</th>
                      <th className="px-2 py-1.5 text-left font-medium w-24">Sub-Category</th>
                      <th className="px-2 py-1.5 text-left font-medium w-14">GP</th>
                      <th className="px-2 py-1.5 text-left font-medium w-14">Tax</th>
                      <th className="px-2 py-1.5 text-left font-medium min-w-[150px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row) => (
                      <tr key={row.row} className={`border-t ${row.errors && row.errors.length > 0 ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.row}</td>
                        <td className="px-2 py-1.5 font-medium truncate max-w-[200px]" title={row.name}>{row.name}</td>
                        <td className="px-2 py-1.5 font-mono">{row.code}</td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]" title={row.parent}>{row.parent || '—'}</td>
                        <td className="px-2 py-1.5">{row.nature}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.classification || '—'}</td>
                        <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]" title={row.subCategory}>{row.subCategory || '—'}</td>
                        <td className="px-2 py-1.5 text-center">{row.affectsGrossProfit ? 'Yes' : 'No'}</td>
                        <td className="px-2 py-1.5 text-center">{row.isTaxRelated ? 'Yes' : 'No'}</td>
                        <td className="px-2 py-1.5">
                          {row.errors && row.errors.length > 0 ? (
                            <div className="flex items-start gap-1">
                              <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                              <span className="text-red-600 dark:text-red-400 leading-tight" title={row.errors.join('; ')}>{row.errors[0]}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Ready</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setImportStep('upload')}>Back</Button>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || importPreview.filter(r => !r.errors || r.errors.length === 0).length === 0}
                  className="gap-1.5 bg-gradient-to-r from-[#4A90E2] to-[#5BA0F2] text-white border-0"
                >
                  {importing ? 'Importing...' : `Import ${importPreview.filter(r => !r.errors || r.errors.length === 0).length} Accounts`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {importStep === 'result' && importResult && (
            <div className="flex-1 overflow-y-auto py-2 space-y-4">
              {/* Result Summary */}
              <div className={`rounded-xl p-6 text-center ${importResult.success && importResult.created > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                {importResult.success && importResult.created > 0 ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                )}
                <h3 className="text-lg font-semibold">
                  {importResult.created > 0 ? `${importResult.created} Account${importResult.created !== 1 ? 's' : ''} Imported Successfully` : 'No Accounts Imported'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.total} total rows • {importResult.created} created • {importResult.skipped} skipped
                </p>
              </div>

              {/* Error Details */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="rounded-xl border">
                  <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2.5 rounded-t-xl border-b">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4" /> {importResult.errors.length} Row(s) with Errors
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium w-10">Row</th>
                          <th className="px-3 py-1.5 text-left font-medium">Account</th>
                          <th className="px-3 py-1.5 text-left font-medium">Error Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5 text-muted-foreground">{err.row}</td>
                            <td className="px-3 py-1.5 font-medium">{err.name}</td>
                            <td className="px-3 py-1.5 text-red-600 dark:text-red-400">{err.errors.join('; ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
                {importResult.created > 0 && (
                  <Button onClick={() => { setImportOpen(false); fetchGroups(); }} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation with Dependency Details */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteDeps(null); } }}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {/* Account name header */}
                <p className="text-sm">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-foreground">
                    {deleteDeps?.group?.name || groups.find(g => g.id === deleteId)?.name}
                  </span>
                  {deleteDeps?.group?.code && (
                    <span className="text-muted-foreground font-mono text-xs ml-1.5">
                      ({deleteDeps.group.code})
                    </span>
                  )}
                  ?
                </p>

                {deleteDepsLoading && (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking dependencies...
                  </div>
                )}

                {!deleteDepsLoading && deleteDeps && (
                  <>
                    {/* CAN DELETE — green banner */}
                    {deleteDeps.canDelete && (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">Safe to delete</p>
                          <p className="text-emerald-600/80 dark:text-emerald-400/70 text-xs mt-0.5">
                            No sub-accounts or ledgers attached. This account can be deleted.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* BLOCKED — summary banner */}
                    {!deleteDeps.canDelete && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2.5">
                        <ShieldAlert className="h-4.5 w-4.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-red-700 dark:text-red-400">Cannot delete — dependencies found</p>
                          <p className="text-red-600/80 dark:text-red-400/70 text-xs mt-0.5">
                            Remove all items listed below first, then try again.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reserved flag */}
                    {deleteDeps.isReserved && (
                      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2.5">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700 dark:text-amber-400">System Reserved Account</p>
                          <p className="text-amber-600/80 dark:text-amber-400/70 text-xs mt-0.5">
                            This is a reserved system account. It can only be deleted when it has no sub-accounts or ledgers attached.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sub-accounts section */}
                    {deleteDeps.allDescendants.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FolderTree className="h-3.5 w-3.5 text-blue-500" />
                          <span>Sub-Accounts Blocking Deletion</span>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {deleteDeps.allDescendants.length} account{deleteDeps.allDescendants.length !== 1 ? 's' : ''}
                          </Badge>
                          {deleteDeps.totalDescendantLedgers > 0 && (
                            <span className="text-xs text-muted-foreground">
                              (containing {deleteDeps.totalDescendantLedgers} ledger{deleteDeps.totalDescendantLedgers !== 1 ? 's' : ''})
                            </span>
                          )}
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 ml-auto">
                            {deleteDeps.allDescendants.filter(d => d.canDelete).length} deletable
                          </Badge>
                        </div>
                        <div className="rounded-lg border bg-muted/30 max-h-64 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                              <tr className="border-b">
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Code</th>
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Sub-Account Name</th>
                                <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Status</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deleteDeps.allDescendants.map(d => {
                                const isDeleting = deletingChildId === d.id;
                                return (
                                  <tr key={d.id} className={`border-b last:border-0 hover:bg-muted/50 ${isDeleting ? 'opacity-60' : ''} ${d.canDelete ? '' : 'bg-muted/20'}`}>
                                    <td className="px-3 py-1.5 font-mono text-muted-foreground" style={{ paddingLeft: `${12 + d.depth * 16}px` }}>
                                      {d.code || '-'}
                                    </td>
                                    <td className="px-3 py-1.5 font-medium" style={{ paddingLeft: `${12 + d.depth * 16}px` }}>
                                      <div className="flex items-center gap-1.5">
                                        {d.depth > 1 && <span className="text-muted-foreground/50">└</span>}
                                        {d.name}
                                        {d.isReserved && (
                                          <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">reserved</Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      {d.canDelete ? (
                                        <span className="text-emerald-600 dark:text-emerald-400">Empty</span>
                                      ) : (
                                        <span className="text-muted-foreground" title={d.deleteReason}>
                                          {d.deleteReason}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      {d.canDelete ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40"
                                          disabled={isDeleting}
                                          onClick={() => handleDeleteSubAccount(d.id)}
                                        >
                                          {isDeleting ? (
                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Deleting</>
                                          ) : (
                                            <><Trash2 className="h-3 w-3 mr-1" /> Delete</>
                                          )}
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                          onClick={() => {
                                            const pathCodes = deleteDeps.allDescendants
                                              .filter(x => x.depth <= d.depth)
                                              .map(x => x.code || x.name);
                                            pathCodes.forEach(c => {
                                              if (!expandedCodes.has(c)) {
                                                setExpandedCodes(prev => new Set([...prev, c]));
                                              }
                                            });
                                            setDeleteId(null);
                                            setDeleteDeps(null);
                                          }}
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" /> Locate
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Delete empty sub-accounts above (deepest first). Items with dependencies show "Locate" to navigate.
                        </p>
                      </div>
                    )}

                    {/* Ledgers section */}
                    {deleteDeps.directLedgers.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <BookOpen className="h-3.5 w-3.5 text-orange-500" />
                          <span>Ledgers Attached to This Account</span>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            {deleteDeps.directLedgers.length} ledger{deleteDeps.directLedgers.length !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 ml-auto">
                            {deleteDeps.directLedgers.filter(l => l.canDelete).length} deletable
                          </Badge>
                        </div>
                        <div className="rounded-lg border bg-muted/30 max-h-52 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                              <tr className="border-b">
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Ledger Name</th>
                                <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Balance</th>
                                <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">Vouchers</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deleteDeps.directLedgers.map(l => {
                                const isDeleting = deletingLedgerId === l.id;
                                return (
                                  <tr key={l.id} className={`border-b last:border-0 hover:bg-muted/50 ${isDeleting ? 'opacity-60' : ''} ${l.canDelete ? '' : 'bg-muted/20'}`}>
                                    <td className="px-3 py-1.5 font-medium">{l.name}</td>
                                    <td className="px-3 py-1.5 text-center font-mono">
                                      <span className={l.balanceType === 'Dr' ? 'text-blue-600' : 'text-red-600'}>
                                        {l.openingBalance > 0 ? `${l.openingBalance.toLocaleString()} ${l.balanceType}` : '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                      {l.hasVouchers || l.hasRecurring ? (
                                        <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                          {[l.hasVouchers && `${l.voucherCount} voucher${l.voucherCount !== 1 ? 's' : ''}`, l.hasRecurring && `${l.recurringCount} recurring`].filter(Boolean).join(', ')}
                                        </Badge>
                                      ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400">0</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      {l.canDelete ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40"
                                          disabled={isDeleting}
                                          onClick={() => handleDeleteLedgerInline(l.id)}
                                        >
                                          {isDeleting ? (
                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Deleting</>
                                          ) : (
                                            <><Trash2 className="h-3 w-3 mr-1" /> Delete</>
                                          )}
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                                          onClick={() => {
                                            setDeleteId(null);
                                            setDeleteDeps(null);
                                            const { setView } = useAppStore.getState();
                                            setView('ledgers');
                                          }}
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" /> Go to Ledgers
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {deleteDeps.directLedgers.some(l => l.canDelete)
                            ? 'Delete ledgers with no vouchers above. For others, go to Vouchers page to delete entries first.'
                            : 'All ledgers have voucher entries. Delete those vouchers first from the Vouchers page.'
                          }
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!deleteDepsLoading && deleteDeps && !deleteDeps.canDelete && (
                  <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/30">
                    <div className="rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/5 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <Zap className="h-4 w-4" />
                        <span>Force Delete - Remove Everything</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
                        <span>{(deleteDeps.allDescendants?.length || 0) + 1} account(s) will be deleted</span>
                        <span>{deleteDeps.totalLedgers || 0} ledger(s) will be deactivated</span>
                        {deleteDeps.totalVoucherEntries > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {deleteDeps.totalVoucherEntries} voucher entry(ies) will be deleted
                          </span>
                        )}
                        {deleteDeps.totalRecurringEntries > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {deleteDeps.totalRecurringEntries} recurring entry(ies) will be deleted
                          </span>
                        )}
                      </div>
                      {!forceConfirm ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-6 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                          onClick={() => setForceConfirm(true)}
                          disabled={forceDeleting}
                        >
                          <Sword className="h-3.5 w-3.5" />
                          Enable Force Delete
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 ml-6">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            disabled={forceDeleting}
                            onClick={handleForceDelete}
                          >
                            {forceDeleting ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Force Deleting...</>
                            ) : (
                              <><Sword className="h-3.5 w-3.5" /> Confirm Force Delete</>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground"
                            onClick={() => setForceConfirm(false)}
                            disabled={forceDeleting}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-destructive/70 mt-1.5 pl-6 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      This will permanently delete all sub-accounts, ledgers, and voucher entries. Cannot be undone.
                    </p>
                  </div>
                )}


                <p className="text-muted-foreground text-xs pt-1">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteDeps ? !deleteDeps.canDelete : false}
            >
              {deleteDeps?.canDelete ? 'Delete Account' : 'Delete (Blocked)'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}