'use client';

import { usePosStore } from '@/store/pos-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RotateCcw } from 'lucide-react';

export default function RoundOffSection() {
  const manualRoundOff = usePosStore((s) => s.manualRoundOff);
  const roundOffValue = usePosStore((s) => s.roundOffValue);
  const setManualRoundOff = usePosStore((s) => s.setManualRoundOff);
  const setRoundOffValue = usePosStore((s) => s.setRoundOffValue);
  const getAutoRoundOff = usePosStore((s) => s.getAutoRoundOff);
  const paymentMethod = usePosStore((s) => s.paymentMethod);

  const autoRound = getAutoRoundOff();

  if (paymentMethod !== 'cash') {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-3 md:p-4 shadow-sm card-hover-lift">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-[#3FB98C]" /> Round Off
        </h3>
        <Switch
          checked={manualRoundOff}
          onCheckedChange={setManualRoundOff}
        />
      </div>

      {manualRoundOff ? (
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-gray-400 uppercase w-12 shrink-0">Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={roundOffValue || ''}
            onChange={(e) => setRoundOffValue(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="h-9 text-sm font-semibold tabular-nums"
          />
        </div>
      ) : (
        <div className="flex justify-between items-center text-[11px] py-1">
          <span className="text-gray-500">Auto round:</span>
          <span className="font-bold text-[#3FB98C] tabular-nums">
            {autoRound >= 0 ? '+' : ''}৳{autoRound.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
