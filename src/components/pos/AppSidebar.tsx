'use client';

import { useState } from 'react';
import {
  Store, Package, BarChart3, ShieldCheck, BookOpen, Receipt,
  RotateCcw, ChevronLeft, ChevronRight, ShoppingCart, Pause, Download,
} from 'lucide-react';
import HoldOrders from '@/components/pos/HoldOrders';
import { cn } from '@/lib/utils';

export type ModuleKey = 'pos' | 'products' | 'analytics' | 'settlement' | 'accounting';
export type SettlementTab = 'settlement' | 'eod' | 'returns' | 'fees';

interface NavSub {
  label: string;
  kind: 'view' | 'tab' | 'action' | 'hold';
  view?: string;
  tab?: SettlementTab;
  action?: string;
}

interface NavModule {
  key: ModuleKey;
  label: string;
  icon: React.ReactNode;
  subs?: NavSub[];
}

export interface AppSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  activeModule: ModuleKey;
  onNavigate: (module: ModuleKey, opts?: { tab?: SettlementTab; view?: string }) => void;
  onOpenProducts: () => void;
  onOpenAnalytics: () => void;
  onOpenReport: () => void;
  onFocusNewSale: () => void;
  onResumeHold: (items: unknown[]) => void;
  onClearCart: () => void;
  cartItemsCount: number;
  totalItems: number;
  grandTotal: number;
}

const MODULES: NavModule[] = [
  {
    key: 'pos',
    label: 'Point of Sale',
    icon: <Store className="h-5 w-5" />,
    subs: [
      { label: 'New Sale', kind: 'action', action: 'focus' },
      { label: 'On Hold Orders', kind: 'hold' },
    ],
  },
  {
    key: 'products',
    label: 'Products',
    icon: <Package className="h-5 w-5" />,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    subs: [
      { label: 'Sales Analytics', kind: 'action', action: 'analytics' },
      { label: 'Daily Report', kind: 'action', action: 'report' },
    ],
  },
  {
    key: 'settlement',
    label: 'Settlement Hub',
    icon: <ShieldCheck className="h-5 w-5" />,
    subs: [
      { label: 'Settlements', kind: 'tab', tab: 'settlement' },
      { label: 'EOD Cash Register', kind: 'tab', tab: 'eod' },
      { label: 'Returns Queue', kind: 'tab', tab: 'returns' },
      { label: 'Fees & Charges', kind: 'tab', tab: 'fees' },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: <BookOpen className="h-5 w-5" />,
    subs: [
      { label: 'Dashboard', kind: 'view', view: 'dashboard' },
      { label: 'Chart of Accounts', kind: 'view', view: 'groups' },
      { label: 'Ledgers', kind: 'view', view: 'ledgers' },
      { label: 'Create Voucher', kind: 'view', view: 'create-voucher' },
      { label: 'Voucher Register', kind: 'view', view: 'voucher-list' },
      { label: 'Recurring Journals', kind: 'view', view: 'recurring-journals' },
      { label: 'Reports', kind: 'view', view: 'reports' },
      { label: 'Stock Groups', kind: 'view', view: 'stock-groups' },
      { label: 'Stock Items', kind: 'view', view: 'stock-items' },
      { label: 'Audit Trail', kind: 'view', view: 'audit' },
      { label: 'Company', kind: 'view', view: 'company' },
    ],
  },
];

export default function AppSidebar(props: AppSidebarProps) {
  const {
    expanded, onToggle, activeModule, onNavigate, onOpenProducts,
    onOpenAnalytics, onOpenReport, onFocusNewSale, onResumeHold, onClearCart,
    cartItemsCount, totalItems, grandTotal,
  } = props;

  const [openModule, setOpenModule] = useState<ModuleKey | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/download-app', { cache: 'no-store' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'daowa-pos-settlement.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      // Fallback: open in a new top-level tab (works if popups are allowed)
      window.open('/api/download-app', '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  };

  const handleModuleClick = (m: NavModule) => {
    if (m.key === 'products') { onOpenProducts(); return; }
    if (m.subs && m.subs.length > 0) {
      if (!expanded) onToggle();
      setOpenModule((cur) => (cur === m.key ? null : m.key));
      // Navigate to the module's default view/tab as well
      onNavigate(m.key);
      return;
    }
    onNavigate(m.key);
  };

  const handleSubClick = (m: NavModule, s: NavSub) => {
    if (s.kind === 'hold') return; // HoldOrders row handles itself
    if (s.kind === 'action') {
      if (s.action === 'focus') { onNavigate('pos'); onFocusNewSale(); }
      else if (s.action === 'analytics') { onNavigate('pos'); onOpenAnalytics(); }
      else if (s.action === 'report') { onNavigate('pos'); onOpenReport(); }
      return;
    }
    if (s.kind === 'tab') { onNavigate('settlement', { tab: s.tab }); return; }
    if (s.kind === 'view') { onNavigate('accounting', { view: s.view }); return; }
  };

  const isActive = (m: NavModule) => {
    if (m.key === activeModule) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-gray-200/70 bg-white/95 backdrop-blur shadow-sm transition-all duration-300',
        expanded ? 'w-64' : 'w-[68px]'
      )}
    >
      {/* Brand + collapse toggle */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200/70 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2D9F73] to-[#3FB98C] text-white shadow-sm">
          <Store className="h-5 w-5" />
        </div>
        {expanded && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-extrabold text-gray-800">Daowa</span>
            <span className="truncate text-[10px] text-gray-400">POS · Settlement · Accounting</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700',
            !expanded && 'ml-0 w-full'
          )}
          title={expanded ? 'Collapse menu' : 'Expand menu'}
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Modules */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {MODULES.map((m) => {
          const hasSubs = !!m.subs && m.subs.length > 0;
          const open = openModule === m.key;
          const active = isActive(m);
          return (
            <div key={m.key}>
              <button
                onClick={() => handleModuleClick(m)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-colors',
                  active ? 'bg-[#2D9F73]/10 text-[#2D9F73]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  !expanded && 'justify-center px-0'
                )}
                title={m.label}
              >
                <span className="shrink-0">{m.icon}</span>
                {expanded && <span className="flex-1 text-left">{m.label}</span>}
                {expanded && hasSubs && <span className="text-xs text-gray-400">{open ? '▾' : '▸'}</span>}
              </button>

              {/* Dropdown sub-menus */}
              {expanded && hasSubs && open && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                  {m.subs!.map((s) => {
                    if (s.kind === 'hold') {
                      return (
                        <HoldOrders
                          key={s.label}
                          onResume={(items) => onResumeHold(items as unknown[])}
                          triggerClassName="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-gray-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                          labelClassName="text-[13px] font-medium"
                        />
                      );
                    }
                    return (
                      <button
                        key={s.label}
                        onClick={() => handleSubClick(m, s)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-[#2D9F73]/5 hover:text-[#2D9F73]"
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Cart summary footer */}
      <div className="shrink-0 border-t border-gray-200/70 p-2">
        {cartItemsCount > 0 ? (
          <div className={cn('space-y-1.5', !expanded && 'flex flex-col items-center')}>
            {expanded ? (
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-2">
                <Receipt className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-700">{cartItemsCount} items ({totalItems})</p>
                  <p className="text-xs font-bold text-[#2D9F73] tabular-nums">৳{grandTotal.toFixed(2)}</p>
                </div>
                <button
                  onClick={onClearCart}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Clear cart"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#2D9F73]/10 text-[#2D9F73]">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2D9F73] px-1 text-[9px] font-bold text-white">
                    {totalItems}
                  </span>
                </div>
                <button
                  onClick={onClearCart}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Clear cart"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-400', !expanded && 'justify-center')}>
            <ShoppingCart className="h-4 w-4 shrink-0" />
            {expanded && <span>Cart is empty</span>}
          </div>
        )}

        {/* Download whole app */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            'mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-[#2D9F73]/5 hover:text-[#2D9F73] disabled:opacity-60 disabled:cursor-wait',
            !expanded && 'justify-center px-0'
          )}
          title="Download the whole app (.zip)"
        >
          <Download className="h-4 w-4 shrink-0" />
          {expanded && <span>{downloading ? 'Preparing zip…' : 'Download app (.zip)'}</span>}
        </button>
      </div>
    </aside>
  );
}
