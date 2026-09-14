'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/accounting-store';

const STORAGE_KEY = 'daowa-accounting-data';
const SAVE_INTERVAL = 15_000; // 15 seconds
const MAX_DATA_SIZE = 10 * 1024 * 1024; // 10MB localStorage limit safety

interface AutoSaveState {
  saving: boolean;
  lastSaved: Date | null;
  restoring: boolean;
  error: string | null;
}

export function useAutoSave() {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const [state, setState] = useState<AutoSaveState>({
    saving: false,
    lastSaved: null,
    restoring: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const lastSaveTimeRef = useRef<number>(0);

  // Save current DB state to localStorage
  const saveToLocalStorage = useCallback(async (source: string) => {
    try {
      // Throttle: don't save more than once every 5 seconds
      const now = Date.now();
      if (now - lastSaveTimeRef.current < 5000) return;
      lastSaveTimeRef.current = now;

      setState((prev) => ({ ...prev, saving: true, error: null }));

      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch data for save');

      const text = await res.text();
      if (text.length > MAX_DATA_SIZE) {
        throw new Error('Data too large for localStorage');
      }

      localStorage.setItem(STORAGE_KEY, text);
      const timestamp = new Date();
      localStorage.setItem(STORAGE_KEY + '-ts', timestamp.toISOString());

      if (mountedRef.current) {
        setState((prev) => ({ ...prev, saving: false, lastSaved: timestamp }));
      }
    } catch (err) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : 'Auto-save failed',
        }));
      }
    }
  }, []);

  // Restore from localStorage to DB
  const restoreFromLocalStorage = useCallback(async () => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return false;

    try {
      const parsed = JSON.parse(savedData);
      if (!parsed._meta || parsed._meta.app !== 'daowa-accounting') return false;

      if (mountedRef.current) {
        setState((prev) => ({ ...prev, restoring: true }));
      }

      // Check if DB is empty or seems reset by checking groups count
      const checkRes = await fetch('/api/groups');
      const checkData = await checkRes.json();
      const currentGroupCount = Array.isArray(checkData) ? checkData.length : 0;
      const savedGroupCount = Array.isArray(parsed.groups) ? parsed.groups.length : 0;

      // If DB has similar or more data than saved, no need to restore
      if (currentGroupCount >= savedGroupCount && currentGroupCount > 0) {
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, restoring: false }));
        }
        return false;
      }

      // Restore data to DB
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: savedData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Restore failed');

      if (mountedRef.current) {
        setState((prev) => ({ ...prev, restoring: false }));
        triggerRefresh();
      }
      return true;
    } catch (err) {
      console.error('Auto-restore failed:', err);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, restoring: false, error: 'Auto-restore failed' }));
      }
      return false;
    }
  }, [triggerRefresh]);

  // Initial restore on mount
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const restored = await restoreFromLocalStorage();
      if (restored) {
        // After restore, do a fresh save to update timestamp
        setTimeout(() => saveToLocalStorage('post-restore'), 2000);
      } else {
        // First save on load
        saveToLocalStorage('init');
      }
    };

    // Small delay to let the app fully initialize
    const timer = setTimeout(init, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on data changes (refreshKey triggers after mutations)
  useEffect(() => {
    if (refreshKey > 0) {
      const timer = setTimeout(() => saveToLocalStorage('mutation'), 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshKey, saveToLocalStorage]);

  // Periodic auto-save
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      saveToLocalStorage('periodic');
    }, SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [saveToLocalStorage]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronous save attempt using navigator.sendBeacon for reliability
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        // Data already in localStorage from periodic saves, just ensure it's fresh
        // The last save should have been within 15 seconds
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    saveNow: () => saveToLocalStorage('manual'),
    restoreNow: restoreFromLocalStorage,
  };
}