'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePosStore } from '@/store/pos-store';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, ScanLine, Zap, Layers, Pill, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface ProductSearchProps {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  category?: string | null;
  generic?: string | null;
  unitPrice: number;
  costPrice?: number | null;
  expiryDate?: string | null;
  unit?: string;
  stock?: number;
  image?: string | null;
  _matchType?: 'barcode' | 'exact' | 'prefix' | 'generic' | 'hybrid' | 'contains';
  _score?: number;
}

const MATCH_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Zap }> = {
  barcode:  { label: 'Barcode',      color: 'text-violet-700',  bgColor: 'bg-violet-50 border-violet-200',  icon: Barcode },
  exact:    { label: 'Exact Match',  color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: Zap },
  prefix:   { label: 'Brand Match',  color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: Zap },
  generic:  { label: 'Generic (Salt)', color: 'text-teal-700',  bgColor: 'bg-teal-50 border-teal-200',       icon: Pill },
  hybrid:   { label: 'Hybrid Match', color: 'text-indigo-700',  bgColor: 'bg-indigo-50 border-indigo-200',   icon: Layers },
  contains: { label: 'Found',        color: 'text-sky-700',     bgColor: 'bg-sky-50 border-sky-200',        icon: Search },
};

/** Highlight matching tokens in a string */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-[#3FB98C]/20 text-[#2D9F73] rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function ProductSearch({ inputRef }: ProductSearchProps) {
  const addToCart = usePosStore((s) => s.addToCart);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHandlingBarcodeRef = useRef(false);

  const handleSelect = useCallback((p: Product, isBarcodeScan = false) => {
    if ((p.stock ?? 0) <= 0) {
      toast.error(`${p.name} is out of stock`);
      setQuery('');
      setResults([]);
      setOpen(false);
      return;
    }
    addToCart({
      id: p.id,
      name: p.name,
      unitPrice: p.unitPrice,
      unit: p.unit || 'pcs',
      barcode: p.barcode || undefined,
      stock: p.stock ?? 0,
      category: p.category ?? '',
      generic: p.generic ?? '',
      costPrice: p.costPrice ?? undefined,
      expiryDate: p.expiryDate ?? undefined,
    });
    setQuery('');
    setResults([]);
    setOpen(false);
    
    if (p.expiryDate) {
      const now = new Date();
      const exp = new Date(p.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        toast.error(`⚠ ${p.name} EXPIRED on ${exp.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}. Remove from cart to proceed.`);
      } else if (daysLeft <= 30) {
        toast.warning(`⏰ ${p.name} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${exp.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })})`);
      }
    }
    
    if (isBarcodeScan) {
      toast.success(`⚡ Scanned & added: ${p.name} (৳${p.unitPrice.toFixed(2)})`);
    } else {
      toast.success(`Added: ${p.name}`);
    }

    setTimeout(() => {
      inputRef?.current?.focus();
    }, 50);
  }, [addToCart, inputRef]);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/products?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: Product[] = await res.json();
        
        // Auto-detect unique barcode scan match
        const exactBarcodeMatches = data.filter(
          (p) => p.barcode && p.barcode.trim().toLowerCase() === trimmed.toLowerCase()
        );

        if (exactBarcodeMatches.length === 1 && !isHandlingBarcodeRef.current) {
          isHandlingBarcodeRef.current = true;
          handleSelect(exactBarcodeMatches[0], true);
          setTimeout(() => {
            isHandlingBarcodeRef.current = false;
          }, 300);
          return;
        }

        setResults(data);
        setOpen(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [handleSelect]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={containerRef} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm card-hover-lift">
      <div className="p-3 md:p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-[#3FB98C]" /> Add Product
          <span className="ml-auto text-[10px] text-gray-400 font-normal">Scan barcode or search</span>
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = query.trim();
                if (!trimmed) return;

                if (results.length > 0) {
                  const barcodeMatch = results.find(
                    (p) => p.barcode && p.barcode.trim().toLowerCase() === trimmed.toLowerCase()
                  );
                  if (barcodeMatch) {
                    handleSelect(barcodeMatch, true);
                    return;
                  }
                  handleSelect(results[0]);
                  return;
                }

                // If results not yet loaded or debounced, perform immediate lookup
                try {
                  setLoading(true);
                  const res = await apiFetch(`/api/products?search=${encodeURIComponent(trimmed)}`);
                  if (res.ok) {
                    const data: Product[] = await res.json();
                    const barcodeMatch = data.find(
                      (p) => p.barcode && p.barcode.trim().toLowerCase() === trimmed.toLowerCase()
                    );
                    if (barcodeMatch) {
                      handleSelect(barcodeMatch, true);
                    } else if (data.length > 0) {
                      handleSelect(data[0]);
                    } else {
                      toast.error(`No product found for "${trimmed}"`);
                    }
                  }
                } catch {
                  // silent
                } finally {
                  setLoading(false);
                }
              }
            }}
            placeholder="Search product by name or scan barcode…"
            className="pl-9 pr-12 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gradient-to-br from-[#3FB98C]/15 to-[#2D9F73]/15 border border-[#3FB98C]/20 flex items-center justify-center group cursor-pointer hover:from-[#3FB98C]/25 hover:to-[#2D9F73]/25 transition-all" title="Barcode scanner ready">
            <ScanLine className="h-4 w-4 text-[#3FB98C] group-hover:scale-110 transition-transform" />
          </div>
          {loading && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-[#3FB98C]/30 border-t-[#3FB98C] rounded-full animate-spin" />
            </div>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-80 overflow-y-auto smooth-scroll">
            {results.map((p, idx) => {
              const matchCfg = p._matchType ? MATCH_CONFIG[p._matchType] : null;
              const MatchIcon = matchCfg?.icon;
              const isFirstBarcode = p._matchType === 'barcode' && idx === 0;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-[#3FB98C]/5 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between gap-2 ${isFirstBarcode ? 'bg-violet-50/50' : ''}`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {/* Match type badge */}
                    {matchCfg && MatchIcon && (
                      <span className={`shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md border ${matchCfg.bgColor}`} title={`${matchCfg.label} match`}>
                        <MatchIcon className={`h-3 w-3 ${matchCfg.color}`} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        <HighlightText text={p.name} query={query} />
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.category && <span>{p.category} · </span>}
                        {p.generic && <span className="italic">{p.generic} · </span>}
                        {p.barcode && <span className="font-mono">{p.barcode} · </span>}
                        Stock: {p.stock ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[#3FB98C]">৳{p.unitPrice.toFixed(2)}</span>
                    {(p.stock ?? 0) <= 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                </button>
              );
            })}
            {/* Result count */}
            {results.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] text-gray-400 text-center border-t border-gray-100 bg-gray-50/50">
                {results.length} result{results.length !== 1 ? 's' : ''} found · sorted by relevance
              </div>
            )}
          </div>
        )}

        {/* No results state */}
        {open && query.trim() && !loading && results.length === 0 && (
          <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-6 text-center">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No products found for &quot;{query}&quot;</p>
            <p className="text-[10px] text-gray-400 mt-1">Try a different spelling or search by category</p>
          </div>
        )}
      </div>
    </div>
  );
}
