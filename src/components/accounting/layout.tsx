'use client';

import { useEffect, useState, useSyncExternalStore, useCallback } from 'react';
import {
  LayoutDashboard, BookOpen,
  BarChart3, Building2, FilePlus,
  Menu, X, Pill, Repeat, Sun, Moon, History, Keyboard, ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore, type AppView } from '@/lib/accounting-store';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { label: string; icon: React.ReactNode; view: AppView; children?: { label: string; view: AppView }[] }[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'dashboard' },
  { label: 'Masters', icon: <BookOpen className="h-4 w-4" />, view: 'groups',
    children: [
      { label: 'Chart of Accounts', view: 'groups' },
      { label: 'Ledgers', view: 'ledgers' },
    ]
  },
  { label: 'Vouchers', icon: <FilePlus className="h-4 w-4" />, view: 'vouchers',
    children: [
      { label: 'Create Voucher', view: 'create-voucher' },
      { label: 'View Vouchers', view: 'voucher-list' },
    ]
  },
  { label: 'Recurring', icon: <Repeat className="h-4 w-4" />, view: 'recurring-journals',
    children: [
      { label: 'Recurring Journals', view: 'recurring-journals' },
      { label: 'New Recurring', view: 'create-recurring' },
    ]
  },
  { label: 'Reports', icon: <BarChart3 className="h-4 w-4" />, view: 'reports' },
  { label: 'Audit Trail', icon: <History className="h-4 w-4" />, view: 'audit' },
  { label: 'Company', icon: <Building2 className="h-4 w-4" />, view: 'company' },
];

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Masters: true, Vouchers: true, Recurring: true });

  const toggleExpand = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNav = (targetView: AppView) => {
    setView(targetView);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static top-0 left-0 z-50 lg:z-auto h-full border-r border-border bg-card transition-all duration-300 overflow-hidden',
          sidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full w-64 lg:w-0 lg:translate-x-0'
        )}
      >
        {/* Inner fixed-width wrapper prevents content reflow during collapse animation */}
        <div className="w-64 h-full flex flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#4A90E2] to-[#5BA0F2] text-white shadow-sm">
            <Pill className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">Daowa Healthcare</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Accounting System</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 shrink-0" onClick={() => setSidebarOpen(false)} title="Collapse menu" aria-label="Collapse menu">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <nav className="p-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        view === item.view || item.children.some(c => view === c.view)
                          ? 'bg-[#4A90E2]/10 text-[#4A90E2] font-semibold'
                          : 'text-muted-foreground hover:bg-[#4A90E2]/5 hover:text-[#4A90E2]'
                      )}
                    >
                      {item.icon}
                      <span className="flex-1 text-left">{item.label}</span>
                      <span className="text-xs">{expanded[item.label] ? '▾' : '▸'}</span>
                    </button>
                    {expanded[item.label] && (
                      <div className="ml-6 mt-0.5 space-y-0.5">
                        {item.children.map((child) => (
                          <button
                            key={child.label}
                            onClick={() => handleNav(child.view)}
                            className={cn(
                              'flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors',
                              view === child.view
                                ? 'bg-[#4A90E2]/10 text-[#4A90E2] font-medium'
                                : 'text-muted-foreground hover:bg-[#4A90E2]/5 hover:text-[#4A90E2]'
                            )}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => handleNav(item.view)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      view === item.view
                        ? 'bg-[#4A90E2]/10 text-[#4A90E2] font-semibold'
                        : 'text-muted-foreground hover:bg-[#4A90E2]/5 hover:text-[#4A90E2]'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
          {process.env.NODE_ENV === 'development' && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-2">
                <a
                  href="/daowa-accounting.zip"
                  download="daowa-accounting.zip"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>Download App .zip</span>
                </a>
              </div>
            </>
          )}
          <div className="px-4 py-2">
            <a
              href="/"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-[#3FB98C]/10 text-[#2D9F73] hover:bg-[#3FB98C]/20 transition-colors"
              title="Back to Daowa POS"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Back to POS</span>
            </a>
          </div>
          <div className="px-4 py-2">
            <p className="text-[10px] text-muted-foreground">daowa.net Healthcare Accounting</p>
          </div>
        </ScrollArea>
        </div>
      </aside>
    </>
  );
}

/** Lightweight dark-mode toggle (no next-themes → avoids its inline <script> tag). */
function useDarkMode() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}

export function TopBar() {
  const { setSidebarOpen, view } = useAppStore();
  const { theme, toggle } = useDarkMode();
  // False during SSR, true on client — avoids hydration mismatch without setState-in-effect
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    groups: 'Chart of Accounts',
    ledgers: 'Ledgers',
    vouchers: 'Vouchers',
    'create-voucher': 'Create Voucher',
    'voucher-list': 'Voucher Register',
    'audit': 'Audit Trail',
    'recurring-journals': 'Recurring Journals',
    'create-recurring': 'New Recurring Journal',
    reports: 'Reports',
    'view-report': 'Report',
    company: 'Company Setup',
  };



  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          margin: 10mm;
          size: A4;
        }
        @media print {
          /* Hide non-content elements */
          aside, header { display: none !important; visibility: hidden !important; }
          .print\\:hidden { display: none !important; }
          /* Extra: hide sidebar overlay */
          .fixed.inset-0 { display: none !important; }
          /* Belt-and-suspenders: hide sidebar by class */
          aside * { display: none !important; }
          
          /* FIX: Break out of viewport-constrained layout so all report content flows */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .h-screen,
          [class*="h-screen"] {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .overflow-hidden,
          .overflow-y-auto,
          .overflow-x-auto {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
            height: auto !important;
            display: block !important;
          }
          
          /* Force light mode colors for print */
          :root, .dark, [data-theme="dark"] {
            --background: white !important;
            --foreground: black !important;
            --card: white !important;
            --card-foreground: black !important;
            --border: #d1d5db !important;
            --muted-foreground: #374151 !important;
            --primary: #1e40af !important;
            --ring: #3b82f6 !important;
          }
          
          /* Make cards print-friendly */
          .rounded-xl, .rounded-lg, .rounded-md {
            border-radius: 4px !important;
          }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
            box-shadow: none !important;
          }
          .bg-background, .bg-card {
            background: white !important;
          }
          
          /* Show print header */
          .print-header {
            display: block !important;
          }
          
          /* Ensure tables print fully */
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          
          /* Badge colors for print */
          .bg-blue-100 { background: #dbeafe !important; }
          .text-blue-800 { color: #1e40af !important; }
          .bg-red-100 { background: #fee2e2 !important; }
          .text-red-800 { color: #991b1b !important; }
          .bg-emerald-100 { background: #d1fae5 !important; }
          .text-emerald-800 { color: #065f46 !important; }
          .bg-orange-100 { background: #ffedd5 !important; }
          .text-orange-800 { color: #9a3412 !important; }
          .bg-green-100 { background: #dcfce7 !important; }
          .text-green-800 { color: #166534 !important; }
          .bg-amber-100 { background: #fef3c7 !important; }
          .text-amber-800 { color: #92400e !important; }
        }
        .print-header { display: none; }
      `}} />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl hover:bg-muted"
          onClick={() => setSidebarOpen(true)}
          title="Open menu"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">{titles[view] || 'Dashboard'}</h1>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-muted hidden sm:flex"
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Keyboard Shortcuts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Press keys outside of input fields</p>
            </div>
            <div className="p-2 text-sm">
              {[
                { keys: ['g', 'd'], label: 'Dashboard' },
                { keys: ['g', 'c'], label: 'Chart of Accounts' },
                { keys: ['g', 'l'], label: 'Ledgers' },
                { keys: ['g', 'v'], label: 'Voucher Register' },
                { keys: ['g', 'j'], label: 'Recurring Journals' },
                { keys: ['g', 'r'], label: 'Reports' },
                { keys: ['g', 'a'], label: 'Audit Trail' },
                { keys: ['g', 's'], label: 'Company Setup' },
                { keys: ['n'], label: 'New Voucher' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50">
                  <span className="text-sm">{item.label}</span>
                  <span className="flex gap-1">
                    {item.keys.map((k, i) => (
                      <kbd key={i} className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-sm">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-muted"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>
        )}
      </header>
    </>
  );
}