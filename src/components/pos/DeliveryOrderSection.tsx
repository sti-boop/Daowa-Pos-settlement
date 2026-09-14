'use client';

import { usePosStore } from '@/store/pos-store';
import { Truck, Gift } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DELIVERY_PARTNERS = [
  { code: 'pathao', name: 'Pathao' },
  { code: 'redx', name: 'RedX' },
  { code: 'steadfast', name: 'Steadfast' },
  { code: 'carrybee', name: 'Carrybee' },
  { code: 'other', name: 'Other' },
  { code: 'daowa_rider', name: 'Daowa Rider' },
];

export default function DeliveryOrderSection() {
  const isDelivery = usePosStore((s) => s.isDelivery);
  const setIsDelivery = usePosStore((s) => s.setIsDelivery);
  const deliveryPartnerCode = usePosStore((s) => s.deliveryPartnerCode);
  const setDeliveryPartnerCode = usePosStore((s) => s.setDeliveryPartnerCode);
  const deliveryCharge = usePosStore((s) => s.deliveryCharge);
  const setDeliveryCharge = usePosStore((s) => s.setDeliveryCharge);
  const freeDelivery = usePosStore((s) => s.freeDelivery);
  const setFreeDelivery = usePosStore((s) => s.setFreeDelivery);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-3 md:p-4 shadow-sm card-hover-lift">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-[#3FB98C]" /> Delivery Partner
        </h3>
        <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
      </div>

      {isDelivery && (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] text-gray-400 uppercase mb-1 block">Select Partner</Label>
            <select
              value={deliveryPartnerCode}
              onChange={(e) => setDeliveryPartnerCode(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 text-sm font-medium px-2 bg-white"
            >
              <option value="">— Select —</option>
              {DELIVERY_PARTNERS.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-400 uppercase w-12 shrink-0">Charge</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={deliveryCharge || ''}
              onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-9 text-sm font-semibold tabular-nums"
            />
          </div>

          {/* Free Delivery toggle — company pays the delivery charge as an expense */}
          <div className="flex items-center justify-between bg-[#3FB98C]/5 border border-[#3FB98C]/15 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-[#3FB98C]" />
              <div>
                <span className="text-xs font-bold text-gray-700">Free Delivery</span>
                <p className="text-[10px] text-gray-500">Company pays the charge (booked as expense)</p>
              </div>
            </div>
            <Switch checked={freeDelivery} onCheckedChange={setFreeDelivery} />
          </div>
        </div>
      )}

      {!isDelivery && (
        <p className="text-[11px] text-gray-400 py-1.5">Delivery partner not selected</p>
      )}
    </div>
  );
}
