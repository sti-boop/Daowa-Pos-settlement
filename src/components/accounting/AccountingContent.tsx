'use client';

import { useEffect, useRef } from 'react';
import { Dashboard } from '@/components/accounting/dashboard/Dashboard';
import { GroupsPage } from '@/components/accounting/ledger/GroupsPage';
import { LedgersPage } from '@/components/accounting/ledger/LedgersPage';
import { CreateVoucher } from '@/components/accounting/voucher/CreateVoucher';
import { VoucherList } from '@/components/accounting/voucher/VoucherList';
import { RecurringJournalList } from '@/components/accounting/recurring/RecurringJournalList';
import { CreateRecurringJournal } from '@/components/accounting/recurring/CreateRecurringJournal';
import { ReportsPage } from '@/components/accounting/reports/ReportsPage';
import { ReportViewer } from '@/components/accounting/reports/ReportViewer';
import { CompanySetup } from '@/components/accounting/company/CompanySetup';
import { AuditLogPage } from '@/components/accounting/audit/AuditLogPage';
import { StockGroupsPage } from '@/components/accounting/stock/StockGroupsPage';
import { StockItemsPage } from '@/components/accounting/stock/StockItemsPage';
import { useAppStore } from '@/lib/accounting-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ReceivablesPage } from '@/components/accounting/receivables/ReceivablesPage';
import { FixedAssetsPage } from '@/components/accounting/fixed-assets/FixedAssetsPage';
import { PurchasesPage } from '@/components/accounting/purchases/PurchasesPage';
import { BankReconciliationPage } from '@/components/accounting/bank/BankReconciliationPage';
import { YearEndPage } from '@/components/accounting/year-end/YearEndPage';

/**
 * The Accounting module's content — rendered inline inside the single-app shell
 * (the shell owns the one shared left sidebar, so this has no sidebar/topbar).
 */
export default function AccountingContent() {
  const { view, setView } = useAppStore();
  useKeyboardShortcuts();
  const hintShown = useRef(false);

  // One-time shortcuts hint (first dashboard visit per browser)
  useEffect(() => {
    if (view === 'dashboard' && !hintShown.current) {
      hintShown.current = true;
      try {
        if (!localStorage.getItem('daowa-shortcuts-hint')) {
          localStorage.setItem('daowa-shortcuts-hint', '1');
          import('sonner').then(({ toast }) => {
            toast('Keyboard shortcuts enabled', {
              description: 'Press G then a key to navigate (G+D Dashboard, G+L Ledgers, N new voucher). Click the keyboard icon in the top bar for the full list.',
              duration: 7000,
            });
          });
        }
      } catch {
        // localStorage unavailable — skip hint
      }
    }
  }, [view]);

  // Redirect 'vouchers' view to 'create-voucher'
  useEffect(() => {
    if (view === 'vouchers') {
      setView('create-voucher');
    }
  }, [view, setView]);

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return <Dashboard />;
      case 'groups': return <GroupsPage />;
      case 'ledgers': return <LedgersPage />;
      case 'create-voucher': return <CreateVoucher />;
      case 'voucher-list': return <VoucherList />;
      case 'recurring-journals': return <RecurringJournalList />;
      case 'create-recurring': return <CreateRecurringJournal />;
      case 'reports': return <ReportsPage />;
      case 'view-report': return <ReportViewer />;
      case 'company': return <CompanySetup />;
      case 'audit': return <AuditLogPage />;
      case 'stock-groups': return <StockGroupsPage />;
      case 'stock-items': return <StockItemsPage />;
      case 'receivables': return <ReceivablesPage />;
      case 'fixed-assets': return <FixedAssetsPage />;
      case 'purchases': return <PurchasesPage />;
      case 'bank-reconciliation': return <BankReconciliationPage />;
      case 'year-end': return <YearEndPage />;
      default: return <Dashboard />;
    }
  };

  return <div className="min-h-full bg-background p-4 lg:p-6">{renderContent()}</div>;
}
