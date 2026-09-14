'use client';

import React, { useState } from 'react';
import {
  PackageX,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Pill,
  Truck,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { HealthcareOrder } from '@/lib/types';

interface CourierReturnQueueProps {
  orders: HealthcareOrder[];
  onVerifyAndRestock: (orderId: string, condition: 'intact' | 'damaged') => Promise<void>;
  isProcessing: boolean;
}

export const CourierReturnQueue: React.FC<CourierReturnQueueProps> = ({
  orders,
  onVerifyAndRestock,
  isProcessing,
}) => {
  const returnOrders = orders.filter((o) => o.status === 'failed_pending_return');
  const [selectedConditions, setSelectedConditions] = useState<Record<string, 'intact' | 'damaged'>>({});

  const handleConditionChange = (orderId: string, condition: 'intact' | 'damaged') => {
    setSelectedConditions((prev) => ({ ...prev, [orderId]: condition }));
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-[#EC5B38]/50/20 text-[#EC5B38] text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-500/30">
              Return & Quality Check
            </span>
            <span className="text-xs text-white/80">
              {returnOrders.length} Parcels Awaiting Inspection
            </span>
          </div>
          <h2 className="text-xl font-bold">Courier Return & Damage Inspection Queue</h2>
          <p className="text-xs text-white/80">
            Inspect returned COD medicine parcels from Steadfast, Pathao, and RedX. Restock resalable medicines back to active pharmacy inventory with 1 click.
          </p>
        </div>

        <div className="bg-gray-100/90 px-4 py-3 rounded-xl border border-gray-300 text-xs flex items-center space-x-3">
          <Sparkles className="w-4 h-4 text-[#2D9F73] flex-shrink-0" />
          <span className="text-gray-500">
            1-Click restock automatically balances inventory and logs the return delivery fee.
          </span>
        </div>
      </div>

      {/* Return Parcels Grid */}
      {returnOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#3FB98C]/10 text-[#2D9F73] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#524646] text-base">Return Inspection Queue is Clear!</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            All failed or cancelled courier parcels have been verified, inventory restored, and return courier fees recorded in the background ledger.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {returnOrders.map((order) => {
            const currentCondition = selectedConditions[order.id] || order.returnCondition || 'intact';
            const returnFee = order.returnCourierCharge || 50;

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between hover:border-gray-300 transition"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 bg-[#FCF2E5]/40/70 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#524646]">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] font-semibold text-[#2D9F73] bg-[#3FB98C]/5 px-2 py-0.5 rounded border border-[#3FB98C]/15">
                        {order.courierName || 'Steadfast'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {order.consignmentId}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Customer */}
                    <div>
                      <span className="text-[#A8A492] text-[10px] uppercase font-bold block">Patient / Customer</span>
                      <div className="font-bold text-[#524646]">{order.customerName}</div>
                      <div className="text-gray-500 text-[11px]">{order.customerPhone}</div>
                    </div>

                    {/* Return Reason */}
                    <div className="bg-[#EC5B38]/5 border border-[#EC5B38]/20 rounded-lg p-2.5 text-rose-900">
                      <span className="font-bold block text-[10px] uppercase text-[#EC5B38] mb-0.5">Courier Return Note</span>
                      <span className="text-xs">{order.returnReason || 'Customer delivery attempt failed'}</span>
                    </div>

                    {/* Medicine Items */}
                    <div>
                      <span className="text-[#A8A492] text-[10px] uppercase font-bold block mb-1">Prescription Items ({order.items.length})</span>
                      <div className="bg-[#FCF2E5]/40 rounded-lg p-2 space-y-1 divide-y divide-gray-200/60">
                        {order.items.map((item) => (
                          <div key={item.id} className="pt-1 first:pt-0 flex justify-between items-center text-[11px]">
                            <span className="font-medium text-gray-800">{item.name}</span>
                            <span className="text-gray-500 font-mono">x{item.quantity} (৳{item.total.toLocaleString()})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Return Charges */}
                    <div className="flex justify-between items-center pt-1 text-gray-600">
                      <span>Courier Return Delivery Fee:</span>
                      <span className="font-bold text-rose-600">৳{returnFee.toLocaleString()}</span>
                    </div>

                    {/* Quality Assessment Selector */}
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1.5">
                        Pharmacist Physical Inspection:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleConditionChange(order.id, 'intact')}
                          className={`p-2 rounded-lg border text-left transition flex items-center space-x-1.5 ${
                            currentCondition === 'intact'
                              ? 'bg-[#3FB98C]/5 border-[#3FB98C] text-[#2D9F73] font-bold'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-[#FCF2E5]/40'
                          }`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${currentCondition === 'intact' ? 'text-[#2D9F73]' : 'text-[#A8A492]'}`} />
                          <span className="text-[11px]">Intact (Restock)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConditionChange(order.id, 'damaged')}
                          className={`p-2 rounded-lg border text-left transition flex items-center space-x-1.5 ${
                            currentCondition === 'damaged'
                              ? 'bg-[#EC5B38]/5 border-rose-500 text-rose-950 font-bold'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-[#FCF2E5]/40'
                          }`}
                        >
                          <AlertOctagon className={`w-3.5 h-3.5 ${currentCondition === 'damaged' ? 'text-rose-600' : 'text-[#A8A492]'}`} />
                          <span className="text-[11px]">Damaged Seal</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="p-4 bg-[#FCF2E5]/40/70 border-t border-gray-100">
                  <button
                    onClick={() => onVerifyAndRestock(order.id, currentCondition)}
                    disabled={isProcessing}
                    className="w-full bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Verify & Restock to Shelf</span>
                  </button>
                  <p className="text-[10px] text-[#A8A492] text-center mt-1.5">
                    Restocks medicine stock & books ৳{returnFee} return fee automatically.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
