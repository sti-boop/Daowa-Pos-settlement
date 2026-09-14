'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  TrendingUp,
  Banknote,
  Smartphone,
  Download,
  Receipt,
  Wallet,
  Tag,
  Truck,
  Clock,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'

interface DailyReportProps {
  open: boolean
  onClose: () => void
}

interface SaleCustomer {
  name: string
  phone: string
}

interface Sale {
  id: string
  invoiceNo: string
  customerId: string | null
  customer?: SaleCustomer | null
  subtotal: number
  totalDiscount: number
  deliveryCharge: number
  roundingAdjust: number
  grandTotal: number
  paymentMethod: string
  receivedAmount: number
  changeAmount: number
  dueAmount: number
  status: string
  isDelivery: boolean
  createdAt: string
}

const BRAND = '#3FB98C'

const DIGITAL_METHODS = ['bkash', 'nagad', 'rocket', 'card']

function toYMD(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTaka(value: number): string {
  return `৳${(Number.isFinite(value) ? value : 0).toFixed(2)}`
}

function paymentLabel(method: string): string {
  switch (method?.toLowerCase()) {
    case 'cash':
      return 'Cash'
    case 'due':
      return 'Due'
    case 'bkash':
      return 'bKash'
    case 'nagad':
      return 'Nagad'
    case 'rocket':
      return 'Rocket'
    case 'card':
      return 'Card'
    case 'split':
      return 'Split'
    default:
      return method || '—'
  }
}

function statusBadgeVariant(status: string) {
  const s = status?.toLowerCase()
  if (s === 'completed' || s === 'paid' || s === 'delivered') {
    return 'default' as const
  }
  if (s === 'pending' || s === 'partial') {
    return 'secondary' as const
  }
  if (s === 'cancelled' || s === 'refunded') {
    return 'destructive' as const
  }
  return 'outline' as const
}

function downloadCSV(rows: Sale[]): void {
  const headers = [
    'Invoice',
    'Date',
    'Customer',
    'Phone',
    'Payment Method',
    'Subtotal',
    'Discount',
    'Grand Total',
    'Status',
  ]

  const escape = (val: string | number): string => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const body = rows
    .map((r) => {
      const customerName = r.customer?.name || 'Walk-in'
      const phone = r.customer?.phone || ''
      return [
        escape(r.invoiceNo),
        escape(r.createdAt),
        escape(customerName),
        escape(phone),
        escape(paymentLabel(r.paymentMethod)),
        escape(r.subtotal.toFixed(2)),
        escape(r.totalDiscount.toFixed(2)),
        escape(r.grandTotal.toFixed(2)),
        escape(r.status),
      ].join(',')
    })
    .join('\n')

  const csv = [headers.join(','), body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `daily-report-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('CSV downloaded', { description: `${rows.length} sales exported` })
}

export default function DailyReport({ open, onClose }: DailyReportProps) {
  const today = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const [date, setDate] = useState<string>(today)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const fetchSales = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch('/api/sales?limit=200', {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = (await res.json()) as Sale[]
        if (!cancelled) {
          setSales(Array.isArray(json) ? json : [])
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load sales'
          setError(msg)
          toast.error('Failed to load sales', { description: msg })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSales()
    return () => {
      cancelled = true
    }
  }, [open])

  const filtered = useMemo(() => {
    return sales.filter((s) => toYMD(s.createdAt) === date)
  }, [sales, date])

  const summary = useMemo(() => {
    const count = filtered.length
    const revenue = filtered.reduce((acc, s) => acc + (s.grandTotal || 0), 0)
    const cash = filtered
      .filter((s) => (s.paymentMethod || '').toLowerCase() === 'cash')
      .reduce((acc, s) => acc + (s.grandTotal || 0), 0)
    const digital = filtered
      .filter((s) =>
        DIGITAL_METHODS.includes((s.paymentMethod || '').toLowerCase())
      )
      .reduce((acc, s) => acc + (s.grandTotal || 0), 0)
    const due = filtered
      .filter((s) => (s.paymentMethod || '').toLowerCase() === 'due')
      .reduce((acc, s) => acc + (s.grandTotal || 0), 0)
    const discount = filtered.reduce((acc, s) => acc + (s.totalDiscount || 0), 0)
    const delivery = filtered.reduce((acc, s) => acc + (s.deliveryCharge || 0), 0)
    return { count, revenue, cash, digital, due, discount, delivery }
  }, [filtered])

  const handleCSV = () => {
    if (filtered.length === 0) {
      toast.error('No sales to export', {
        description: 'There are no sales for the selected date.',
      })
      return
    }
    downloadCSV(filtered)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col gap-0"
        style={{ borderTopColor: BRAND, borderBottomColor: BRAND }}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: BRAND }}
            >
              <Receipt className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg">Daily Report</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Daowa POS &middot; Sales summary by date
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="daily-report-date"
                className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Select Date
              </label>
              <Input
                id="daily-report-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="sm:max-w-[220px]"
              />
            </div>
            <Button
              onClick={handleCSV}
              variant="outline"
              className="sm:ml-auto"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="px-6 py-5 space-y-6">
            {/* Summary cards */}
            <section aria-label="Summary">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <SummaryCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Total Sales"
                  value={String(summary.count)}
                  accent={BRAND}
                />
                <SummaryCard
                  icon={<Wallet className="h-4 w-4" />}
                  label="Total Revenue"
                  value={formatTaka(summary.revenue)}
                  accent={BRAND}
                />
                <SummaryCard
                  icon={<Banknote className="h-4 w-4" />}
                  label="Cash Sales"
                  value={formatTaka(summary.cash)}
                />
                <SummaryCard
                  icon={<Smartphone className="h-4 w-4" />}
                  label="Digital Sales"
                  value={formatTaka(summary.digital)}
                />
                <SummaryCard
                  icon={<Receipt className="h-4 w-4" />}
                  label="Due Sales"
                  value={formatTaka(summary.due)}
                />
                <SummaryCard
                  icon={<Tag className="h-4 w-4" />}
                  label="Total Discount"
                  value={formatTaka(summary.discount)}
                />
                <SummaryCard
                  icon={<Truck className="h-4 w-4" />}
                  label="Delivery Charge"
                  value={formatTaka(summary.delivery)}
                />
                <SummaryCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Selected Date"
                  value={date || '—'}
                />
              </div>
            </section>

            {/* Sales table */}
            <section aria-label="Sales list">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" style={{ color: BRAND }} />
                  Sales for {date}
                  <Badge variant="secondary" className="ml-1">
                    {filtered.length}
                  </Badge>
                </h3>
              </div>

              {loading ? (
                <div className="space-y-2" aria-busy="true" aria-live="polite">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-md bg-muted/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : error ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full mb-3"
                    style={{ backgroundColor: `${BRAND}1A` }}
                  >
                    <Receipt
                      className="h-7 w-7"
                      style={{ color: BRAND }}
                    />
                  </div>
                  <p className="text-sm font-medium">No sales found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    There are no sales recorded for {date || 'this date'}.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr className="text-left">
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
                            Invoice #
                          </th>
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
                            Time
                          </th>
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
                            Customer
                          </th>
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
                            Payment
                          </th>
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground text-right">
                            Grand Total
                          </th>
                          <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s) => (
                          <tr
                            key={s.id}
                            className="border-t hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs">
                              {s.invoiceNo || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(s.createdAt)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {s.customer?.name ? (
                                <span className="text-xs">
                                  {s.customer.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Walk-in
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {paymentLabel(s.paymentMethod)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                              {formatTaka(s.grandTotal)}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant={statusBadgeVariant(s.status)}>
                                {s.status || '—'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <Button onClick={onClose} className="sm:ml-auto" variant="default">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
}

function SummaryCard({ icon, label, value, accent }: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            backgroundColor: accent ? `${accent}1A` : 'var(--muted)',
            color: accent || 'currentColor',
          }}
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base font-semibold tabular-nums truncate">
        {value}
      </div>
    </div>
  )
}
