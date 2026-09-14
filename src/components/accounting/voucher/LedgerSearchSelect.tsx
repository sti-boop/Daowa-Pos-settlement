'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LedgerOption {
  id: string;
  name: string;
  groupName: string;
  group?: { name: string; nature: string; subCategory: string } | null;
}

type SideHint = 'debit' | 'credit' | 'either';

interface LedgerSearchSelectProps {
  /** All available ledgers */
  ledgers: LedgerOption[];
  /** Suggested ledgers for the current voucher type (empty = no suggestion section) */
  suggested?: LedgerOption[];
  /** Currently selected ledger id */
  value: string;
  /** Called with the selected ledger id */
  onChange: (ledgerId: string) => void;
  /** Side hint for the selected ledger (drives the Dr/Cr badge) */
  getSideHint?: (ledgerId: string) => SideHint | null;
  placeholder?: string;
}

/**
 * Searchable ledger account dropdown:
 * - Trigger button styled like a select
 * - Search input at the top of the dropdown
 * - "Suggested Accounts" section (when suggestions exist and search is empty or matches)
 * - "All Accounts" section with all matching ledgers (name + group)
 */
export function LedgerSearchSelect({ ledgers, suggested = [], value, onChange, getSideHint, placeholder = 'Search ledger account...' }: LedgerSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = ledgers.find(l => l.id === value);

  // Clear search shortly after closing for a fresh state next open
  useEffect(() => {
    if (!open) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => setSearch(''), 200);
    }
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [open]);

  const q = search.trim().toLowerCase();

  const filteredSuggested = useMemo(
    () => suggested.filter(l =>
      !q || l.name.toLowerCase().includes(q) || l.groupName.toLowerCase().includes(q)
    ),
    [suggested, q]
  );

  const filteredOthers = useMemo(() => {
    const suggestedIds = new Set(filteredSuggested.map(l => l.id));
    return ledgers.filter(l =>
      (!q || l.name.toLowerCase().includes(q) || l.groupName.toLowerCase().includes(q)) &&
      !suggestedIds.has(l.id)
    );
  }, [ledgers, q, filteredSuggested]);

  const sideHint = value && getSideHint ? getSideHint(value) : null;

  const handleSelect = (ledgerId: string) => {
    onChange(ledgerId);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9"
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? selected.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-2.5">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-9 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search accounts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button
                  className="rounded-sm p-0.5 opacity-50 hover:opacity-100"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>
            <CommandList className="max-h-72">
              {filteredSuggested.length === 0 && filteredOthers.length === 0 && (
                <CommandEmpty>No accounts found for &quot;{search}&quot;.</CommandEmpty>
              )}

              {filteredSuggested.length > 0 && (
                <CommandGroup heading="Suggested Accounts">
                  {filteredSuggested.map(l => (
                    <CommandItem
                      key={l.id}
                      value={l.id}
                      onSelect={() => handleSelect(l.id)}
                      className="gap-1.5"
                    >
                      <Check className={cn('h-3.5 w-3.5 shrink-0', value === l.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{l.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[110px]">{l.groupName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {filteredOthers.length > 0 && (
                <CommandGroup heading={filteredSuggested.length > 0 ? 'Other Accounts' : 'All Accounts'}>
                  {filteredOthers.map(l => (
                    <CommandItem
                      key={l.id}
                      value={l.id}
                      onSelect={() => handleSelect(l.id)}
                      className="gap-1.5"
                    >
                      <Check className={cn('h-3.5 w-3.5 shrink-0', value === l.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{l.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[110px]">{l.groupName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            {(suggested.length > 0) && !q && (
              <div className="border-t px-2.5 py-1.5 text-[10px] text-muted-foreground">
                Type to search all {ledgers.length} accounts
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      {sideHint && sideHint !== 'either' && (
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-5 font-medium shrink-0 ${
            sideHint === 'debit'
              ? 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/30'
              : 'border-sky-300 text-sky-700 bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:bg-sky-950/30'
          }`}
        >
          {sideHint === 'debit' ? '↓ Dr' : '↓ Cr'}
        </Badge>
      )}
    </div>
  );
}
