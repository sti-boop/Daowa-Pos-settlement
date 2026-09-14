      'use client';

      import { useEffect, useState, useRef, Fragment } from 'react';
      import { Card, CardContent } from '@/components/ui/card';
      import { Button } from '@/components/ui/button';
      import { Input } from '@/components/ui/input';
      import { Badge } from '@/components/ui/badge';
      import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
      import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
      import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
      import { Plus, Trash2, Search, Eye, FileText, Printer, Download, Pencil, FileSpreadsheet, Package } from 'lucide-react';
      import { useAppStore } from '@/lib/accounting-store';
      import { toast } from 'sonner';
import { LedgerSearchSelect } from './LedgerSearchSelect';

      interface VoucherEntry {
        id: string;
        ledgerId?: string;
        ledgerName: string;
        debit: number;
        credit: number;
        taxRate: number;
        taxAmount: number;
        ledger?: { name: string; groupName: string };
      }

      interface StockEntry {
        id: string;
        stockItemId?: string;
        itemName: string;
        quantity: number;
        rate: number;
        value: number;
        type: string;
        batchNo: string | null;
        expiryDate: string | null;
      }

      interface Voucher {
        id: string;
        voucherNumber: string;
        date: string;
        narration: string | null;
        totalAmount: number;
        voucherType: { id: string; name: string; prefix: string };
        entries: VoucherEntry[];
        stockEntries: StockEntry[];
      }

      interface CompanyInfo {
        name: string;
        address: string;
        phone: string;
        email: string;
        bin: string;
        tin: string;
        logo: string | null;
      }

      const typeColors: Record<string, string> = {
        'Sales': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Purchase': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Income': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Expense': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        'Journal': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'Contra': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
        'Debit Note': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        'Credit Note': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      };

      const formatCurrency = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(n);

      const formatNum = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      function numberToWords(num: number): string {
        if (num === 0) return 'Zero';
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        function convert(n: number): string {
          if (n < 20) return ones[n];
          if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
          if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
          if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
          if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
          return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
        }
        const intPart = Math.floor(Math.abs(num));
        const decPart = Math.round((Math.abs(num) - intPart) * 100);
        let result = convert(intPart) + ' Taka';
        if (decPart > 0) result += ' and ' + convert(decPart) + ' Poisha';
        if (num < 0) result = 'Minus ' + result;
        return result + ' Only';
      }

      const thStyle: React.CSSProperties = { textAlign: 'center', padding: '7px 8px', fontWeight: 700, fontSize: '12px', border: '1px solid #000' };
      const tdStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '12px', border: '1px solid #000', verticalAlign: 'top' };

      /** Printable voucher view matching Daowa journal voucher design */
      function VoucherPrintView({ voucher, company }: { voucher: Voucher; company: CompanyInfo | null }) {
        const totalDebit = voucher.entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = voucher.entries.reduce((s, e) => s + e.credit, 0);
        const totalTax = voucher.entries.reduce((s, e) => s + e.taxAmount, 0);
        const totalStockValue = voucher.stockEntries.reduce((s, e) => s + e.value, 0);
        const hasTax = totalTax > 0;

        const formatDate = (d: string) => {
          const dt = new Date(d + 'T00:00:00');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${String(dt.getDate()).padStart(2, '0')}-${months[dt.getMonth()]}-${String(dt.getFullYear()).slice(-2)}`;
        };

        return (
          <div style={{
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            color: '#000', background: '#fff', padding: '24px 32px', maxWidth: '210mm',
            margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '270mm',
          }}>
            {/* ===== HEADER: Logo top-left, details centered ===== */}
            <div style={{ position: 'relative', marginBottom: '4px', minHeight: '64px' }}>
              {company?.logo && (
                <img
                  src={company.logo}
                  alt="Company Logo"
                  style={{ position: 'absolute', left: 0, top: 0, height: '56px', width: 'auto' }}
                />
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a5c3a', margin: '0', letterSpacing: '0.5px' }}>
                  {company?.name || 'Daowa Healthcare'}
                </div>
                <div style={{ fontSize: '10px', color: '#b91c1c', margin: '0 0 2px 0', fontWeight: 600 }}>
                  a concern of Al-Atal Pharma
                </div>
                <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.5' }}>
                  {company?.address || 'Daowa.net Healthcare Store'}
                </div>
                {company?.phone && (
                  <div style={{ fontSize: '11px', color: '#333' }}>{company.phone}</div>
                )}
              </div>
            </div>

            {/* ===== VOUCHER TITLE ===== */}
            <div style={{ textAlign: 'center', margin: '16px 0 10px 0' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                {voucher.voucherType.name} Voucher
              </div>
            </div>

            {/* ===== NO / DATE ROW ===== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px' }}>
              <div><strong>No. :</strong> {voucher.voucherNumber}</div>
              <div><strong>Dated :</strong> {formatDate(voucher.date)}</div>
            </div>

            {/* ===== MAIN TABLE: Particulars | Debit | Credit [Tax] ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: hasTax ? '44%' : '56%', textAlign: 'left', paddingLeft: '8px' }}>Particulars</th>
                  <th style={{ ...thStyle, width: hasTax ? '18%' : '22%' }}>Debit</th>
                  <th style={{ ...thStyle, width: hasTax ? '18%' : '22%' }}>Credit</th>
                  {hasTax && <th style={{ ...thStyle, width: '10%' }}>Tax</th>}
                </tr>
              </thead>
              <tbody>
                {voucher.entries.map((e, i) => {
                  const isDr = e.debit > 0;
                  const prefix = isDr ? 'Dr' : 'Cr';
                  const byTo = isDr ? 'By' : 'To';
                  return (
                    <tr key={i}>
                      <td style={{ ...tdStyle, lineHeight: '1.6' }}>
                        <div style={{ marginBottom: '2px' }}>
                          <strong>{byTo}</strong> {e.ledgerName}{' '}
                          <span style={{ fontStyle: 'italic', fontWeight: 600, fontSize: '11px' }}>({prefix})</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                        {e.debit > 0 ? formatNum(e.debit) : ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                        {e.credit > 0 ? formatNum(e.credit) : ''}
                      </td>
                      {hasTax && (
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                          {e.taxAmount > 0 ? formatNum(e.taxAmount) : ''}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {/* Empty filler rows for manual look (min 2 rows) */}
                {voucher.entries.length < 2 && Array.from({ length: 2 - voucher.entries.length }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={{ ...tdStyle, height: '24px' }}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    <td style={tdStyle}>&nbsp;</td>
                    {hasTax && <td style={tdStyle}>&nbsp;</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Narration row */}
                {voucher.narration && (
                  <tr>
                    <td style={{ ...tdStyle, fontSize: '11px', fontStyle: 'italic', color: '#444' }}>
                      <strong>On Account of :</strong> {voucher.narration}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>Tk. {formatNum(totalDebit)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>Tk. {formatNum(totalCredit)}</td>
                    {hasTax && <td style={tdStyle}></td>}
                  </tr>
                )}
                {/* Total row (always show) */}
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>
                    {!voucher.narration ? 'Total' : ''}
                  </td>
                  {!voucher.narration && (
                    <>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>Tk. {formatNum(totalDebit)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>Tk. {formatNum(totalCredit)}</td>
                      {hasTax && <td style={tdStyle}></td>}
                    </>
                  )}
                </tr>
              </tfoot>
            </table>

            {/* ===== STOCK ITEMS TABLE (if any) ===== */}
            {voucher.stockEntries.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Stock Items</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '8px' }}>Item</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Rate</th>
                      <th style={thStyle}>Value</th>
                      <th style={thStyle}>Batch</th>
                      <th style={thStyle}>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.stockEntries.map((s, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#666' }}>{i + 1}</td>
                        <td style={tdStyle}>{s.itemName}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{s.quantity}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{formatNum(s.rate)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{formatNum(s.value)}</td>
                        <td style={tdStyle}>{s.batchNo || '-'}</td>
                        <td style={tdStyle}>{s.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>Total</td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>Tk. {formatNum(totalStockValue)}</td>
                      <td colSpan={2} style={tdStyle}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ===== TOTAL AMOUNT ===== */}
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#000', display: 'flex', justifyContent: 'flex-end' }}>
              <strong>Total Amount: Tk. {formatNum(voucher.totalAmount)}</strong>
            </div>

            {/* ===== AMOUNT IN WORDS ===== */}
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#333' }}>
              <strong>In Words:</strong> {numberToWords(voucher.totalAmount)}
            </div>

            {/* ===== SPACER pushes footer to bottom ===== */}
            <div style={{ flex: 1 }}></div>

            {/* ===== FOOTER: Signature lines pinned to very bottom ===== */}
            <div style={{ paddingTop: '24px' }}>
              {/* Authorised Signatory — right-aligned */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '60px' }}>
                <div style={{ width: '200px' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600 }}>Authorised Signatory</div>
                </div>
              </div>
              {/* Prepared by / Checked by / Verified by — 3 columns */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600 }}>Prepared by</div>
                </div>
                <div style={{ width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600 }}>Checked by</div>
                </div>
                <div style={{ width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '11px', textAlign: 'center', fontWeight: 600 }}>Verified by</div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      export function VoucherList() {
        const [vouchers, setVouchers] = useState<Voucher[]>([]);
        const [loading, setLoading] = useState(true);
        const [search, setSearch] = useState('');
        const [localFilterType, setLocalFilterType] = useState('all');
        const [dateFrom, setDateFrom] = useState('');
        const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
        const [deleteId, setDeleteId] = useState<string | null>(null);
        const [expandedId, setExpandedId] = useState<string | null>(null);
        const [printingId, setPrintingId] = useState<string | null>(null);
        const [company, setCompany] = useState<CompanyInfo | null>(null);
        const printRef = useRef<HTMLDivElement>(null);
        const { refreshKey, setView, setSelectedVoucherType, triggerRefresh, voucherListFilter, setVoucherListFilter, voucherListDates, setVoucherListDates } = useAppStore();

        // Edit state
        const [editVoucher, setEditVoucher] = useState<Voucher | null>(null);
        const [editForm, setEditForm] = useState({ date: '', narration: '', voucherNumber: '' });
        const [editEntries, setEditEntries] = useState<{ ledgerId: string; ledgerName: string; debit: number; credit: number; taxRate: number; taxAmount: number }[]>([]);
        const [editStock, setEditStock] = useState<{ stockItemId: string; itemName: string; quantity: number; rate: number; value: number; type: string; batchNo: string; expiryDate: string; existingId?: string }[]>([]);
        const [stockItemsList, setStockItemsList] = useState<{ id: string; name: string; unit: string; openingRate: number }[]>([]);
        const [ledgersList, setLedgersList] = useState<{ id: string; name: string; groupName: string }[]>([]);
        const [savingEdit, setSavingEdit] = useState(false);

        const filterType = voucherListFilter || localFilterType;

        // Apply store-based date range (from dashboard KPI drill-through) once
        const datesApplied = useRef(false);
        useEffect(() => {
          if (voucherListDates && !datesApplied.current) {
            setDateFrom(voucherListDates.from);
            setDateTo(voucherListDates.to);
            datesApplied.current = true;
            setVoucherListDates(null);
          }
        }, [voucherListDates, setVoucherListDates]);

        // Fetch company info + ledgers + stock items for edit dialog
        useEffect(() => {
          fetch('/api/company').then(r => r.json()).then(setCompany).catch(() => {});
          fetch('/api/ledgers').then(r => r.json()).then((l: { id: string; name: string; groupName: string }[]) => setLedgersList(Array.isArray(l) ? l : [])).catch(() => {});
          fetch('/api/stock-items').then(r => r.json()).then((s: { id: string; name: string; unit: string; openingRate: number }[]) => setStockItemsList(Array.isArray(s) ? s : [])).catch(() => {});
        }, []);

        const handleFilterChange = (val: string) => {
          setLocalFilterType(val);
          setVoucherListFilter(val === 'all' ? null : val);
        };

        useEffect(() => {
          let cancelled = false;
          (async () => {
            let url = '/api/vouchers?';
            if (filterType !== 'all') url += `type=${filterType}&`;
            if (dateFrom) url += `from=${dateFrom}&`;
            if (dateTo) url += `to=${dateTo}&`;
            const r = await fetch(url);
            if (!cancelled) { setVouchers(await r.json()); setLoading(false); }
          })();
          return () => { cancelled = true; };
        }, [filterType, dateFrom, dateTo, refreshKey]);

        const filtered = vouchers.filter(v =>
          v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
          v.narration?.toLowerCase().includes(search.toLowerCase()) ||
          v.entries.some(e => e.ledgerName.toLowerCase().includes(search.toLowerCase()))
        );

        const handleDelete = async () => {
          if (!deleteId) return;
          await fetch(`/api/vouchers?id=${deleteId}`, { method: 'DELETE' });
          toast.success('Voucher deleted');
          setDeleteId(null);
          triggerRefresh();
          let url = '/api/vouchers?';
          if (filterType !== 'all') url += `type=${filterType}&`;
          if (dateFrom) url += `from=${dateFrom}&`;
          if (dateTo) url += `to=${dateTo}&`;
          const r = await fetch(url);
          setVouchers(await r.json());
        };

        const handlePrint = (voucher: Voucher) => {
          setPrintingId(voucher.id);
          setTimeout(() => { window.print(); }, 100);
        };

        // ===== Edit handlers =====
        const openEdit = (voucher: Voucher) => {
          setEditVoucher(voucher);
          setEditForm({ date: voucher.date, narration: voucher.narration || '', voucherNumber: voucher.voucherNumber });
          setEditEntries(voucher.entries.map(e => ({
            ledgerId: e.ledgerId || '',
            ledgerName: e.ledgerName,
            debit: e.debit,
            credit: e.credit,
            taxRate: e.taxRate,
            taxAmount: e.taxAmount,
          })));
          setEditStock(voucher.stockEntries.map(s => ({
            stockItemId: (s as StockEntry & { stockItemId?: string }).stockItemId || '',
            itemName: s.itemName,
            quantity: s.quantity,
            rate: s.rate,
            value: s.value,
            type: s.type,
            batchNo: s.batchNo || '',
            expiryDate: s.expiryDate || '',
            existingId: s.id,
          })));
        };

        const updateEntry = (index: number, field: string, value: string | number) => {
          setEditEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
        };

        const updateEntryLedger = (index: number, ledgerId: string) => {
          const ledger = ledgersList.find(l => l.id === ledgerId);
          setEditEntries(prev => prev.map((e, i) => i === index ? { ...e, ledgerId, ledgerName: ledger?.name || e.ledgerName } : e));
        };

        const addEditEntry = () => {
          setEditEntries(prev => [...prev, { ledgerId: '', ledgerName: '', debit: 0, credit: 0, taxRate: 0, taxAmount: 0 }]);
        };

        const removeEditEntry = (index: number) => {
          setEditEntries(prev => prev.filter((_, i) => i !== index));
        };

        // ===== Stock entry handlers =====
        const updateStockEntry = (index: number, field: string, value: string | number) => {
          setEditStock(prev => prev.map((s, i) => {
            if (i !== index) return s;
            const next = { ...s, [field]: value };
            // Auto-compute value = quantity × rate
            if (field === 'quantity' || field === 'rate') {
              const q = field === 'quantity' ? Number(value) : s.quantity;
              const r = field === 'rate' ? Number(value) : s.rate;
              next.value = parseFloat((q * r).toFixed(2));
            }
            return next;
          }));
        };

        const updateStockItem = (index: number, stockItemId: string) => {
          const item = stockItemsList.find(s => s.id === stockItemId);
          setEditStock(prev => prev.map((s, i) => i === index
            ? { ...s, stockItemId, itemName: item?.name || s.itemName, rate: item?.openingRate ?? s.rate, value: parseFloat(((s.quantity || 0) * (item?.openingRate ?? s.rate)).toFixed(2)) }
            : s));
        };

        const addStockEntry = () => {
          setEditStock(prev => [...prev, { stockItemId: '', itemName: '', quantity: 1, rate: 0, value: 0, type: 'Outward', batchNo: '', expiryDate: '' }]);
        };

        const removeStockEntry = (index: number) => {
          setEditStock(prev => prev.filter((_, i) => i !== index));
        };

        const editStockTotal = editStock.reduce((s, e) => s + (e.value || 0), 0);

        const editTotalDebit = editEntries.reduce((s, e) => s + (e.debit || 0), 0);
        const editTotalCredit = editEntries.reduce((s, e) => s + (e.credit || 0), 0);
        const editBalanced = Math.abs(editTotalDebit - editTotalCredit) < 0.01;

        const handleSaveEdit = async () => {
          if (!editVoucher) return;
          if (editEntries.length < 2) return toast.error('At least 2 entries required');
          if (!editBalanced) return toast.error(`Entries not balanced: Dr ${editTotalDebit.toFixed(2)} vs Cr ${editTotalCredit.toFixed(2)}`);
          if (editEntries.some(e => !e.ledgerId)) return toast.error('Every entry needs a ledger selected');

          setSavingEdit(true);
          try {
            const res = await fetch('/api/vouchers', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: editVoucher.id,
                voucherNumber: editForm.voucherNumber,
                date: editForm.date,
                narration: editForm.narration,
                entries: editEntries,
                stockEntries: editStock.map(s => ({
                  stockItemId: s.stockItemId,
                  itemName: s.itemName,
                  quantity: s.quantity,
                  rate: s.rate,
                  value: s.value,
                  type: s.type,
                  batchNo: s.batchNo || undefined,
                  expiryDate: s.expiryDate || undefined,
                })).filter(s => s.stockItemId && s.itemName),
              }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Update failed');
            toast.success(`Voucher ${result.voucherNumber} updated`);
            setEditVoucher(null);
            triggerRefresh();
            let url = '/api/vouchers?';
            if (filterType !== 'all') url += `type=${filterType}&`;
            if (dateFrom) url += `from=${dateFrom}&`;
            if (dateTo) url += `to=${dateTo}&`;
            const r = await fetch(url);
            setVouchers(await r.json());
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update voucher');
          } finally {
            setSavingEdit(false);
          }
        };

        const handleSavePdf = async (voucher: Voucher) => {
          setPrintingId(voucher.id);
          await new Promise(r => setTimeout(r, 200));

          const el = document.getElementById(`voucher-print-${voucher.id}`);
          if (!el) {
            setPrintingId(null);
            toast.error('Print element not found');
            return;
          }

          try {
            const html2canvas = (await import('html2canvas-pro')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(el, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
              position -= pdf.internal.pageSize.getHeight();
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
              heightLeft -= pdf.internal.pageSize.getHeight();
            }

            const safeType = voucher.voucherType.name.replace(/\s+/g, '_');
            const safeDate = voucher.date.replace(/-/g, '');
            pdf.save(`${safeType}_${voucher.voucherNumber}_${safeDate}.pdf`);
            toast.success('PDF saved successfully');
          } catch {
            toast.error('Failed to generate PDF');
          } finally {
            setPrintingId(null);
          }
        };

        const grandTotal = filtered.reduce((s, v) => s + v.totalAmount, 0);
        const printingVoucher = printingId ? vouchers.find(v => v.id === printingId) : null;

        const handleExportCsv = () => {
          if (filtered.length === 0) return toast.error('No vouchers to export');
          const rows = [
            ['Date', 'Type', 'Voucher No', 'Party / Ledger', 'Narration', 'Debit', 'Credit', 'Amount'],
            ...filtered.flatMap(v => {
              const party = v.entries.find(e => e.debit > 0)?.ledgerName || v.entries[0]?.ledgerName || '';
              const totalDr = v.entries.reduce((s, e) => s + e.debit, 0);
              const totalCr = v.entries.reduce((s, e) => s + e.credit, 0);
              // One row per entry; voucher-level fields repeated
              return v.entries.map(e => [
                v.date,
                v.voucherType.name,
                v.voucherNumber,
                party,
                (v.narration || '').replace(/[",\n]/g, ' '),
                e.debit.toFixed(2),
                e.credit.toFixed(2),
                '',
              ]).concat([[v.date, v.voucherType.name, v.voucherNumber, party, (v.narration || '').replace(/[",\n]/g, ' '), totalDr.toFixed(2), totalCr.toFixed(2), v.totalAmount.toFixed(2)]]);
            }),
          ];
          const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `voucher-register-${dateTo || 'all'}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported ${filtered.length} vouchers to CSV`);
        };

        return (
          <div className="space-y-4">
            {/* Print CSS */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #voucher-print-container,
                #voucher-print-container * {
                  visibility: visible !important;
                }
                #voucher-print-container {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  z-index: 99999 !important;
                  background: white !important;
                  overflow: visible !important;
                }
                @page {
                  margin: 10mm;
                  size: A4;
                }
              }
            ` }} />

            {/* Hidden print container */}
            <div
              id="voucher-print-container"
              style={{ position: printingId ? 'static' : 'absolute', left: '-9999px', top: 0, zIndex: -1 }}
              ref={printRef}
            >
              {printingVoucher && <div id={`voucher-print-${printingVoucher.id}`}><VoucherPrintView voucher={printingVoucher} company={company} /></div>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search vouchers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {['Income', 'Expense', 'Contra', 'Sales', 'Purchase', 'Debit Note', 'Credit Note', 'Journal'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-40" />
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-40" />
              </div>
              <Button onClick={() => { setSelectedVoucherType(null); setView('create-voucher'); }} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" /> New Voucher
              </Button>
              <Button variant="outline" onClick={handleExportCsv} className="gap-2 shrink-0" title="Export filtered vouchers to CSV">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Voucher No</TableHead>
                      <TableHead>Party / Ledger</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(6)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>)
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No vouchers found</p>
                        <p className="text-xs mt-1">Create your first voucher to get started</p>
                      </TableCell></TableRow>
                    ) : (
                      <>
                        {filtered.map(v => (
                          <Fragment key={v.id}>
                            <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                              <TableCell>
                                <span className="text-muted-foreground">{expandedId === v.id ? '▾' : '▸'}</span>
                              </TableCell>
                              <TableCell className="text-sm">{v.date}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`text-xs ${typeColors[v.voucherType.name] || ''}`}>
                                  {v.voucherType.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{v.voucherNumber}</TableCell>
                              <TableCell className="text-sm max-w-48 truncate">
                                {v.entries.find(e => e.debit > 0)?.ledgerName || v.entries[0]?.ledgerName || '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">{formatCurrency(v.totalAmount)}</TableCell>
                              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(v)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Print" onClick={() => handlePrint(v)}>
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Save as PDF" onClick={() => handleSavePdf(v)}>
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteId(v.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {expandedId === v.id && (
                              <TableRow className="bg-muted/20">
                                <TableCell colSpan={7} className="p-4">
                                  <div className="text-sm space-y-3">
                                    {v.narration && <p className="text-muted-foreground italic">&quot;{v.narration}&quot;</p>}
                                    <Table>
                                      <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                        {v.entries.map((e, i) => (
                                          <TableRow key={i}>
                                            <TableCell>{e.ledgerName}</TableCell>
                                            <TableCell className="text-right font-mono">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono">{e.taxAmount > 0 ? formatCurrency(e.taxAmount) : '-'}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                    {v.stockEntries.length > 0 && (
                                      <div>
                                        <p className="font-medium text-xs text-muted-foreground mb-1">Stock Items:</p>
                                        {v.stockEntries.map((s, i) => (
                                          <div key={i} className="flex justify-between text-xs py-0.5">
                                            <span>{s.itemName} x {s.quantity} @ {formatCurrency(s.rate)} {s.batchNo ? `(Batch: ${s.batchNo})` : ''} {s.expiryDate ? `(Exp: ${s.expiryDate})` : ''}</span>
                                            <span className="font-mono">{formatCurrency(s.value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        ))}
                        <TableRow className="font-bold bg-muted/30">
                          <TableCell colSpan={5} className="text-right">Total ({filtered.length} vouchers)</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(grandTotal)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this voucher and all its entries. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Edit Voucher Dialog */}
            <Dialog open={!!editVoucher} onOpenChange={(open) => !open && setEditVoucher(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit Voucher
                    {editVoucher && (
                      <Badge variant="secondary" className={`text-xs ${typeColors[editVoucher.voucherType.name] || ''}`}>
                        {editVoucher.voucherType.name}
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription>Update voucher details and entries. Debit must equal Credit.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Voucher Number</Label>
                      <Input value={editForm.voucherNumber} onChange={e => setEditForm(f => ({ ...f, voucherNumber: e.target.value }))} className="font-mono" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Narration</Label>
                      <Input value={editForm.narration} onChange={e => setEditForm(f => ({ ...f, narration: e.target.value }))} placeholder="On account of..." />
                    </div>
                  </div>

                  <div className="rounded-xl border">
                    <div className="grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 px-3 py-2 border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <span>Ledger</span>
                      <span className="text-right">Debit</span>
                      <span className="text-right">Credit</span>
                      <span className="text-right">Tax%</span>
                      <span></span>
                    </div>
                    <div className="p-2 space-y-2">
                      {editEntries.map((entry, i) => (
                        <div key={i} className="grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 items-center">
                          <LedgerSearchSelect
                            ledgers={ledgersList}
                            value={entry.ledgerId}
                            onChange={v => updateEntryLedger(i, v)}
                            placeholder="Search ledger account..."
                          />
                          <Input type="number" step="0.01" value={entry.debit || ''} onChange={e => updateEntry(i, 'debit', parseFloat(e.target.value) || 0)} className="h-8 text-right font-mono text-sm" placeholder="0" />
                          <Input type="number" step="0.01" value={entry.credit || ''} onChange={e => updateEntry(i, 'credit', parseFloat(e.target.value) || 0)} className="h-8 text-right font-mono text-sm" placeholder="0" />
                          <Input type="number" step="0.01" value={entry.taxRate || ''} onChange={e => updateEntry(i, 'taxRate', parseFloat(e.target.value) || 0)} className="h-8 text-right font-mono text-sm" placeholder="0" />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeEditEntry(i)} disabled={editEntries.length <= 2} title="Remove entry">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className={`grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 px-3 py-2 border-t text-sm font-semibold ${editBalanced ? 'bg-muted/30' : 'bg-red-500/10'}`}>
                      <span className={editBalanced ? '' : 'text-red-600'}>{editBalanced ? 'Balanced' : `Diff: ${(editTotalDebit - editTotalCredit).toFixed(2)}`}</span>
                      <span className="text-right font-mono">{editTotalDebit.toFixed(2)}</span>
                      <span className="text-right font-mono">{editTotalCredit.toFixed(2)}</span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="gap-2 w-fit" onClick={addEditEntry}>
                    <Plus className="h-3.5 w-3.5" /> Add Entry
                  </Button>

                  {/* Stock Entries section */}
                  <div className="rounded-xl border border-[#8A5CF9]/25 bg-[#8A5CF9]/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#8A5CF9] flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Stock Items ({editStock.length})
                      </p>
                      {editStock.length > 0 && (
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">Total: {formatCurrency(editStockTotal)}</span>
                      )}
                    </div>
                    {editStock.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No stock items attached to this voucher.</p>
                    ) : (
                      <div className="space-y-2">
                        {editStock.map((s, i) => (
                          <div key={i} className="grid grid-cols-[1fr_80px_90px_95px_90px_90px_36px] gap-1.5 items-center">
                            <Select value={s.stockItemId} onValueChange={v => updateStockItem(i, v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                              <SelectContent className="max-h-56">
                                {stockItemsList.map(item => (
                                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={s.type} onValueChange={v => updateStockEntry(i, 'type', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Outward">Out</SelectItem>
                                <SelectItem value="Inward">In</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input type="number" step="0.01" value={s.quantity || ''} onChange={e => updateStockEntry(i, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-right font-mono text-xs" placeholder="Qty" />
                            <Input type="number" step="0.01" value={s.rate || ''} onChange={e => updateStockEntry(i, 'rate', parseFloat(e.target.value) || 0)} className="h-8 text-right font-mono text-xs" placeholder="Rate" />
                            <Input value={s.batchNo} onChange={e => updateStockEntry(i, 'batchNo', e.target.value)} className="h-8 text-xs" placeholder="Batch" />
                            <div className="text-right text-xs font-mono tabular-nums text-muted-foreground">{s.value.toFixed(2)}</div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeStockEntry(i)} title="Remove item">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="gap-1.5 mt-2 h-7 text-xs text-[#8A5CF9] hover:text-[#8A5CF9] hover:bg-[#8A5CF9]/10" onClick={addStockEntry}>
                      <Plus className="h-3 w-3" /> Add Stock Item
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditVoucher(null)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} disabled={savingEdit || !editBalanced}>
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      }
