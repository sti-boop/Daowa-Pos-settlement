'use client';

import { usePosStore } from '@/store/pos-store';
import { StickyNote } from 'lucide-react';

export default function SaleNote() {
  const saleNote = usePosStore((s) => s.saleNote);
  const setSaleNote = usePosStore((s) => s.setSaleNote);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-3 md:p-4 shadow-sm card-hover-lift">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <StickyNote className="h-3.5 w-3.5 text-[#3FB98C]" /> Note
      </h3>
      <textarea
        value={saleNote}
        onChange={(e) => setSaleNote(e.target.value)}
        placeholder="Add a note to this sale (optional)…"
        rows={2}
        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3FB98C]/30 focus:border-[#3FB98C]/50 transition-all"
      />
    </div>
  );
}
