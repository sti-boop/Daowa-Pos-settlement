'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Plus, Trash2, FilePlus, ArrowLeft, AlertCircle, AlertTriangle, Lightbulb, Filter, X, Wallet, TrendingUp, BookOpen, ShoppingCart, ShoppingBag, ArrowLeftRight, FileMinus, FilePlus2 } from 'lucide-react';
import { useAppStore } from '@/lib/accounting-store';
import { toast } from 'sonner';
import styles from './voucher-type-card.module.css';
import { LedgerSearchSelect } from './LedgerSearchSelect';

interface Ledger {
  id: string; name: string; groupName: string;
  group: { name: string; nature: string; subCategory: string } | null;
}
interface VoucherType { id: string; name: string; prefix: string; }

type EntryRow = { ledgerId: string; ledgerName: string; debit: string; credit: string; taxRate: string; taxAmount: string };

const VOUCHER_CONFIG: Record<string, { label: string; prefix: string; description: string; autoRoundOff?: boolean }> = {
  'Expense':    { label: 'Expense (Payment Voucher)',   prefix: 'EV',  description: 'Payments made for expenses', autoRoundOff: true },
  'Income':     { label: 'Income (Receipt Voucher)',    prefix: 'RV',  description: 'Money received as income', autoRoundOff: true },
  'Journal':    { label: 'Journal Voucher',              prefix: 'JV',  description: 'Adjustments & corrections', autoRoundOff: true },
  'Sales':      { label: 'Sales Voucher',                prefix: 'SV',  description: 'Sales transactions', autoRoundOff: true },
  'Purchase':   { label: 'Purchase Voucher',             prefix: 'PV',  description: 'Purchase transactions', autoRoundOff: true },
  'Contra':     { label: 'Contra Voucher',               prefix: 'CV',  description: 'Transfers between cash & bank accounts', autoRoundOff: true },
  'Debit Note': { label: 'Debit Note Voucher',           prefix: 'DNV', description: 'Purchase returns to suppliers', autoRoundOff: true },
  'Credit Note':{ label: 'Credit Note Voucher',          prefix: 'CNV', description: 'Sales returns from customers', autoRoundOff: true },
};

/** Display order + icon for voucher type cards */
const VOUCHER_CARD_META: Record<string, { icon: React.ReactNode; cssClass: string; order: number }> = {
  'Income':      { icon: <TrendingUp className="h-3.5 w-3.5" />,        cssClass: styles.bgIncome,      order: 1 },
  'Expense':     { icon: <Wallet className="h-3.5 w-3.5" />,            cssClass: styles.bgExpense,     order: 2 },
  'Contra':      { icon: <ArrowLeftRight className="h-3.5 w-3.5" />,   cssClass: styles.bgContra,      order: 3 },
  'Sales':       { icon: <ShoppingCart className="h-3.5 w-3.5" />,      cssClass: styles.bgSales,       order: 4 },
  'Purchase':    { icon: <ShoppingBag className="h-3.5 w-3.5" />,       cssClass: styles.bgPurchase,    order: 5 },
  'Debit Note':  { icon: <FileMinus className="h-3.5 w-3.5" />,        cssClass: styles.bgDebitNote,   order: 6 },
  'Credit Note': { icon: <FilePlus2 className="h-3.5 w-3.5" />,        cssClass: styles.bgCreditNote,  order: 7 },
  'Journal':     { icon: <BookOpen className="h-3.5 w-3.5" />,          cssClass: styles.bgJournal,     order: 8 },
};

// ============================================================
// SMART VOUCHER HELPER — Maps voucher types to suggested accounts
// ============================================================

/** Group-name patterns that classify a ledger as "cash/bank" (payment source) */
const CASH_BANK_GROUPS = [
  'Cash in Hand', 'Cash in Safe/Vault', 'Cash with Delivery Riders', 'Petty Cash',
  'Cash at Bank', 'Mobile Banking (bKash/Nagad/Rocket)',
];

/** Group-name patterns for receivables */
const RECEIVABLE_GROUPS = [
  'Receivables (Money to Receive)', 'Customer Credit Sales', 'Customer Deposits & Advance Payments',
  'Staff Salary Advances', 'Prepaid Expenses',
];

/** Group-name patterns for payables */
const PAYABLE_GROUPS = [
  'Payables (Money to Pay)', 'Medicine Wholesaler Bills', 'Surgical & Medical Supply Bills',
  'Healthcare Product Supplier Bills', 'Cosmetics & Personal Care Bills',
  'General Item Vendor Bills', 'Packaging Material Bills',
  'Pathao Parcel Bills', 'Steadfast Courier Bills', 'Redx Courier Bills', 'Other Courier Bills',
];

const TAX_GROUPS = ['Tax / VAT Payable', 'Income Tax Payable'];

/** Income-related group patterns */
const INCOME_GROUPS = [
  'Direct Income (Sales)', 'Medicine Sales', 'Healthcare Product Sales', 'General Item Sales',
  'Indirect Income (Other Income)', 'Delivery Income', 'Discount Received',
  'Commission Received', 'Other Income',
];

/** Expense-related group patterns */
const EXPENSE_GROUPS = [
  'Cost of Goods Sold (Direct Expenses)', 'Purchase of Medicines', 'Purchase of Healthcare Products',
  'Purchase of General Items', 'Damaged / Expired Stock Loss', 'Delivery & Packaging Cost',
  'Indirect Expenses (Overhead)',
];

const SALES_GROUPS = INCOME_GROUPS;
const PURCHASE_GROUPS = EXPENSE_GROUPS;

type SideHint = 'debit' | 'credit' | 'either';

interface VoucherHint {
  title: string;
  description: string;
  debitLabel: string;
  creditLabel: string;
  suggestSide: (ledger: Ledger) => SideHint;
  categorizeLedgers: (ledgers: Ledger[]) => { suggested: Ledger[]; other: Ledger[] };
}

const isCashBank = (l: Ledger) => CASH_BANK_GROUPS.includes(l.groupName);
const isReceivable = (l: Ledger) => RECEIVABLE_GROUPS.includes(l.groupName);
const isPayable = (l: Ledger) => PAYABLE_GROUPS.includes(l.groupName);
const isTax = (l: Ledger) => TAX_GROUPS.includes(l.groupName);
const isExpense = (l: Ledger) => l.group?.nature === 'Expense' || EXPENSE_GROUPS.includes(l.groupName);
const isIncome = (l: Ledger) => l.group?.nature === 'Income' || INCOME_GROUPS.includes(l.groupName);
const isAsset = (l: Ledger) => l.group?.nature === 'Asset';
const isLiability = (l: Ledger) => l.group?.nature === 'Liability';
const isEquity = (l: Ledger) => l.group?.nature === 'Equity';

const VOUCHER_HINTS: Record<string, VoucherHint> = {
  'Expense': {
    title: 'Payment Voucher — What are you paying for?',
    description: 'Debit the expense account you are paying for. Credit the cash/bank you paid from, or the supplier you owe.',
    debitLabel: 'Expense / Cost (What did you pay for?)',
    creditLabel: 'Cash / Bank / Supplier (How did you pay?)',
    suggestSide: (l) => {
      if (isExpense(l)) return 'debit';
      if (isCashBank(l) || isPayable(l)) return 'credit';
      if (isTax(l)) return 'credit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isExpense(l) || isCashBank(l) || isPayable(l) || isTax(l));
      const other = ledgers.filter(l => !isExpense(l) && !isCashBank(l) && !isPayable(l) && !isTax(l));
      return { suggested, other };
    },
  },
  'Income': {
    title: 'Receipt Voucher — What money came in?',
    description: 'Debit the cash/bank where money was received. Credit the income account for what was earned.',
    debitLabel: 'Cash / Bank / Receivable (Where did money come in?)',
    creditLabel: 'Income / Revenue (What income was earned?)',
    suggestSide: (l) => {
      if (isCashBank(l) || isReceivable(l)) return 'debit';
      if (isIncome(l)) return 'credit';
      if (isTax(l)) return 'credit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isCashBank(l) || isReceivable(l) || isIncome(l) || isTax(l));
      const other = ledgers.filter(l => !isCashBank(l) && !isReceivable(l) && !isIncome(l) && !isTax(l));
      return { suggested, other };
    },
  },
  'Journal': {
    title: 'Journal Voucher — Adjustments & Corrections',
    description: 'Used for adjustments, corrections, and transfers between accounts. No restrictions — debit and credit as needed.',
    debitLabel: 'Debit Account',
    creditLabel: 'Credit Account',
    suggestSide: () => 'either',
    categorizeLedgers: (ledgers) => ({ suggested: [], other: ledgers }),
  },
  'Sales': {
    title: 'Sales Voucher — Record a sale',
    description: 'Debit the cash/bank or receivable. Credit the sales revenue account.',
    debitLabel: 'Cash / Bank / Receivable (What did you receive?)',
    creditLabel: 'Sales / Revenue Account (What was sold?)',
    suggestSide: (l) => {
      if (isCashBank(l) || isReceivable(l)) return 'debit';
      if (isIncome(l)) return 'credit';
      if (isTax(l)) return 'credit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isCashBank(l) || isReceivable(l) || isIncome(l) || isTax(l));
      const other = ledgers.filter(l => !isCashBank(l) && !isReceivable(l) && !isIncome(l) && !isTax(l));
      return { suggested, other };
    },
  },
  'Purchase': {
    title: 'Purchase Voucher — Record a purchase',
    description: 'Debit the purchase/cost account. Credit the cash/bank or payable.',
    debitLabel: 'Purchase / Cost Account (What was bought?)',
    creditLabel: 'Cash / Bank / Supplier (How was it paid?)',
    suggestSide: (l) => {
      if (isExpense(l)) return 'debit';
      if (isCashBank(l) || isPayable(l)) return 'credit';
      if (isTax(l)) return 'credit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isExpense(l) || isCashBank(l) || isPayable(l) || isTax(l));
      const other = ledgers.filter(l => !isExpense(l) && !isCashBank(l) && !isPayable(l) && !isTax(l));
      return { suggested, other };
    },
  },
  'Contra': {
    title: 'Contra Voucher — Cash & Bank Transfers',
    description: 'Transfer funds between your own cash and bank accounts. Debit the account receiving money, credit the account sending money. Only cash/bank accounts are used.',
    debitLabel: 'Receiving Account (Cash / Bank where money goes IN)',
    creditLabel: 'Sending Account (Cash / Bank where money goes OUT)',
    suggestSide: (l) => {
      if (isCashBank(l)) return 'either';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isCashBank(l));
      const other = ledgers.filter(l => !isCashBank(l));
      return { suggested, other };
    },
  },
  'Debit Note': {
    title: 'Debit Note Voucher — Purchase Return',
    description: 'Return goods to a supplier. Debit the supplier/payable (reducing what you owe them). Credit the purchase/expense account being reversed.',
    debitLabel: 'Supplier / Payable (Who is being debited?)',
    creditLabel: 'Purchase / Expense Account (What is being returned?)',
    suggestSide: (l) => {
      if (isPayable(l)) return 'debit';
      if (isExpense(l)) return 'credit';
      if (isCashBank(l)) return 'debit';
      if (isTax(l)) return 'credit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isPayable(l) || isExpense(l) || isCashBank(l) || isTax(l));
      const other = ledgers.filter(l => !isPayable(l) && !isExpense(l) && !isCashBank(l) && !isTax(l));
      return { suggested, other };
    },
  },
  'Credit Note': {
    title: 'Credit Note Voucher — Sales Return',
    description: 'Accept returned goods from a customer. Debit the sales/returns account being reversed. Credit the customer/receivable (reducing what they owe you).',
    debitLabel: 'Sales / Returns Account (What is being reversed?)',
    creditLabel: 'Customer / Receivable (Who is being credited?)',
    suggestSide: (l) => {
      if (isIncome(l)) return 'debit';
      if (isReceivable(l)) return 'credit';
      if (isCashBank(l)) return 'credit';
      if (isTax(l)) return 'debit';
      return 'either';
    },
    categorizeLedgers: (ledgers) => {
      const suggested = ledgers.filter(l => isIncome(l) || isReceivable(l) || isCashBank(l) || isTax(l));
      const other = ledgers.filter(l => !isIncome(l) && !isReceivable(l) && !isCashBank(l) && !isTax(l));
      return { suggested, other };
    },
  },
};

const blankEntry = (): EntryRow => ({ ledgerId: '', ledgerName: '', debit: '', credit: '', taxRate: '0', taxAmount: '0' });

/** Voucher type selection card — main dashboard KPI card design (glassmorphism, gleam, 3D tilt) */
function VoucherTypeCard({ name, selected, onSelect }: { name: string; selected: boolean; onSelect: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const config = VOUCHER_CONFIG[name];
  const meta = VOUCHER_CARD_META[name] || { icon: <FilePlus className="h-3.5 w-3.5" />, cssClass: styles.bgJournal, order: 99 };

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

  // Short display title: "Income (Receipt Voucher)" → "Income" + "Receipt Voucher"
  const label = config?.label || name;
  const parenMatch = label.match(/^([^(]+)\s*(?:\((.+)\))?/);
  const title = parenMatch?.[1]?.trim() || label;
  const qualifier = parenMatch?.[2]?.trim();

  return (
    <div
      ref={cardRef}
      className={`${styles.vtCard} ${meta.cssClass} ${selected ? styles.vtCardActive : ''}`}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="button"
      aria-pressed={selected}
      aria-label={`${label} voucher type`}
      title={config?.description || 'Accounting voucher'}
    >
      <div className={styles.vtHeader}>
        <div className={styles.iconBadge}>{meta.icon}</div>
        <span className={styles.vtTitle}>
          {title}
          {qualifier && <span className="block font-normal opacity-75">{qualifier}</span>}
        </span>
        <span className={styles.vtPrefix}>{config?.prefix || 'V'}</span>
      </div>
    </div>
  );
}

/** Validate a single entry row and return warning messages */
function getEntryWarnings(entry: EntryRow, idx: number): string[] {
  const warnings: string[] = [];
  const d = parseFloat(entry.debit);
  const c = parseFloat(entry.credit);
  const hasDebit = entry.debit !== '' && d > 0;
  const hasCredit = entry.credit !== '' && c > 0;

  if (hasDebit && hasCredit) {
    warnings.push('Both debit and credit cannot be filled in the same entry');
  }
  if (d < 0) {
    warnings.push('Debit amount cannot be negative');
  }
  if (c < 0) {
    warnings.push('Credit amount cannot be negative');
  }
  if (entry.ledgerId && !hasDebit && !hasCredit && entry.debit === '' && entry.credit === '') {
    warnings.push('Enter a debit or credit amount');
  }

  return warnings;
}

export function CreateVoucher() {
  const { setView, selectedVoucherType, setSelectedVoucherType, refreshKey, triggerRefresh } = useAppStore();
  const [vTypes, setVTypes] = useState<VoucherType[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);

  const [voucherType, setVoucherType] = useState(selectedVoucherType || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [entries, setEntries] = useState<EntryRow[]>([blankEntry(), blankEntry()]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [savedVoucherId, setSavedVoucherId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [helperDismissed, setHelperDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [vt, ld] = await Promise.all([
        fetch('/api/voucher-types').then(r => r.json()),
        fetch('/api/ledgers').then(r => r.json()),
      ]);
      if (!cancelled) {
        setVTypes(vt);
        setLedgers(ld);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (selectedVoucherType) {
      setVoucherType(selectedVoucherType);
    }
  }, [selectedVoucherType]);

  // ============================================================
  // Smart helper computed values
  // ============================================================
  const hint = voucherType ? VOUCHER_HINTS[voucherType] : null;

  const { suggestedLedgers = [], otherLedgers = ledgers } = useMemo(() => {
    if (!hint || showAll) return { suggestedLedgers: [], otherLedgers: ledgers };
    const result = hint.categorizeLedgers(ledgers);
    return { suggestedLedgers: result.suggested || [], otherLedgers: result.other || ledgers };
  }, [hint, ledgers, showAll]);

  const getSideHint = (ledgerId: string): SideHint | null => {
    if (!hint || !ledgerId) return null;
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return null;
    return hint.suggestSide(ledger);
  };

  const handleTypeChange = (type: string) => {
    setVoucherType(type);
    setSelectedVoucherType(type);
    setEntries([blankEntry(), blankEntry()]);
    setShowAll(false);
    setHelperDismissed(false);
  };

  const updateEntry = (idx: number, field: string, value: string) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'ledgerId') {
      const ledger = ledgers.find(l => l.id === value);
      if (ledger) {
        updated[idx].ledgerName = ledger.name;
      }
    }
    if (field === 'debit' || field === 'credit') {
      const amount = parseFloat(value) || 0;
      const taxRate = parseFloat(updated[idx].taxRate) || 0;
      if (taxRate > 0 && amount > 0) {
        updated[idx].taxAmount = String(parseFloat((amount * taxRate / 100).toFixed(2)));
      } else {
        updated[idx].taxAmount = '0';
      }
    }
    if (field === 'taxRate') {
      const rate = parseFloat(value) || 0;
      const debitAmt = parseFloat(updated[idx].debit) || 0;
      const creditAmt = parseFloat(updated[idx].credit) || 0;
      const baseAmt = debitAmt > 0 ? debitAmt : creditAmt;
      updated[idx].taxAmount = rate > 0 && baseAmt > 0 ? String(parseFloat((baseAmt * rate / 100).toFixed(2))) : '0';
    }
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, blankEntry()]);
  };

  const removeEntry = (idx: number) => {
    if (entries.length <= 2) return toast.error('Minimum 2 entries required');
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const roundOffDiff = Math.abs(diff) > 0 && Math.abs(diff) < 1;
  const isValid = diff === 0 && entries.every(e => e.ledgerId && (parseFloat(e.debit) > 0 || parseFloat(e.credit) > 0));

  const entryWarnings: Record<number, string[]> = {};
  entries.forEach((e, i) => {
    const w = getEntryWarnings(e, i);
    if (w.length > 0) entryWarnings[i] = w;
  });
  const hasAnyWarning = Object.keys(entryWarnings).length > 0;

  const applyRoundOff = () => {
    if (Math.abs(diff) === 0 || Math.abs(diff) >= 1) return toast.error('Round-off only works when difference is less than 1 BDT');
    const roundOffLedger = ledgers.find(l => l.name.includes('Round Off'));
    if (!roundOffLedger) return toast.error('Round Off ledger not found. Please create one under Administrative & General Costs.');
    const updated = [...entries];
    if (diff > 0) {
      updated.push({ ledgerId: roundOffLedger.id, ledgerName: roundOffLedger.name, debit: '', credit: diff.toFixed(2), taxRate: '0', taxAmount: '0' });
    } else {
      updated.push({ ledgerId: roundOffLedger.id, ledgerName: roundOffLedger.name, debit: Math.abs(diff).toFixed(2), credit: '', taxRate: '0', taxAmount: '0' });
    }
    setEntries(updated);
    toast.success(`Round-off entry of ৳${Math.abs(diff).toFixed(2)} added`);
  };

  const handleSubmit = async () => {
    if (!voucherType) return toast.error('Select a voucher type');
    if (!date) return toast.error('Date is required');

    if (hasAnyWarning) {
      const firstWarningIdx = Object.keys(entryWarnings)[0];
      const msgs = entryWarnings[Number(firstWarningIdx)];
      return toast.error(`Entry ${Number(firstWarningIdx) + 1}: ${msgs[0]}`);
    }

    if (!isValid) {
      if (roundOffDiff && autoRoundOff) {
        applyRoundOff();
        return;
      }
      return toast.error('Entries must balance (Debit = Credit) and all fields filled');
    }

    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherTypeName: voucherType,
          voucherNumber: voucherNumber || undefined,
          date,
          narration,
          entries: entries.map(e => ({
            ledgerId: e.ledgerId,
            ledgerName: e.ledgerName,
            debit: parseFloat(e.debit) || 0,
            credit: parseFloat(e.credit) || 0,
            taxRate: parseFloat(e.taxRate) || 0,
            taxAmount: parseFloat(e.taxAmount) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const saved = await res.json();
      toast.success(`Voucher ${saved.voucherNumber} created successfully`);
      triggerRefresh();
      setSavedVoucherId(saved.id);
      setView('voucher-list');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create voucher');
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded" />{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => { setView('vouchers'); setSelectedVoucherType(null); }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Create Voucher</h2>
          <p className="text-sm text-muted-foreground">Record a new accounting transaction</p>
        </div>
      </div>

      {/* Voucher Type Selection — main dashboard KPI-style cards */}
      <div>
        <p className="text-sm font-semibold mb-2.5">Voucher Type</p>
        <div className={styles.vtGrid} style={{ perspective: '1000px' }}>
          {[...vTypes]
            .sort((a, b) => (VOUCHER_CARD_META[a.name]?.order ?? 99) - (VOUCHER_CARD_META[b.name]?.order ?? 99))
            .map(vt => (
              <VoucherTypeCard
                key={vt.id}
                name={vt.name}
                selected={voucherType === vt.name}
                onSelect={() => handleTypeChange(vt.name)}
              />
            ))}
        </div>
      </div>

      {voucherType && (
        <>
          {/* Smart Helper Panel */}
          {hint && !helperDismissed && (
            <div className="relative rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <button
                onClick={() => setHelperDismissed(true)}
                className="absolute top-2 right-2 p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-amber-600" />
              </button>
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg mt-0.5 shrink-0">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{hint.title}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{hint.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">Dr</span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{hint.debitLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-sky-200 dark:bg-sky-800 text-sky-800 dark:text-sky-200">Cr</span>
                      <span className="text-xs font-medium text-sky-700 dark:text-sky-300">{hint.creditLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Voucher Number</Label>
                  <Input value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} placeholder={VOUCHER_CONFIG[voucherType] ? `Auto: ${VOUCHER_CONFIG[voucherType].prefix}1, ${VOUCHER_CONFIG[voucherType].prefix}2...` : 'Auto-generated if empty'} />
                </div>
                <div className="grid gap-2">
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Narration</Label>
                  <Input value={narration} onChange={e => setNarration(e.target.value)} placeholder="Brief description" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Entries */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FilePlus className="h-4 w-4" /> Ledger Entries
                  </CardTitle>
                  <CardDescription className="text-xs">Debit total must equal Credit total. Each entry should have either debit OR credit, not both.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hint && (
                    <Button
                      size="sm"
                      variant={showAll ? 'default' : 'outline'}
                      className={showAll ? 'bg-amber-600 hover:bg-amber-700' : ''}
                      onClick={() => setShowAll(!showAll)}
                    >
                      <Filter className="h-3 w-3 mr-1" />
                      {showAll ? 'Smart Filter On' : 'Show All'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={addEntry}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="min-w-[240px]">Ledger Account</TableHead>
                      <TableHead className="w-36 text-right">
                        <span>Debit (BDT) </span>
                        {hint && <span className="text-amber-600 text-[10px] font-normal">← {hint.debitLabel.split('(')[0].trim()}</span>}
                      </TableHead>
                      <TableHead className="w-36 text-right">
                        <span>Credit (BDT) </span>
                        {hint && <span className="text-sky-600 text-[10px] font-normal">← {hint.creditLabel.split('(')[0].trim()}</span>}
                      </TableHead>
                      <TableHead className="w-24 text-right">VAT %</TableHead>
                      <TableHead className="w-28 text-right">Tax Amt</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, idx) => {
                      const warnings = entryWarnings[idx] || [];
                      const hasBoth = (parseFloat(entry.debit) || 0) > 0 && (parseFloat(entry.credit) || 0) > 0;
                      const hasNeg = (parseFloat(entry.debit) || 0) < 0 || (parseFloat(entry.credit) || 0) < 0;
                      const rowHasError = hasBoth || hasNeg;
                      const sideHint = getSideHint(entry.ledgerId);

                      return (
                        <TableRow key={idx} className={rowHasError ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell>
                            <LedgerSearchSelect
                              ledgers={ledgers}
                              suggested={suggestedLedgers}
                              value={entry.ledgerId}
                              onChange={v => updateEntry(idx, 'ledgerId', v)}
                              getSideHint={getSideHint}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                className={`text-right pr-8 ${hasBoth ? 'border-red-400 dark:border-red-600 focus-visible:ring-red-400' : ''} ${
                                  sideHint === 'debit' && !entry.debit ? 'border-amber-300 dark:border-amber-700' : ''
                                }`}
                                placeholder="0.00"
                                value={entry.debit}
                                onChange={e => updateEntry(idx, 'debit', e.target.value)}
                              />
                              {sideHint === 'debit' && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-500 pointer-events-none">Dr</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                className={`text-right pr-8 ${hasBoth ? 'border-red-400 dark:border-red-600 focus-visible:ring-red-400' : ''} ${
                                  sideHint === 'credit' && !entry.credit ? 'border-sky-300 dark:border-sky-700' : ''
                                }`}
                                placeholder="0.00"
                                value={entry.credit}
                                onChange={e => updateEntry(idx, 'credit', e.target.value)}
                              />
                              {sideHint === 'credit' && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-sky-500 pointer-events-none">Cr</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="text-right" value={entry.taxRate} onChange={e => updateEntry(idx, 'taxRate', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <div className="text-right font-mono text-sm">{formatCurrency(parseFloat(entry.taxAmount) || 0)}</div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEntry(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {hasAnyWarning && (
                <div className="border-t border-red-200 dark:border-red-800 px-4 py-3 bg-red-50/50 dark:bg-red-950/20 space-y-1.5">
                  {Object.entries(entryWarnings).map(([idx, msgs]) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">Entry #{Number(idx) + 1}:</span>{' '}
                        {msgs.join('. ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t px-4 py-3 bg-muted/30">
                <div className="flex items-center justify-end gap-8">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Debit: </span>
                    <span className="font-bold font-mono">{formatCurrency(totalDebit)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Credit: </span>
                    <span className="font-bold font-mono">{formatCurrency(totalCredit)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Difference: </span>
                    <span className={`font-bold font-mono ${Math.abs(diff) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(diff))}
                      {Math.abs(diff) < 0.01 ? ' (Balanced)' : ' (Unbalanced)'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {diff !== 0 && !roundOffDiff && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Entries do not balance
                </div>
              )}
              {roundOffDiff && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    Difference: ৳{Math.abs(diff).toFixed(2)}
                  </div>
                  <Button variant="outline" size="sm" onClick={applyRoundOff} className="text-amber-700 border-amber-300 hover:bg-amber-50">
                    Auto Round-Off
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded" />
                Auto Round-Off
              </label>
              <Button variant="outline" onClick={() => setPreviewOpen(true)}>Preview</Button>
              <Button onClick={handleSubmit} disabled={!isValid && !roundOffDiff} className="bg-emerald-600 hover:bg-emerald-700">
                Save Voucher
              </Button>
            </div>
          </div>

          {/* Preview Dialog */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Voucher Preview - {VOUCHER_CONFIG[voucherType]?.label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Voucher No:</span><span className="font-mono">{voucherNumber || `Auto (${VOUCHER_CONFIG[voucherType]?.prefix || 'V'}...)`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{date}</span></div>
                {narration && <div className="flex justify-between"><span className="text-muted-foreground">Narration:</span><span>{narration}</span></div>}
                <Separator />
                <Table>
                  <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.ledgerName || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{parseFloat(e.debit) > 0 ? formatCurrency(parseFloat(e.debit)) : ''}</TableCell>
                        <TableCell className="text-right font-mono">{parseFloat(e.credit) > 0 ? formatCurrency(parseFloat(e.credit)) : ''}</TableCell>
                        <TableCell className="text-right font-mono">{parseFloat(e.taxAmount) > 0 ? formatCurrency(parseFloat(e.taxAmount)) : ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-8 font-bold">
                  <span>Debit: {formatCurrency(totalDebit)}</span>
                  <span>Credit: {formatCurrency(totalCredit)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
                <Button onClick={() => { setPreviewOpen(false); handleSubmit(); }} className="bg-emerald-600 hover:bg-emerald-700" disabled={!isValid}>Confirm & Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}