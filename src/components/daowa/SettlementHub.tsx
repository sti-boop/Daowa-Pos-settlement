'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Smartphone, 
  CreditCard, 
  Bike, 
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Search,
  Filter,
  Check,
  RotateCcw,
  Receipt,
  Banknote,
  Coins,
  Globe,
  Store,
  Eye,
  Landmark,
  FileText
} from 'lucide-react';
import { 
  HealthcareOrder, 
  SystemFeeSettings, 
  CourierName, 
  MFSProvider,
  BusinessBankAccount
} from '@/lib/types';
import { OverviewData } from '@/services/api';
import { OrderDetailsSettlementModal } from './OrderDetailsSettlementModal';

interface SettlementHubProps {
  overview: OverviewData | null;
  orders: HealthcareOrder[];
  fees: SystemFeeSettings | null;
  bankAccounts?: BusinessBankAccount[];
  onManageBankAccounts?: () => void;
  onSettleMFS: (provider: MFSProvider, bankAccountId?: string) => Promise<void>;
  onSettleCourier: (courierName: CourierName, depositAmount?: number, bankAccountId?: string) => Promise<void>;
  onSettleRider: (riderName: string, collectedAmount?: number) => Promise<void>;
  onSettleCard: (provider: string, bankAccountId?: string) => Promise<void>;
  onSettleIndividualOrder: (orderId: string, bankAccountId?: string, settlementMethod?: string) => Promise<void>;
  isProcessing: boolean;
}

export const SettlementHub: React.FC<SettlementHubProps> = ({
  overview,
  orders,
  fees,
  bankAccounts = [],
  onManageBankAccounts,
  onSettleMFS,
  onSettleCourier,
  onSettleRider,
  onSettleCard,
  onSettleIndividualOrder,
  isProcessing,
}) => {
  const [activeChannelTab, setActiveChannelTab] = useState<'mfs' | 'courier' | 'rider' | 'card' | 'individual'>('mfs');
  const [selectedCourier, setSelectedCourier] = useState<CourierName>('Steadfast');
  const [customCourierDeposit, setCustomCourierDeposit] = useState<string>('');
  const [selectedMfsProvider, setSelectedMfsProvider] = useState<MFSProvider>('bKash');
  const [selectedRider, setSelectedRider] = useState<string>('Rider Tareq');
  const [riderCustomAmount, setRiderCustomAmount] = useState<string>('');

  // Default bank account resolution
  const defaultBank = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank?.id || '');

  // Order inspection modal state
  const [inspectingOrder, setInspectingOrder] = useState<HealthcareOrder | null>(null);

  // State for individual settlements tab
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [individualChannelFilter, setIndividualChannelFilter] = useState<string>('all');
  const [individualSaleTypeFilter, setIndividualSaleTypeFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [individualSearch, setIndividualSearch] = useState<string>('');
  // Per-order settlement method override. Keyed by order id. When undefined
  // for an order, 'auto' (the order's original channel) is used.
  const [orderSettlementMethod, setOrderSettlementMethod] = useState<Record<string, string>>({});

  const currentBankId = selectedBankId || defaultBank?.id;
  const currentBank = bankAccounts.find(b => b.id === currentBankId) || defaultBank;

  const handleSettleOrder = async (orderId: string, bankId?: string) => {
    try {
      setSettlingOrderId(orderId);
      const method = orderSettlementMethod[orderId] || 'auto';
      await onSettleIndividualOrder(orderId, bankId || currentBankId, method);
    } finally {
      setSettlingOrderId(null);
    }
  };

  // Filter pending delivered orders
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'delivered_pending_payout');
  }, [orders]);

  // Helper for computing fees and net per order across any channel
  const getOrderFinancials = (order: HealthcareOrder) => {
    let fee = 0;
    let channelLabel = '';
    let channelColor = 'bg-[#FCF2E5]/40 text-gray-800 border-gray-200';

    if (order.deliveryType === 'third_party_courier') {
      const cRule = fees?.couriers.find(c => c.courierName === order.courierName) || { codFeePercent: 1.0 };
      // COD = 1% of total collectable (product + delivery charge courier collects from customer)
      const collectableAmount = order.totalAmount + (order.deliveryFee || 0) + (order.companyBorneDeliveryCharge || 0);
      const codFee = Math.round((collectableAmount * cRule.codFeePercent) / 100);
      // Fee = companyBorneDeliveryCharge (free delivery expense only) + COD
      // deliveryFee is tracked for COD calc but NOT a company expense for third-party courier
      fee = (order.companyBorneDeliveryCharge || 0) + codFee;
      channelLabel = `${order.courierName || 'Courier'} COD`;
      channelColor = 'bg-[#3FB98C]/5 text-[#2D9F73] border-[#3FB98C]/15';
    } else if (order.paymentMethod.startsWith('card_')) {
      const cardRate = fees?.cards[0]?.feePercent || 2.0;
      fee = Math.round((order.totalAmount * cardRate) / 100);
      channelLabel = 'Card Gateway';
      channelColor = 'bg-[#3FB98C]/5 text-[#2D9F73] border-[#3FB98C]/15';
    } else if (['bkash', 'nagad', 'rocket', 'upay'].includes(order.paymentMethod) || fees?.mfs.some(m => m.provider.toLowerCase() === order.paymentMethod)) {
      const mfsRule = fees?.mfs.find(m => m.provider.toLowerCase() === order.paymentMethod) || { feePercent: 1.15 };
      fee = Math.round((order.totalAmount * mfsRule.feePercent) / 100);
      const provName = order.paymentMethod.toUpperCase();
      channelLabel = `${provName} MFS`;
      channelColor = 'bg-[#3FB98C]/5 text-[#2D9F73] border-[#3FB98C]/15';
    } else if (order.deliveryType === 'own_rider') {
      fee = 0;
      channelLabel = `${order.riderName || 'Rider'} Cash`;
      channelColor = 'bg-amber-50 text-amber-800 border-amber-200';
    } else {
      fee = 0;
      channelLabel = order.paymentMethod === 'due' ? 'POS Due Receivable' : 'POS Cash Counter';
      channelColor = 'bg-[#3FB98C]/5 text-[#2D9F73] border-[#3FB98C]/15';
    }

    const net = order.totalAmount - fee;
    return { fee, net, channelLabel, channelColor };
  };

  // Compute the double-entry accounting postings (Dr/Cr) that WILL happen
  // when this order is settled. Mirrors the backend /api/settle/order logic
  // so the operator sees the exact ledger logic before settling.
  const getAccountingPreview = (order: HealthcareOrder, method: string = 'auto'): {
    lines: { account: string; debit: number; credit: number }[];
    summary: string;
  } => {
    const gross = order.totalAmount;
    const effMethod =
      method === 'auto' || !method
        ? order.deliveryType === 'third_party_courier'
          ? 'courier'
          : order.deliveryType === 'own_rider'
          ? 'rider'
          : order.paymentMethod.startsWith('card_')
          ? 'card'
          : ['bkash', 'nagad', 'rocket', 'upay'].includes(order.paymentMethod) ||
            fees?.mfs.some((m) => m.provider.toLowerCase() === order.paymentMethod)
          ? 'mfs'
          : order.paymentMethod === 'due'
          ? 'due'
          : 'cash'
        : method;

    const lines: { account: string; debit: number; credit: number }[] = [];
    const bankLabel = currentBank?.bankName?.split(' ')[0] + ' Bank A/c' || 'MTB Bank A/c';
    const ledgerAccountName = bankLabel;

    if (effMethod === 'mfs') {
      const provider =
        fees?.mfs.find((m) => m.provider.toLowerCase() === order.paymentMethod)?.provider ||
        order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1);
      const feeRate = fees?.mfs.find((m) => m.provider.toLowerCase() === order.paymentMethod)?.feePercent || 1.15;
      const feeAmt = Math.round((gross * feeRate) / 100);
      const net = gross - feeAmt;
      lines.push({ account: ledgerAccountName, debit: net, credit: 0 });
      lines.push({ account: 'MFS Charge Expense A/c', debit: feeAmt, credit: 0 });
      lines.push({ account: `${provider} Clearing A/c`, debit: 0, credit: gross });
    } else if (effMethod === 'courier') {
      const courier = order.courierName || 'Steadfast';
      const feeRule = fees?.couriers.find((c) => c.courierName === courier) || { codFeePercent: 1.0 };
      const deliveryDeduction = order.companyBorneDeliveryCharge || 0;
      // COD = 1% of total collectable (product + delivery charge courier collects from customer)
      const collectableAmount = order.totalAmount + (order.deliveryFee || 0) + (order.companyBorneDeliveryCharge || 0);
      const codDeduction = Math.round((collectableAmount * feeRule.codFeePercent) / 100);
      const totalDeduct = deliveryDeduction + codDeduction;
      const net = gross - totalDeduct;
      lines.push({ account: ledgerAccountName, debit: net, credit: 0 });
      lines.push({ account: 'Courier Expense A/c', debit: totalDeduct, credit: 0 });
      lines.push({ account: `${courier} Clearing A/c`, debit: 0, credit: gross });
    } else if (effMethod === 'rider') {
      lines.push({ account: 'Main Cash/Vault A/c', debit: gross, credit: 0 });
      lines.push({ account: 'Daowa Rider Clearing A/c', debit: 0, credit: gross });
    } else if (effMethod === 'card') {
      const feeRate = fees?.cards[0]?.feePercent || 2.0;
      const feeAmt = Math.round((gross * feeRate) / 100);
      const net = gross - feeAmt;
      lines.push({ account: ledgerAccountName, debit: net, credit: 0 });
      lines.push({ account: 'Card Gateway Expense A/c', debit: feeAmt, credit: 0 });
      lines.push({ account: 'Card Clearing A/c', debit: 0, credit: gross });
    } else if (effMethod === 'due') {
      lines.push({ account: 'POS Cash Holding A/c', debit: gross, credit: 0 });
      lines.push({ account: 'Customer Accounts Receivable', debit: 0, credit: gross });
    } else {
      // cash
      if (order.paymentMethod === 'due') {
        lines.push({ account: 'POS Cash Holding A/c', debit: gross, credit: 0 });
        lines.push({ account: 'Customer Accounts Receivable', debit: 0, credit: gross });
      } else {
        lines.push({ account: 'Main Cash/Vault A/c', debit: gross, credit: 0 });
        lines.push({ account: 'POS Cash Holding A/c', debit: 0, credit: gross });
      }
    }

    // Build a compact summary string
    const debitLines = lines.filter((l) => l.debit > 0);
    const creditLines = lines.filter((l) => l.credit > 0);
    const summary =
      'Dr: ' + debitLines.map((l) => `${l.account} ৳${l.debit.toLocaleString()}`).join(', ') +
      ' | Cr: ' + creditLines.map((l) => `${l.account} ৳${l.credit.toLocaleString()}`).join(', ');

    return { lines, summary };
  };

  // Filtered orders for the individual settlements tab
  const filteredIndividualOrders = useMemo(() => {
    return pendingOrders.filter(order => {
      // Sale Type Filter
      if (individualSaleTypeFilter !== 'all') {
        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
        if (individualSaleTypeFilter === 'online' && !isOnline) return false;
        if (individualSaleTypeFilter === 'offline' && isOnline) return false;
      }

      // Channel Filter
      if (individualChannelFilter !== 'all') {
        if (individualChannelFilter === 'cash') {
          if (order.deliveryType !== 'pos_counter' || order.paymentMethod.startsWith('card_') || ['bkash','nagad','rocket','upay'].includes(order.paymentMethod)) return false;
        } else if (individualChannelFilter === 'mfs') {
          if (!['bkash', 'nagad', 'rocket', 'upay'].includes(order.paymentMethod) && !fees?.mfs.some(m => m.provider.toLowerCase() === order.paymentMethod)) return false;
        } else if (individualChannelFilter === 'courier') {
          if (order.deliveryType !== 'third_party_courier') return false;
        } else if (individualChannelFilter === 'rider') {
          if (order.deliveryType !== 'own_rider') return false;
        } else if (individualChannelFilter === 'card') {
          if (!order.paymentMethod.startsWith('card_')) return false;
        }
      }

      // Search Filter
      if (individualSearch.trim()) {
        const q = individualSearch.toLowerCase();
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.includes(q);
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesItem = order.items.some(i => i.name.toLowerCase().includes(q) || i.genericName.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesNumber && !matchesItem) return false;
      }

      return true;
    });
  }, [pendingOrders, individualChannelFilter, individualSaleTypeFilter, individualSearch, fees]);

  // Dynamic MFS Breakdown
  const mfsData = useMemo(() => {
    const providers: MFSProvider[] = (fees?.mfs && fees.mfs.length > 0)
      ? fees.mfs.map(m => m.provider)
      : ['bKash', 'Nagad', 'Rocket', 'Upay'];
    return providers.map(p => {
      const pOrders = pendingOrders.filter(o => o.paymentMethod === p.toLowerCase());
      const gross = pOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const rule = fees?.mfs.find(f => f.provider === p) || { feePercent: 1.15 };
      const fee = Math.round((gross * rule.feePercent) / 100);
      const net = gross - fee;
      return {
        provider: p,
        orders: pOrders,
        gross,
        feeRate: rule.feePercent,
        fee,
        net,
        rule,
      };
    });
  }, [pendingOrders, fees]);

  // Dynamic Courier Breakdown
  const courierData = useMemo(() => {
    const couriers: CourierName[] = (fees?.couriers && fees.couriers.length > 0)
      ? fees.couriers.map(c => c.courierName)
      : ['Steadfast', 'Pathao', 'RedX', 'Carrybee'];
    return couriers.map(c => {
      const cOrders = pendingOrders.filter(o => o.deliveryType === 'third_party_courier' && o.courierName === c);
      // Gross = totalAmount (product only — delivery charge doesn't touch company)
      const gross = cOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      // Delivery fees = companyBorneDeliveryCharge only (free delivery expense)
      const deliveryFees = cOrders.reduce((sum, o) => sum + (o.companyBorneDeliveryCharge || 0), 0);
      const rule = fees?.couriers.find(f => f.courierName === c) || { codFeePercent: 1.0 };
      // COD = 1% of total collectable (product + delivery charge courier collects from customer)
      const collectableTotal = cOrders.reduce((sum, o) => sum + o.totalAmount + (o.deliveryFee || 0) + (o.companyBorneDeliveryCharge || 0), 0);
      const codFees = Math.round((collectableTotal * rule.codFeePercent) / 100);
      const totalFees = deliveryFees + codFees;
      const net = gross - totalFees;
      return {
        courier: c,
        orders: cOrders,
        gross,
        deliveryFees,
        codFees,
        totalFees,
        net,
        rule,
      };
    });
  }, [pendingOrders, fees]);

  // Rider Breakdown
  const riderData = useMemo(() => {
    const riders = ['Rider Tareq', 'Rider Sumon', 'Rider Farhan'];
    return riders.map(r => {
      const rOrders = pendingOrders.filter(o => o.deliveryType === 'own_rider' && o.riderName === r);
      const gross = rOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        rider: r,
        orders: rOrders,
        gross,
      };
    });
  }, [pendingOrders]);

  // Card Breakdown
  const cardData = useMemo(() => {
    const cardOrders = pendingOrders.filter(o => o.paymentMethod.startsWith('card_'));
    const gross = cardOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const feeRate = fees?.cards[0]?.feePercent || 2.0;
    const fee = Math.round((gross * feeRate) / 100);
    const net = gross - fee;
    return {
      orders: cardOrders,
      gross,
      feeRate,
      fee,
      net,
    };
  }, [pendingOrders, fees]);

  // Active courier details
  const currentCourierData = courierData.find(c => c.courier === selectedCourier) || courierData[0];
  const currentMfsData = mfsData.find(m => m.provider === selectedMfsProvider) || mfsData[0];
  const currentRiderData = riderData.find(r => r.rider === selectedRider) || riderData[0];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* ALL PENDING SALES — INDIVIDUAL SETTLEMENT QUEUE (TOP BAR)    */}
      {/* Always visible. Shows every sale waiting for settlement      */}
      {/* across ALL channels with sale details + accounting logic.    */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-5 text-white shadow-lg border border-[#3FB98C]/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3FB98C] to-[#2D9F73] flex items-center justify-center shadow-lg flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black tracking-tight text-white">All Pending Sales — Individual Settlement Queue</h3>
                <span className="text-[10px] bg-white/90 text-[#2D9F73]/80 border border-[#3FB98C]/20 px-2 py-0.5 rounded-full font-bold uppercase">Live</span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Every sale waiting for settlement — across Cash, Due, MFS, Courier, Rider &amp; Card. Full sale details + double-entry accounting logic visible before you settle.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center bg-white/10 backdrop-blur-md rounded-xl px-5 py-2.5 border border-white/10">
              <div className="text-[10px] font-bold text-white/80 uppercase">Pending</div>
              <div className="text-2xl font-black text-white">{pendingOrders.length}</div>
              <div className="text-[10px] text-white/80">orders</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-xl px-5 py-2.5 border border-white/10">
              <div className="text-[10px] font-bold text-white/80 uppercase">Gross Value</div>
              <div className="text-2xl font-black text-white">৳{pendingOrders.reduce((s, o) => s + o.totalAmount, 0).toLocaleString()}</div>
              <div className="text-[10px] text-white/80">awaiting clearance</div>
            </div>
            <button
              onClick={() => setActiveChannelTab('individual')}
              className="bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold text-xs px-5 py-3 rounded-xl transition active:scale-95 flex items-center space-x-2 whitespace-nowrap"
              title="Open the full Individual Settlement Queue with sale details + accounting logic"
            >
              <Eye className="w-4 h-4" />
              <span>View All &amp; Settle</span>
              {pendingOrders.length > 0 && (
                <span className="bg-white text-[#2D9F73] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mini channel breakdown strip */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {[
            { label: 'Cash / Due', count: pendingOrders.filter(o => o.deliveryType === 'pos_counter' && !o.paymentMethod.startsWith('card_') && !['bkash','nagad','rocket','upay'].includes(o.paymentMethod) && !fees?.mfs.some(m => m.provider.toLowerCase() === o.paymentMethod)).length, color: 'text-white', dot: 'bg-[#3FB98C]' },
            { label: 'MFS', count: pendingOrders.filter(o => ['bkash','nagad','rocket','upay'].includes(o.paymentMethod) || fees?.mfs.some(m => m.provider.toLowerCase() === o.paymentMethod)).length, color: 'text-white', dot: 'bg-[#3FB98C]' },
            { label: 'Courier COD', count: pendingOrders.filter(o => o.deliveryType === 'third_party_courier').length, color: 'text-white', dot: 'bg-[#3FB98C]' },
            { label: 'Rider', count: pendingOrders.filter(o => o.deliveryType === 'own_rider').length, color: 'text-amber-700', dot: 'bg-amber-400' },
            { label: 'Card', count: pendingOrders.filter(o => o.paymentMethod.startsWith('card_')).length, color: 'text-white', dot: 'bg-[#3FB98C]' },
            { label: 'Returns', count: orders.filter(o => o.status === 'failed_pending_return').length, color: 'text-[#EC5B38]', dot: 'bg-rose-400' },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
              <span className={`w-2 h-2 rounded-full ${item.dot} flex-shrink-0`} />
              <span className="text-white/80 font-medium flex-1">{item.label}</span>
              <span className={`font-black ${item.color}`}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overview Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MFS Card */}
        <div 
          onClick={() => setActiveChannelTab('mfs')}
          className={`cursor-pointer p-4 rounded-xl border transition-all bg-white border border-gray-200 shadow-sm ${
            activeChannelTab === 'mfs' 
              ? 'bg-[#3FB98C]/5 border-[#3FB98C] shadow-md ring-1 ring-[#3FB98C]' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#2D9F73]" />
              MFS Collections
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3FB98C]/10 text-[#2D9F73] font-semibold">
              bKash, Nagad
            </span>
          </div>
          <div className="text-2xl font-black text-[#524646]">
            ৳{overview ? overview.pendingAmounts.mfs.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{overview ? overview.counts.pendingMfs : 0} orders awaiting transfer</span>
            <span className="font-semibold text-[#2D9F73]">1-Click Payout</span>
          </p>
        </div>

        {/* Courier Payouts Card */}
        <div 
          onClick={() => setActiveChannelTab('courier')}
          className={`cursor-pointer p-4 rounded-xl border transition-all bg-white border border-gray-200 shadow-sm ${
            activeChannelTab === 'courier' 
              ? 'bg-[#3FB98C]/5 border-[#3FB98C] shadow-md ring-1 ring-[#3FB98C]' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#2D9F73]" />
              Courier Payouts
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3FB98C]/10 text-[#2D9F73] font-semibold">
              COD Delivered
            </span>
          </div>
          <div className="text-2xl font-black text-[#524646]">
            ৳{overview ? overview.pendingAmounts.courier.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{overview ? overview.counts.pendingCourier : 0} delivered parcels</span>
            <span className="font-semibold text-[#2D9F73]">Steadfast, Pathao</span>
          </p>
        </div>

        {/* Rider Collections Card */}
        <div 
          onClick={() => setActiveChannelTab('rider')}
          className={`cursor-pointer p-4 rounded-xl border transition-all bg-white border border-gray-200 shadow-sm ${
            activeChannelTab === 'rider' 
              ? 'bg-amber-50 border-amber-500 shadow-md ring-1 ring-amber-500' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-amber-600" />
              Rider Collections
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              Daowa Fleet
            </span>
          </div>
          <div className="text-2xl font-black text-[#524646]">
            ৳{overview ? overview.pendingAmounts.rider.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{overview ? overview.counts.pendingRider : 0} orders delivered</span>
            <span className="font-semibold text-amber-700">Cash in Transit</span>
          </p>
        </div>

        {/* Card Gateway Settlements Card */}
        <div 
          onClick={() => setActiveChannelTab('card')}
          className={`cursor-pointer p-4 rounded-xl border transition-all bg-white border border-gray-200 shadow-sm ${
            activeChannelTab === 'card' 
              ? 'bg-[#3FB98C]/5 border-[#3FB98C] shadow-md ring-1 ring-[#3FB98C]' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#2D9F73]" />
              Card Settlements
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3FB98C]/10 text-[#2D9F73] font-semibold">
              POS & Online
            </span>
          </div>
          <div className="text-2xl font-black text-[#524646]">
            ৳{overview ? overview.pendingAmounts.card.toLocaleString() : '0'}
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{overview ? overview.counts.pendingCard : 0} card transactions</span>
            <span className="font-semibold text-[#2D9F73]">Visa / Mastercard</span>
          </p>
        </div>
      </div>

      {/* Main Channel Settlement Workspace */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Sub Navigation Bar */}
        <div className="bg-[#FCF2E5]/40 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveChannelTab('mfs')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeChannelTab === 'mfs'
                  ? 'bg-[#3FB98C] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCF2E5]/40/70'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>MFS Collections (bKash/Nagad)</span>
            </button>

            <button
              onClick={() => setActiveChannelTab('courier')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeChannelTab === 'courier'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCF2E5]/40/70'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Courier Payouts (Steadfast/Pathao)</span>
            </button>

            <button
              onClick={() => setActiveChannelTab('rider')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeChannelTab === 'rider'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCF2E5]/40/70'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Rider Collections</span>
            </button>

            <button
              onClick={() => setActiveChannelTab('card')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeChannelTab === 'card'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCF2E5]/40/70'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Card Settlements</span>
            </button>

            <button
              onClick={() => setActiveChannelTab('individual')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                activeChannelTab === 'individual'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCF2E5]/40/70'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Individual Order Settlements</span>
              <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {pendingOrders.length}
              </span>
            </button>
          </div>

          <div className="flex items-center text-xs text-gray-500 space-x-2 bg-[#FCF2E5]/40/80 px-3 py-1.5 rounded-lg border border-gray-200">
            <Landmark className="w-3.5 h-3.5 text-[#2D9F73] flex-shrink-0" />
            <span className="font-medium text-gray-600">Deposit Bank:</span>
            {bankAccounts.length > 0 ? (
              <select
                value={currentBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#3FB98C]/40"
              >
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} (A/C: {acc.accountNumber.slice(-4)}) {acc.isDefault ? '★' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-gray-800">Mutual Trust Bank (#1029)</strong>
            )}
            {onManageBankAccounts && (
              <button
                onClick={onManageBankAccounts}
                className="text-[11px] font-bold text-[#2D9F73] hover:text-[#2D9F73] underline ml-1"
                title="Manage business bank accounts"
              >
                + Manage
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: MFS Collections */}
        {activeChannelTab === 'mfs' && (
          <div className="p-6 space-y-6">
            {/* Provider Picker Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mfsData.map(item => (
                <div
                  key={item.provider}
                  onClick={() => setSelectedMfsProvider(item.provider)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedMfsProvider === item.provider
                      ? 'border-[#3FB98C] bg-[#3FB98C]/70 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{item.provider}</span>
                    <span className="text-[11px] font-normal text-gray-500">{item.feeRate}% Fee</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#524646] mt-1">
                    ৳{item.gross.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 flex justify-between mt-1">
                    <span>{item.orders.length} orders</span>
                    <span className="text-[#2D9F73] font-semibold">Net: ৳{item.net.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 1-Click Action Banner */}
            <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <span className="bg-[#3FB98C]/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#3FB98C]/20">
                    {currentMfsData.provider} Merchant Collection
                  </span>
                  <span className="text-xs text-white/80 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Auto-Settlement: Every 24h
                  </span>
                </div>
                <h3 className="text-xl font-bold">Transfer {currentMfsData.provider} Funds to Bank</h3>
                <p className="text-xs text-white/80 max-w-xl">
                  Transfers confirmed customer mobile payments directly into Mutual Trust Bank A/c. Processing fee ({currentMfsData.feeRate}%) is automatically accounted for behind the scenes.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-white/80 block text-[10px]">Gross Collections</span>
                    <span className="font-bold text-white">৳{currentMfsData.gross.toLocaleString()}</span>
                  </div>
                  <span className="text-white/80">-</span>
                  <div>
                    <span className="text-white/80 block text-[10px]">MFS Charge ({currentMfsData.feeRate}%)</span>
                    <span className="font-bold text-[#EC5B38]">৳{currentMfsData.fee.toLocaleString()}</span>
                  </div>
                  <span className="text-white/80">=</span>
                  <div>
                    <span className="text-white/80 block text-[10px]">Net Payout into MTB Bank</span>
                    <span className="font-black text-white text-base">৳{currentMfsData.net.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onSettleMFS(currentMfsData.provider, currentBankId)}
                  disabled={isProcessing || currentMfsData.gross === 0}
                  className="w-full sm:w-auto bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm font-bold px-6 py-3.5 rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Settle {currentMfsData.provider} to Bank (৳{currentMfsData.net.toLocaleString()})</span>
                </button>
                <span className="text-[11px] text-white/80">1-Click Automated Processing</span>
              </div>
            </div>

            {/* Pending Orders Detail Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#524646] flex items-center gap-2">
                  <span>Pending {currentMfsData.provider} Delivered Orders</span>
                  <span className="bg-[#FCF2E5]/40 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {currentMfsData.orders.length}
                  </span>
                </h4>
                <span className="text-xs text-gray-500">Includes medicine POS & online orders</span>
              </div>

              {currentMfsData.orders.length === 0 ? (
                <div className="p-8 text-center bg-[#FCF2E5]/40 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-[#2D9F73] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">All {currentMfsData.provider} collections are fully settled!</p>
                  <p className="text-xs text-gray-500 mt-1">Simulate a new POS sale using the button in the header to create pending orders.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Order / Time</th>
                        <th className="px-4 py-3">Sale Type</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Prescribed Medicine Items</th>
                        <th className="px-4 py-3 text-right">Order Amount</th>
                        <th className="px-4 py-3 text-right">MFS Fee ({currentMfsData.feeRate}%)</th>
                        <th className="px-4 py-3 text-right">Net to Bank</th>
                        <th className="px-4 py-3 text-center">Inspect / Settle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentMfsData.orders.map(order => {
                        const fee = Math.round((order.totalAmount * currentMfsData.feeRate) / 100);
                        const net = order.totalAmount - fee;
                        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
                        return (
                          <tr key={order.id} className="hover:bg-[#FCF2E5]/40/80 transition">
                            <td className="px-4 py-3 font-medium text-[#524646]">
                              <div>{order.orderNumber}</div>
                              <div className="text-[10px] text-[#A8A492]">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isOnline ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Globe className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Store className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Offline</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800">{order.customerName}</div>
                              <div className="text-[10px] text-[#A8A492]">{order.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#524646]">
                              ৳{order.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-rose-600 font-medium">
                              -৳{fee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-[#2D9F73]">
                              ৳{net.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setInspectingOrder(order)}
                                  className="p-1.5 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 rounded-lg transition"
                                  title="View order prescription details and audit breakdown before settlement"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSettleOrder(order.id)}
                                  disabled={isProcessing || settlingOrderId === order.id}
                                  className="px-2.5 py-1 bg-[#3FB98C]/5 hover:bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/20 rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                                  title={`Transfer this individual order directly into ${currentBank?.bankName || 'Bank'}`}
                                >
                                  <Check className="w-3 h-3 text-[#2D9F73]" />
                                  <span>{settlingOrderId === order.id ? '...' : 'Settle'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Courier Payouts */}
        {activeChannelTab === 'courier' && (
          <div className="p-6 space-y-6">
            {/* Courier Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {courierData.map(item => (
                <div
                  key={item.courier}
                  onClick={() => {
                    setSelectedCourier(item.courier);
                    setCustomCourierDeposit('');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedCourier === item.courier
                      ? 'border-[#3FB98C] bg-[#3FB98C]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{item.courier}</span>
                    <span className="text-[11px] font-normal text-gray-500">COD 1%</span>
                  </div>
                  <div className="text-lg font-extrabold text-[#524646] mt-1">
                    ৳{item.gross.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 flex justify-between mt-1">
                    <span>{item.orders.length} delivered</span>
                    <span className="text-[#2D9F73] font-semibold">Net: ৳{item.net.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Courier Settlement Action Card */}
            <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-6 text-white shadow-md">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-[#3FB98C]/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#3FB98C]/20">
                      {currentCourierData.courier} Delivered Parcels
                    </span>
                    <span className="text-xs text-white/80">Mutual Trust Bank Settlement</span>
                  </div>
                  <h3 className="text-xl font-bold">Settle {currentCourierData.courier} Bank Deposit</h3>
                  <p className="text-xs text-white/80 max-w-xl">
                    Reconciles delivered COD parcels against the courier deposit received in Mutual Trust Bank. Delivery fees and 1% COD charges are recorded automatically.
                  </p>

                  {/* Deductions Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-gray-100/80 p-2.5 rounded-lg border border-gray-300">
                      <span className="text-[10px] text-[#A8A492] uppercase block font-semibold">Total COD Value</span>
                      <span className="font-bold text-white text-sm">৳{currentCourierData.gross.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-100/80 p-2.5 rounded-lg border border-gray-300">
                      <span className="text-[10px] text-[#A8A492] uppercase block font-semibold">Delivery Charges</span>
                      <span className="font-bold text-[#EC5B38] text-sm">-৳{currentCourierData.deliveryFees.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-100/80 p-2.5 rounded-lg border border-gray-300">
                      <span className="text-[10px] text-[#A8A492] uppercase block font-semibold">COD Fee (1%)</span>
                      <span className="font-bold text-[#EC5B38] text-sm">-৳{currentCourierData.codFees.toLocaleString()}</span>
                    </div>
                    <div className="bg-[#2D9F73]/60 p-2.5 rounded-lg border border-[#2D9F73]">
                      <span className="text-[10px] text-white uppercase block font-semibold">Expected Bank Deposit</span>
                      <span className="font-black text-white text-base">৳{currentCourierData.net.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Match & Deposit Input Section */}
                <div className="w-full lg:w-80 bg-gray-100/90 p-4 rounded-xl border border-gray-300 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      Amount Deposited in MTB Bank (৳)
                    </label>
                    <input
                      type="number"
                      value={customCourierDeposit !== '' ? customCourierDeposit : currentCourierData.net}
                      onChange={(e) => setCustomCourierDeposit(e.target.value)}
                      placeholder={currentCourierData.net.toString()}
                      className="w-full bg-white border border-gray-200 shadow-sm border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-bold text-sm focus:ring-2 focus:ring-[#3FB98C] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#A8A492] mt-1 block">
                      Matches the credit amount on your Mutual Trust Bank SMS
                    </span>
                  </div>

                  <button
                    onClick={() => onSettleCourier(
                      currentCourierData.courier, 
                      customCourierDeposit ? Number(customCourierDeposit) : currentCourierData.net,
                      currentBankId
                    )}
                    disabled={isProcessing || currentCourierData.gross === 0}
                    className="w-full bg-[#3FB98C] hover:bg-[#2D9F73] text-white font-bold px-4 py-3 rounded-lg transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settle Bank Deposit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivered Parcels List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#524646] flex items-center gap-2">
                  <span>Delivered COD Consignments ({currentCourierData.courier})</span>
                  <span className="bg-[#FCF2E5]/40 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {currentCourierData.orders.length}
                  </span>
                </h4>
                <span className="text-xs text-gray-500">Parcels successfully handed to patients</span>
              </div>

              {currentCourierData.orders.length === 0 ? (
                <div className="p-8 text-center bg-[#FCF2E5]/40 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-[#2D9F73] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">No delivered orders pending payout for {currentCourierData.courier}.</p>
                  <p className="text-xs text-gray-500 mt-1">All previous courier deposits have been settled into bank.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Consignment ID</th>
                        <th className="px-4 py-3">Sale Type</th>
                        <th className="px-4 py-3">Order / Customer</th>
                        <th className="px-4 py-3">Medicine Contents</th>
                        <th className="px-4 py-3 text-right">Product Value</th>
                        <th className="px-4 py-3 text-right">Delivery Charge</th>
                        <th className="px-4 py-3 text-right">Total COD Collected</th>
                        <th className="px-4 py-3 text-center">Inspect / Settle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentCourierData.orders.map(order => {
                        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
                        return (
                          <tr key={order.id} className="hover:bg-[#FCF2E5]/40/80 transition">
                            <td className="px-4 py-3 font-mono font-bold text-[#2D9F73]">
                              {order.consignmentId || 'SF-POS-9910'}
                            </td>
                            <td className="px-4 py-3">
                              {isOnline ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Globe className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Store className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Offline</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#524646]">{order.customerName}</div>
                              <div className="text-[10px] text-[#A8A492]">{order.orderNumber} • {order.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              ৳{order.productAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              ৳{order.deliveryFee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-[#524646]">
                              ৳{order.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setInspectingOrder(order)}
                                  className="p-1.5 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 rounded-lg transition"
                                  title="View order details before settlement"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSettleOrder(order.id)}
                                  disabled={isProcessing || settlingOrderId === order.id}
                                  className="px-2.5 py-1 bg-[#3FB98C]/5 hover:bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/20 rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                                  title={`Settle this individual courier parcel into ${currentBank?.bankName || 'Bank'}`}
                                >
                                  <Check className="w-3 h-3 text-[#2D9F73]" />
                                  <span>{settlingOrderId === order.id ? '...' : 'Settle'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Rider Collections */}
        {activeChannelTab === 'rider' && (
          <div className="p-6 space-y-6">
            {/* Rider Picker Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {riderData.map(item => (
                <div
                  key={item.rider}
                  onClick={() => {
                    setSelectedRider(item.rider);
                    setRiderCustomAmount('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedRider === item.rider
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#524646] text-sm">{item.rider}</h4>
                      <p className="text-xs text-gray-500">{item.orders.length} deliveries completed</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Cash in Transit:</span>
                    <span className="text-lg font-black text-[#524646]">৳{item.gross.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rider Settlement Action Card */}
            <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-500/20 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Daowa Express Fleet
                  </span>
                  <span className="text-xs text-white/80">Vault Cash Intake</span>
                </div>
                <h3 className="text-xl font-bold">Collect Cash from {currentRiderData.rider}</h3>
                <p className="text-xs text-white/80 max-w-xl">
                  Receives cash collected by rider for delivered pharmacy orders. Safely deposits the money directly into the Store Central Vault and clears the rider's balance.
                </p>
                <div className="pt-2">
                  <span className="text-xs text-white/80 block">Total Pending Cash:</span>
                  <span className="text-2xl font-black text-amber-700">৳{currentRiderData.gross.toLocaleString()}</span>
                </div>
              </div>

              <div className="w-full md:w-72 bg-gray-100 p-4 rounded-xl border border-gray-300 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    Cash Handed Over (৳)
                  </label>
                  <input
                    type="number"
                    value={riderCustomAmount !== '' ? riderCustomAmount : currentRiderData.gross}
                    onChange={(e) => setRiderCustomAmount(e.target.value)}
                    className="w-full bg-white border border-gray-200 shadow-sm border border-gray-300 rounded-lg px-3 py-2 text-[#524646] font-bold text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => onSettleRider(
                    currentRiderData.rider, 
                    riderCustomAmount ? Number(riderCustomAmount) : currentRiderData.gross
                  )}
                  disabled={isProcessing || currentRiderData.gross === 0}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-[#524646] font-bold px-4 py-3 rounded-lg transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Receive Rider Cash</span>
                </button>
              </div>
            </div>

            {/* Rider Orders Table */}
            <div>
              <h4 className="text-sm font-bold text-[#524646] mb-3 flex items-center gap-2">
                <span>Deliveries by {currentRiderData.rider}</span>
                <span className="bg-[#FCF2E5]/40 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {currentRiderData.orders.length}
                </span>
              </h4>

              {currentRiderData.orders.length === 0 ? (
                <div className="p-8 text-center bg-[#FCF2E5]/40 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-gray-7000 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">No pending cash with {currentRiderData.rider}.</p>
                  <p className="text-xs text-gray-500 mt-1">All collected delivery funds have been safely received into the store vault.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Order Number</th>
                        <th className="px-4 py-3">Sale Type</th>
                        <th className="px-4 py-3">Customer / Area</th>
                        <th className="px-4 py-3">Medicine Items</th>
                        <th className="px-4 py-3 text-right">Medicines Total</th>
                        <th className="px-4 py-3 text-right">Rider Delivery Fee</th>
                        <th className="px-4 py-3 text-right">Total Cash Collected</th>
                        <th className="px-4 py-3 text-center">Inspect / Settle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentRiderData.orders.map(order => {
                        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
                        return (
                          <tr key={order.id} className="hover:bg-[#FCF2E5]/40/80 transition">
                            <td className="px-4 py-3 font-semibold text-[#524646]">
                              {order.orderNumber}
                            </td>
                            <td className="px-4 py-3">
                              {isOnline ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Globe className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Store className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Offline</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800">{order.customerName}</div>
                              <div className="text-[10px] text-[#A8A492]">{order.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              ৳{order.productAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              ৳{order.deliveryFee.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-amber-700">
                              ৳{order.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setInspectingOrder(order)}
                                  className="p-1.5 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 rounded-lg transition"
                                  title="View order prescription details before receiving cash"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSettleOrder(order.id)}
                                  disabled={isProcessing || settlingOrderId === order.id}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                                  title="Receive this delivery order cash into store register"
                                >
                                  <Check className="w-3 h-3 text-amber-700" />
                                  <span>{settlingOrderId === order.id ? '...' : 'Receive Cash'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Card Settlements */}
        {activeChannelTab === 'card' && (
          <div className="p-6 space-y-6">
            {/* Card Payout Banner */}
            <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#3FB98C]/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#3FB98C]/20">
                    Visa & Mastercard Batches
                  </span>
                  <span className="text-xs text-white/80">POS Terminal & Online Gateway</span>
                </div>
                <h3 className="text-xl font-bold">Transfer Card Gateway Payout to Bank</h3>
                <p className="text-xs text-white/80 max-w-xl">
                  Settles credit and debit card transactions from store POS terminals and online checkouts into your selected business bank account.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-white/80 block text-[10px]">Gross Card Sales</span>
                    <span className="font-bold text-white">৳{cardData.gross.toLocaleString()}</span>
                  </div>
                  <span className="text-white/80">-</span>
                  <div>
                    <span className="text-white/80 block text-[10px]">Merchant Fee ({cardData.feeRate}%)</span>
                    <span className="font-bold text-[#EC5B38]">৳{cardData.fee.toLocaleString()}</span>
                  </div>
                  <span className="text-white/80">=</span>
                  <div>
                    <span className="text-white/80 block text-[10px]">Net Payout to Bank</span>
                    <span className="font-black text-white text-base">৳{cardData.net.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSettleCard('Visa / Mastercard', currentBankId)}
                disabled={isProcessing || cardData.gross === 0}
                className="w-full sm:w-auto bg-[#3FB98C] hover:bg-[#2D9F73] text-white font-bold px-6 py-3.5 rounded-xl transition shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
              >
                <CreditCard className="w-4 h-4" />
                <span>Confirm Bank Payout (৳{cardData.net.toLocaleString()})</span>
              </button>
            </div>

            {/* Card Orders List */}
            <div>
              <h4 className="text-sm font-bold text-[#524646] mb-3 flex items-center gap-2">
                <span>Pending Card Transactions</span>
                <span className="bg-[#FCF2E5]/40 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {cardData.orders.length}
                </span>
              </h4>

              {cardData.orders.length === 0 ? (
                <div className="p-8 text-center bg-[#FCF2E5]/40 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-8 h-8 text-[#2D9F73] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">All card batches have been settled to bank!</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Order #</th>
                        <th className="px-4 py-3">Sale Type</th>
                        <th className="px-4 py-3">Cardholder</th>
                        <th className="px-4 py-3">Prescription Items</th>
                        <th className="px-4 py-3 text-right">Card Charge</th>
                        <th className="px-4 py-3 text-right">Merchant Fee ({cardData.feeRate}%)</th>
                        <th className="px-4 py-3 text-right">Net to Bank</th>
                        <th className="px-4 py-3 text-center">Inspect / Settle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cardData.orders.map(order => {
                        const fee = Math.round((order.totalAmount * cardData.feeRate) / 100);
                        const net = order.totalAmount - fee;
                        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
                        return (
                          <tr key={order.id} className="hover:bg-[#FCF2E5]/40/80 transition">
                            <td className="px-4 py-3 font-semibold text-[#524646]">{order.orderNumber}</td>
                            <td className="px-4 py-3">
                              {isOnline ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Globe className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15">
                                  <Store className="w-2.5 h-2.5 text-[#2D9F73]" />
                                  <span>Offline</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{order.customerName}</td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#524646]">৳{order.totalAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-rose-600 font-medium">-৳{fee.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-black text-[#2D9F73]">৳{net.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setInspectingOrder(order)}
                                  className="p-1.5 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 rounded-lg transition"
                                  title="View card transaction details before settlement"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSettleOrder(order.id)}
                                  disabled={isProcessing || settlingOrderId === order.id}
                                  className="px-2.5 py-1 bg-[#3FB98C]/5 hover:bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/20 rounded-lg text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
                                  title={`Transfer this individual card payment into ${currentBank?.bankName || 'Bank'}`}
                                >
                                  <Check className="w-3 h-3 text-[#2D9F73]" />
                                  <span>{settlingOrderId === order.id ? '...' : 'Settle'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Individual Order Settlements (1-Click for Any Payment Type) */}
        {activeChannelTab === 'individual' && (
          <div className="p-6 space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#3FB98C] to-[#2D9F73] rounded-2xl p-6 text-white shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-[#2D9F73]/80 border border-[#3FB98C]/20 text-[11px] font-bold uppercase tracking-wider">
                      Granular 1-Click Clearance
                    </span>
                    <span className="text-xs text-white/80">Zero Accounting Friction</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white">Manual Individual Order Settlement Hub</h3>
                  <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
                    Need to settle an isolated transaction ahead of bulk batch reconciliation? Settle any individual order across Cash, Due, MFS (bKash/Nagad), Couriers (Steadfast/Pathao), Riders, or Cards with a single click.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right min-w-[200px]">
                  <div className="text-[11px] font-bold text-white/80 uppercase">Pending Individual Orders</div>
                  <div className="text-3xl font-black text-white">{filteredIndividualOrders.length}</div>
                  <div className="text-[11px] text-white/80 mt-1">Ready for instant clearance</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#FCF2E5]/40 rounded-xl p-4 border border-gray-200 space-y-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Channel Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Channel:
                  </span>
                  {[
                    { id: 'all', label: 'All Channels', count: pendingOrders.length },
                    { id: 'cash', label: 'Cash / Due', count: pendingOrders.filter(o => o.deliveryType === 'pos_counter' && !o.paymentMethod.startsWith('card_') && !['bkash','nagad','rocket','upay'].includes(o.paymentMethod)).length },
                    { id: 'mfs', label: 'MFS (bKash/Nagad)', count: pendingOrders.filter(o => ['bkash','nagad','rocket','upay'].includes(o.paymentMethod) || fees?.mfs.some(m => m.provider.toLowerCase() === o.paymentMethod)).length },
                    { id: 'courier', label: 'Courier COD', count: pendingOrders.filter(o => o.deliveryType === 'third_party_courier').length },
                    { id: 'rider', label: 'Own Riders', count: pendingOrders.filter(o => o.deliveryType === 'own_rider').length },
                    { id: 'card', label: 'Card Terminals', count: pendingOrders.filter(o => o.paymentMethod.startsWith('card_')).length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setIndividualChannelFilter(tab.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
                        individualChannelFilter === tab.id
                          ? 'bg-white border border-gray-200 shadow-sm text-[#524646] shadow-sm'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-[#FCF2E5]/40'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        individualChannelFilter === tab.id ? 'bg-[#3FB98C] text-white' : 'bg-[#FCF2E5]/40 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-[#A8A492] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search patient, phone, order #..."
                    value={individualSearch}
                    onChange={(e) => setIndividualSearch(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#524646] placeholder-gray-400 font-medium focus:ring-2 focus:ring-[#3FB98C] focus:border-transparent"
                  />
                  {individualSearch && (
                    <button
                      onClick={() => setIndividualSearch('')}
                      className="absolute right-2.5 top-2 text-[#A8A492] hover:text-gray-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Secondary Filter Row: Sale Type (Online vs Offline) */}
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/80">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  Sale Type:
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setIndividualSaleTypeFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                      individualSaleTypeFilter === 'all'
                        ? 'bg-[#3FB98C] text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-[#FCF2E5]/40'
                    }`}
                  >
                    All Sales ({pendingOrders.length})
                  </button>
                  <button
                    onClick={() => setIndividualSaleTypeFilter('online')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1 ${
                      individualSaleTypeFilter === 'online'
                        ? 'bg-[#2D9F73] text-[#524646] shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-[#FCF2E5]/40'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Online Orders ({pendingOrders.filter(o => o.saleType === 'online' || (o.deliveryType !== 'pos_counter' && !o.saleType)).length})</span>
                  </button>
                  <button
                    onClick={() => setIndividualSaleTypeFilter('offline')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1 ${
                      individualSaleTypeFilter === 'offline'
                        ? 'bg-[#3FB98C] text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-[#FCF2E5]/40'
                    }`}
                  >
                    <Store className="w-3 h-3" />
                    <span>Offline / In-Store POS ({pendingOrders.filter(o => o.saleType === 'offline' || (o.deliveryType === 'pos_counter' && !o.saleType)).length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Summary Stats Cards */}
            {filteredIndividualOrders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtered Orders</div>
                  <div className="text-2xl font-black text-[#524646] mt-1">{filteredIndividualOrders.length}</div>
                  <div className="text-[11px] text-[#A8A492] mt-0.5">Ready for individual clearance</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Sales Value</div>
                  <div className="text-2xl font-black text-[#524646] mt-1">
                    ৳{filteredIndividualOrders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#A8A492] mt-0.5">Medicine billed total</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Channel Deductions</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    ৳{filteredIndividualOrders.reduce((sum, o) => sum + getOrderFinancials(o).fee, 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#A8A492] mt-0.5">MFS & COD commission cuts</div>
                </div>

                <div className="bg-[#3FB98C]/5 p-4 rounded-xl border border-[#3FB98C]/15 shadow-xs">
                  <div className="text-xs font-bold text-[#2D9F73] uppercase tracking-wider">Net Realizable Funds</div>
                  <div className="text-2xl font-black text-[#2D9F73] mt-1">
                    ৳{filteredIndividualOrders.reduce((sum, o) => sum + getOrderFinancials(o).net, 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#2D9F73] mt-0.5">Direct to Bank / Vault</div>
                </div>
              </div>
            )}

            {/* Individual Orders Table */}
            <div>
              {filteredIndividualOrders.length === 0 ? (
                <div className="p-12 text-center bg-[#FCF2E5]/40 rounded-2xl border border-dashed border-gray-200">
                  <CheckCircle2 className="w-10 h-10 text-[#2D9F73] mx-auto mb-2" />
                  <h4 className="text-base font-bold text-[#524646]">All Individual Orders Settled</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    {individualSearch || individualChannelFilter !== 'all' 
                      ? 'No pending orders match your active filter or search criteria.' 
                      : 'There are currently zero pending unsettled orders across any payment channel.'}
                  </p>
                  {(individualSearch || individualChannelFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setIndividualChannelFilter('all');
                        setIndividualSearch('');
                      }}
                      className="mt-4 px-3 py-1.5 bg-white border border-gray-200 shadow-sm text-[#524646] rounded-lg text-xs font-bold hover:bg-gray-100 transition"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FCF2E5]/40 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Order Number & Time</th>
                        <th className="px-4 py-3">Sale Type</th>
                        <th className="px-4 py-3">Customer / Patient</th>
                        <th className="px-4 py-3">Payment Channel</th>
                        <th className="px-4 py-3">Prescription Items</th>
                        <th className="px-4 py-3 text-right">Gross Total</th>
                        <th className="px-4 py-3 text-right">Fee / Deduct</th>
                        <th className="px-4 py-3 text-right">Net to Deposit</th>
                        <th className="px-4 py-3">Accounting Logic (Dr / Cr)</th>
                        <th className="px-4 py-3 text-center">Settle via Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredIndividualOrders.map(order => {
                        const { fee, net, channelLabel, channelColor } = getOrderFinancials(order);
                        const isOnline = order.saleType === 'online' || (order.deliveryType !== 'pos_counter' && !order.saleType);
                        return (
                          <tr key={order.id} className="hover:bg-[#FCF2E5]/40/80 transition">
                            <td className="px-4 py-3">
                              <div className="font-bold text-[#524646]">{order.orderNumber}</div>
                              <div className="text-[10px] text-[#A8A492]">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isOnline ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15 shadow-xs">
                                  <Globe className="w-3 h-3 text-[#2D9F73]" />
                                  <span>Online</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#3FB98C]/10 text-[#2D9F73] border border-[#3FB98C]/15 shadow-xs">
                                  <Store className="w-3 h-3 text-[#2D9F73]" />
                                  <span>Offline POS</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-800">{order.customerName}</div>
                              <div className="text-[10px] text-[#A8A492]">{order.customerPhone}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${channelColor}`}>
                                {channelLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                              {order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#524646]">
                              ৳{order.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-rose-600 font-medium">
                              {fee > 0 ? `-৳${fee.toLocaleString()}` : '৳0'}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-[#2D9F73]">
                              ৳{net.toLocaleString()}
                            </td>
                            {/* Accounting Logic — shows exact Dr/Cr ledger postings */}
                            <td className="px-4 py-3">
                              {(() => {
                                const acctMethod = orderSettlementMethod[order.id] || 'auto';
                                const acct = getAccountingPreview(order, acctMethod);
                                return (
                                  <div className="space-y-0.5">
                                    {acct.lines.map((l, idx) => (
                                      <div key={idx} className="text-[10px] leading-tight flex items-start gap-1">
                                        {l.debit > 0 ? (
                                          <span className="font-mono">
                                            <span className="text-[#2D9F73] font-bold">Dr</span>{' '}
                                            <span className="text-gray-700">{l.account}</span>{' '}
                                            <span className="text-[#524646] font-bold">৳{l.debit.toLocaleString()}</span>
                                          </span>
                                        ) : (
                                          <span className="font-mono">
                                            <span className="text-[#2D9F73] font-bold">Cr</span>{' '}
                                            <span className="text-gray-700">{l.account}</span>{' '}
                                            <span className="text-[#524646] font-bold">৳{l.credit.toLocaleString()}</span>
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <select
                                  value={orderSettlementMethod[order.id] || 'auto'}
                                  onChange={(e) =>
                                    setOrderSettlementMethod((prev) => ({ ...prev, [order.id]: e.target.value }))
                                  }
                                  disabled={isProcessing || settlingOrderId === order.id}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-800 focus:ring-1 focus:ring-[#3FB98C]/40 focus:outline-none disabled:opacity-60"
                                  title="Choose the settlement channel for this order"
                                >
                                  <option value="auto">Auto (original channel)</option>
                                  <option value="mfs">MFS → Bank (gateway fee)</option>
                                  <option value="courier">Courier COD → Bank</option>
                                  <option value="rider">Rider cash → Vault</option>
                                  <option value="card">Card → Bank (card fee)</option>
                                  <option value="cash">Cash → Vault/Register</option>
                                  <option value="due">Clear Due (AR collection)</option>
                                </select>
                                <div className="flex items-center justify-center space-x-1.5 w-full">
                                  <button
                                    onClick={() => setInspectingOrder(order)}
                                    className="px-2 py-1 bg-[#FCF2E5]/40 hover:bg-[#FCF2E5]/40 text-gray-700 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 border border-gray-200"
                                    title="View order details and audit prescription before settlement"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-gray-600" />
                                    <span>Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleSettleOrder(order.id)}
                                    disabled={isProcessing || settlingOrderId === order.id}
                                    className="flex-1 px-2 py-1 bg-[#3FB98C] hover:bg-[#2D9F73] text-white shadow-sm rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 disabled:opacity-50"
                                    title="Instantly settle this individual transaction via the selected method"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{settlingOrderId === order.id ? 'Settling...' : 'Settle'}</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Details and Settlement Inspection Modal */}
      {inspectingOrder && (
        <OrderDetailsSettlementModal
          order={inspectingOrder}
          isOpen={true}
          onClose={() => setInspectingOrder(null)}
          onSettleOrder={async (orderId, bankId) => {
            await handleSettleOrder(orderId, bankId);
            setInspectingOrder(null);
          }}
          isProcessing={isProcessing || settlingOrderId === inspectingOrder.id}
          bankAccounts={bankAccounts}
        />
      )}
    </div>
  );
};
