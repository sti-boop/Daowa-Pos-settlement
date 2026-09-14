'use client';

import { useEffect } from 'react';
import { useAppStore, type AppView } from '@/lib/accounting-store';

/**
 * Global keyboard shortcuts (GitHub-style):
 * - g then d → Dashboard
 * - g then l → Ledgers
 * - g then c → Chart of Accounts
 * - g then v → Voucher Register
 * - g then r → Reports
 * - g then a → Audit Trail
 * - g then j → Recurring Journals
 * - g then s → Company Setup
 * - n → New Voucher (create form)
 * - Escape → close dialogs naturally (handled by Radix)
 *
 * Shortcuts are ignored while typing in inputs/textareas/contenteditable
 * or when a modal dialog is open.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    let awaitingG = false;
    let awaitingTimeout: ReturnType<typeof setTimeout> | null = null;

    const navMap: Record<string, AppView> = {
      d: 'dashboard',
      l: 'ledgers',
      c: 'groups',
      v: 'voucher-list',
      r: 'reports',
      a: 'audit',
      j: 'recurring-journals',
      s: 'company',
    };

    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Never trigger while typing
      if (isTyping(e.target)) return;
      // Skip when any Radix dialog/overlay is open
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;

      const { setView, setSelectedVoucherType } = useAppStore.getState();
      const key = e.key.toLowerCase();

      if (awaitingG) {
        // Second key of the g-sequence
        if (awaitingTimeout) clearTimeout(awaitingTimeout);
        awaitingG = false;
        const view = navMap[key];
        if (view) {
          e.preventDefault();
          setView(view);
          if (view !== 'create-voucher') setSelectedVoucherType(null);
        }
        return;
      }

      if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        awaitingG = true;
        // Reset the g-prefix if the next key doesn't arrive in 800ms
        awaitingTimeout = setTimeout(() => { awaitingG = false; }, 800);
        return;
      }

      if (key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSelectedVoucherType(null);
        setView('create-voucher');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (awaitingTimeout) clearTimeout(awaitingTimeout);
    };
  }, []);
}
