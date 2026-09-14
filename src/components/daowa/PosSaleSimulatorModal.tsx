'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Pill,
  Check,
  Banknote,
  Smartphone,
  Truck,
  CreditCard,
  Bike,
  Sparkles,
  Store,
  User,
  Shuffle,
  SplitSquareHorizontal,
  Clock,
  Wallet,
  ArrowLeftRight,
  Gift,
  Globe,
} from 'lucide-react';
import { CourierName, SystemFeeSettings } from '@/lib/types';

interface PosSaleSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateSale: (data: any) => Promise<void>;
  isProcessing: boolean;
  fees?: SystemFeeSettings | null;
}

const PRESET_CUSTOMERS = [
  { name: 'Dr. Asaduzzaman (Cardiologist)', phone: '01711-889900', note: 'Hospital Senior Consultant' },
  { name: 'Begum Rokeya Sultana', phone: '01819-334455', note: 'Chronic Diabetic & BP Care' },
  { name: 'Prof. Dr. M. A. Jalil', phone: '01912-778899', note: 'Specialist Nephrology Clinic' },
  { name: 'Anisur Rahman', phone: '01678-445566', note: 'Monthly Prescription Refill' },
  { name: 'Dr. Fatima Nusrat', phone: '01552-112233', note: 'Pediatric Care Specialist' },
  { name: 'Mahbubul Alam (Evercare Link)', phone: '01733-556677', note: 'Corporate Clinic Account' },
  { name: 'Shamima Akter', phone: '01844-998877', note: 'Emergency Respiratory Patient' },
  { name: 'Tanvir Hasan', phone: '01955-667788', note: 'E-Commerce Online Repeat Buyer' },
  { name: 'Nusrat Jahan', phone: '01611-223344', note: 'Post-Op Surgical Recovery' },
  { name: 'Engr. Khorshed Alam', phone: '01799-332211', note: 'Senior Citizen Health Member' },
  { name: 'Dr. Tariqul Islam (Square Hospital)', phone: '01712-445588', note: 'Intensive Care Unit Patient Attendant' },
  { name: 'Selina Parvin', phone: '01822-667799', note: 'Maternity & Prenatal Vitamins' },
  { name: 'Mustafizur Rahman', phone: '01933-889911', note: 'Cardiac Stent Maintenance' },
  { name: 'Farzana Chowdhury', phone: '01644-001122', note: 'Pediatric Asthma Management' },
  { name: 'Kabir Ahmed (Labaid Attendant)', phone: '01511-998844', note: 'Oncology Chemotherapy Adjuncts' },
  { name: 'Ayesha Siddiqua', phone: '01788-554433', note: 'Orthopedic Joint & Calcium Therapy' },
  { name: 'Shahadat Hossain', phone: '01877-223344', note: 'Post-CABG Heart Therapy' },
  { name: 'Moniruzzaman Mia', phone: '01966-112233', note: 'Dialysis & Renal Nutrition Patient' },
  { name: 'Naznin Nahar', phone: '01633-778899', note: 'Endocrinology Thyroid Follow-up' },
  { name: 'Major (Retd.) Enamul Haque', phone: '01755-990011', note: 'Armed Forces Veteran Clinic Member' },
  { name: 'Tahmina Begum (United Hospital Link)', phone: '01855-334411', note: 'Post-Chemo Immunity Boosters' },
  { name: 'Advocate Rafiqul Islam', phone: '01722-661144', note: 'Chronic Hypertension & Eye Care' },
  { name: 'Zubaida Khanom', phone: '01944-882255', note: 'Geriatric Arthritis Care & Supplements' },
  { name: 'Dr. Mehedi Hasan (National Heart Foundation)', phone: '01622-990033', note: 'Cardiac Surgery Ward Coordinator' },
  { name: 'Farhan Tanvir', phone: '01533-441188', note: 'Online Prescription Re-order via App' },
  { name: 'Sultana Razia', phone: '01766-339922', note: 'Dermatology & Eczema Regimen' },
  { name: 'Al-Haj Shamsuddin Ahmed', phone: '01833-772299', note: 'Pensioner Lifetime Discount Cardholder' },
  { name: 'Nadia Sharmin (BIRDEM Regular)', phone: '01977-551100', note: 'Type-1 Insulin Dependent Patient' },
  { name: 'Kamrul Ahsan', phone: '01655-224488', note: 'Post-Covid Pulmonary Rehab' },
  { name: 'Sharmin Jahan Rupa', phone: '01522-886633', note: 'Maternal Care & Iron Infusion Adjuncts' },
  { name: 'Dr. Nazmul Huda (Apollo Dental)', phone: '01744-118855', note: 'Maxillofacial Antibiotics Supply' },
  { name: 'Delwar Hossain Master', phone: '01866-993311', note: 'Rural Community Health Liaison' },
  { name: 'Shirin Akhter', phone: '01988-220077', note: 'Neurology Migraine & Nerve Care' },
  { name: 'Barrister Imtiaz Mahmud', phone: '01688-553322', note: 'Executive Wellness & Vitamin IV Care' },
  { name: 'Nurjahan Begum', phone: '01733-114477', note: 'Osteoporosis Bone Density Regimen' },
];

const PRESET_MEDICINES = [
  { name: 'Napa Extra 500mg+65mg (Box of 200)', genericName: 'Paracetamol + Caffeine', unitPrice: 520 },
  { name: 'Sergel 20mg Capsule (Box of 140)', genericName: 'Esomeprazole', unitPrice: 1120 },
  { name: 'Ceevit 250mg Chewable (100 Tabs)', genericName: 'Ascorbic Acid (Vitamin C)', unitPrice: 210 },
  { name: 'Lantus Solostar Insulin 100 IU/ml', genericName: 'Insulin Glargine', unitPrice: 4250 },
  { name: 'Monas 10mg (Strip of 10)', genericName: 'Montelukast Sodium', unitPrice: 175 },
  { name: 'Neomark N95 Medical Masks (Pack of 20)', genericName: 'Surgical Respirator', unitPrice: 650 },
  { name: 'Betnovate-N Ointment 20g', genericName: 'Betamethasone + Neomycin', unitPrice: 135 },
  { name: 'Seclo 20mg Capsule (Strip of 10)', genericName: 'Omeprazole', unitPrice: 70 },
  { name: 'Maxpro 20mg Tablet (Box of 100)', genericName: 'Esomeprazole Magnesium', unitPrice: 800 },
  { name: 'Thyrox 50mcg (100 Tablets)', genericName: 'Levothyroxine Sodium', unitPrice: 280 },
];

// Type of payment: single method, or split between two methods
type PaymentMode = 'single' | 'split';

export const PosSaleSimulatorModal: React.FC<PosSaleSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulateSale,
  isProcessing,
  fees,
}) => {
  const [customerName, setCustomerName] = useState(PRESET_CUSTOMERS[0].name);
  const [customerPhone, setCustomerPhone] = useState(PRESET_CUSTOMERS[0].phone);
  const [deliveryType, setDeliveryType] = useState<'pos_counter' | 'own_rider' | 'third_party_courier'>('pos_counter');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  // Payment mode: single method, or split between two methods
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('single');
  // Split payment state
  const [splitMethod1, setSplitMethod1] = useState<string>('cash');
  const [splitMethod2, setSplitMethod2] = useState<string>('bkash');
  const [splitAmount1, setSplitAmount1] = useState<number>(0);
  const [splitAmount2, setSplitAmount2] = useState<number>(0);

  // Dynamic couriers & MFS
  const availableCouriers: CourierName[] = (fees?.couriers && fees.couriers.length > 0)
    ? fees.couriers.map(c => c.courierName)
    : ['Steadfast', 'Pathao', 'RedX', 'Carrybee'];

  const availableMFS = (fees?.mfs && fees.mfs.length > 0)
    ? fees.mfs.map(m => m.provider)
    : ['bKash', 'Nagad', 'Rocket', 'Upay'];

  const [courierName, setCourierName] = useState<CourierName>(availableCouriers[0] || 'Steadfast');
  const [riderName, setRiderName] = useState<string>('Rider Tareq');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [saleType, setSaleType] = useState<'online' | 'offline'>('offline');
  const [freeDelivery, setFreeDelivery] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState<string>('');

  const [selectedItems, setSelectedItems] = useState<Array<{
    name: string;
    genericName: string;
    quantity: number;
    unitPrice: number;
  }>>([
    { name: PRESET_MEDICINES[0].name, genericName: PRESET_MEDICINES[0].genericName, quantity: 1, unitPrice: PRESET_MEDICINES[0].unitPrice },
    { name: PRESET_MEDICINES[2].name, genericName: PRESET_MEDICINES[2].genericName, quantity: 2, unitPrice: PRESET_MEDICINES[2].unitPrice },
  ]);

  if (!isOpen) return null;

  const handleSelectPresetCustomer = (cust: typeof PRESET_CUSTOMERS[0]) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
  };

  const handleRandomCustomer = () => {
    const randomIdx = Math.floor(Math.random() * PRESET_CUSTOMERS.length);
    const cust = PRESET_CUSTOMERS[randomIdx];
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
  };

  const handleAddItem = (med: typeof PRESET_MEDICINES[0]) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.name === med.name);
      if (existing) {
        return prev.map(i => i.name === med.name ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { name: med.name, genericName: med.genericName, quantity: 1, unitPrice: med.unitPrice }];
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const productTotal = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  // Free delivery means the customer pays 0 delivery fee.
  const effectiveDeliveryFee = freeDelivery ? 0 : deliveryFee;
  const grandTotal = productTotal + effectiveDeliveryFee;

  // When split mode is active, ensure amounts sum to grandTotal
  const splitTotal = (splitAmount1 || 0) + (splitAmount2 || 0);
  const splitBalanced = splitTotal === grandTotal && splitAmount1 > 0 && splitAmount2 > 0 && splitMethod1 !== splitMethod2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    // Sale type is now fully decoupled from delivery type — the user picks
    // it explicitly via the Online/Offline selector. This allows offline
    // sales with rider/courier delivery, and online sales with POS pickup.
    const basePayload: any = {
      customerName,
      customerPhone,
      deliveryType,
      paymentMethod: paymentMode === 'split' ? splitMethod1 : paymentMethod,
      courierName: deliveryType === 'third_party_courier' ? courierName : undefined,
      riderName: deliveryType === 'own_rider' ? riderName : undefined,
      items: selectedItems,
      deliveryFee: freeDelivery ? 0 : deliveryFee,
      isDueSale: paymentMethod === 'due', // backward-compatible flag
      saleType, // explicit, decoupled from deliveryType
      freeDelivery,
      notes: orderNotes || (saleType === 'online' ? 'Online prescription delivery sale' : 'Walk-in OTC pharmacy counter sale'),
    };

    if (paymentMode === 'split' && splitBalanced) {
      basePayload.splitPayment = {
        method1: splitMethod1,
        method2: splitMethod2,
        amount1: splitAmount1,
        amount2: splitAmount2,
      };
    }

    await onSimulateSale(basePayload);
    onClose();
  };

  // Helper to render a single payment method button (used for both single + split method pickers)
  const renderPaymentMethodButton = (
    method: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
    onSelect: (m: string) => void,
    accent: string = 'emerald'
  ) => (
    <button
      key={method}
      type="button"
      onClick={() => onSelect(method)}
      className={`p-2 rounded-lg border text-xs flex items-center justify-center space-x-1.5 transition ${
        active
          ? `bg-${accent}-700 text-white font-bold border-${accent}-700 shadow-md`
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // All available payment method options for POS counter
  const allPosPaymentOptions: Array<{ method: string; label: string; icon: React.ReactNode }> = [
    { method: 'cash', label: 'Cash', icon: <Banknote className="w-3 h-3" /> },
    { method: 'due', label: 'Due / Credit', icon: <Clock className="w-3 h-3" /> },
    ...availableMFS.map((p) => ({ method: p.toLowerCase(), label: p, icon: <Smartphone className="w-3 h-3" /> })),
    { method: 'card_visa_master', label: 'Card (Visa/MC)', icon: <CreditCard className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="surface-paper rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-slate-200 my-2 sm:my-8 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Simulate POS & Healthcare Sale</h3>
              <p className="text-xs text-slate-500">Create test transactions to view instant clearing balance updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Simulated Customers Preset Bar */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-950 font-bold">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulated Patient & Customer Presets:</span>
              </div>
              <button
                type="button"
                onClick={handleRandomCustomer}
                className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-1 rounded-md border border-emerald-200 hover:border-emerald-300 shadow-2xs transition"
              >
                <Shuffle className="w-3 h-3" />
                <span>Random Customer</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_CUSTOMERS.map((cust) => (
                <button
                  key={cust.name}
                  type="button"
                  onClick={() => handleSelectPresetCustomer(cust)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                    customerName === cust.name
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                  title={`${cust.phone} • ${cust.note}`}
                >
                  <span>{cust.name.split(' (')[0]}</span>
                  <span className="text-[10px] opacity-70 ml-1">({cust.phone.slice(-4)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sale Classification — explicit, decoupled from delivery type */}
          <div>
            <label className="font-bold text-slate-700 block text-xs mb-1.5">
              Sale Classification (Online vs Offline)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSaleType('offline')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                  saleType === 'offline'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs">Offline In-Store</div>
                  <div className="text-[10px] text-slate-500 font-normal">Walk-in / phone order / local delivery</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSaleType('online')}
                className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                  saleType === 'online'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs">Online E-Commerce</div>
                  <div className="text-[10px] text-slate-500 font-normal">Web portal / app / telehealth</div>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Channel — decoupled from sale type; works with both online & offline */}
          <div>
            <label className="font-bold text-slate-700 block text-xs mb-1.5">
              Delivery Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('pos_counter');
                  setDeliveryFee(0);
                  setFreeDelivery(false);
                  if (paymentMethod === 'rider' || paymentMethod.startsWith('courier_')) {
                    setPaymentMethod('cash');
                  }
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  deliveryType === 'pos_counter'
                    ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs">Pharmacy Counter</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-normal">Walk-in pickup, Cash/Due/MFS/Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('own_rider');
                  setDeliveryFee(60);
                  setPaymentMethod('rider');
                  setPaymentMode('single');
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  deliveryType === 'own_rider'
                    ? 'border-amber-500 bg-amber-50/60 font-bold text-amber-950'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Bike className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs">Daowa Fleet Rider</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-normal">Own rider home delivery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('third_party_courier');
                  setDeliveryFee(70);
                  setPaymentMethod(`courier_${(availableCouriers[0] || 'steadfast').toLowerCase()}`);
                  setPaymentMode('single');
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  deliveryType === 'third_party_courier'
                    ? 'border-teal-500 bg-teal-50/60 font-bold text-teal-950'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Truck className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs">Courier (COD)</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-normal">Steadfast, Pathao & dynamic</span>
              </button>
            </div>
            {/* Active sale-type badge reflects the explicit choice */}
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-500">Current sale:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-white ${saleType === 'offline' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {saleType === 'offline' ? 'OFFLINE SALE' : 'ONLINE SALE'}
              </span>
            </div>
          </div>

          {/* Free Delivery toggle — only for rider / courier deliveries */}
          {deliveryType !== 'pos_counter' && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeDelivery}
                  onChange={(e) => {
                    setFreeDelivery(e.target.checked);
                    if (e.target.checked) setDeliveryFee(0);
                  }}
                  className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500"
                />
                <div className="flex items-center space-x-1.5 flex-1">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="text-xs font-bold text-purple-950">Free Delivery for Customer</div>
                    <div className="text-[10px] text-purple-800">
                      {deliveryType === 'third_party_courier'
                        ? 'Customer pays ৳0 delivery. The company absorbs the courier delivery charge (booked as Courier Expense).'
                        : 'Customer pays ৳0 delivery. No delivery fee revenue or expense recorded (own rider).'}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Payment Method / Specific Dispatcher */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            {deliveryType === 'pos_counter' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">Payment Method</label>
                  {/* Payment Mode Toggle: Single vs Split */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('single')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                        paymentMode === 'single' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <Wallet className="w-3 h-3" />
                      <span>Single</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('split');
                        // Initialize split amounts to 50/50 of current grandTotal
                        const half = Math.round(grandTotal / 2);
                        setSplitAmount1(half);
                        setSplitAmount2(grandTotal - half);
                        if (splitMethod1 === splitMethod2) {
                          setSplitMethod2(splitMethod1 === 'cash' ? 'bkash' : 'cash');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                        paymentMode === 'split' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      <SplitSquareHorizontal className="w-3 h-3" />
                      <span>Split (2 methods)</span>
                    </button>
                  </div>
                </div>

                {paymentMode === 'single' ? (
                  /* SINGLE PAYMENT METHOD — Cash, Due, MFS, Card as separate buttons */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Cash */}
                    {renderPaymentMethodButton('cash', 'Cash in Till', <Banknote className="w-3 h-3" />, paymentMethod === 'cash', setPaymentMethod, 'emerald')}

                    {/* Due / Credit — separate distinct payment method */}
                    {renderPaymentMethodButton('due', 'Due / Credit', <Clock className="w-3 h-3" />, paymentMethod === 'due', setPaymentMethod, 'rose')}

                    {/* MFS providers */}
                    {availableMFS.map((provider) =>
                      renderPaymentMethodButton(
                        provider.toLowerCase(),
                        provider,
                        <Smartphone className="w-3 h-3" />,
                        paymentMethod === provider.toLowerCase(),
                        setPaymentMethod,
                        'emerald'
                      )
                    )}

                    {/* Card */}
                    {renderPaymentMethodButton('card_visa_master', 'Card (Visa/MC)', <CreditCard className="w-3 h-3" />, paymentMethod === 'card_visa_master', setPaymentMethod, 'emerald')}
                  </div>
                ) : (
                  /* SPLIT PAYMENT — two methods with amounts */
                  <div className="space-y-3">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center space-x-2">
                      <SplitSquareHorizontal className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div className="text-[11px] text-purple-900">
                        <span className="font-bold">Split Payment Mode:</span> Customer pays part via one method, the rest via another. Both clearing accounts update automatically.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Method 1 */}
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-600 uppercase">
                          <ArrowLeftRight className="w-3 h-3 text-purple-600" />
                          <span>Payment Method 1</span>
                        </div>
                        <select
                          value={splitMethod1}
                          onChange={(e) => {
                            const m = e.target.value;
                            setSplitMethod1(m);
                            if (m === splitMethod2) {
                              // Auto-pick a different method2
                              const alt = allPosPaymentOptions.find((o) => o.method !== m);
                              if (alt) setSplitMethod2(alt.method);
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-purple-500"
                        >
                          {allPosPaymentOptions.map((opt) => (
                            <option key={opt.method} value={opt.method}>{opt.label}</option>
                          ))}
                        </select>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Amount (৳)</label>
                          <input
                            type="number"
                            min="0"
                            value={splitAmount1}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              setSplitAmount1(v);
                              // Auto-balance method2 to remaining
                              setSplitAmount2(Math.max(0, grandTotal - v));
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-900 text-sm focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      {/* Method 2 */}
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-600 uppercase">
                          <ArrowLeftRight className="w-3 h-3 text-purple-600" />
                          <span>Payment Method 2</span>
                        </div>
                        <select
                          value={splitMethod2}
                          onChange={(e) => {
                            const m = e.target.value;
                            setSplitMethod2(m);
                            if (m === splitMethod1) {
                              const alt = allPosPaymentOptions.find((o) => o.method !== m);
                              if (alt) setSplitMethod1(alt.method);
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-purple-500"
                        >
                          {allPosPaymentOptions.map((opt) => (
                            <option key={opt.method} value={opt.method}>{opt.label}</option>
                          ))}
                        </select>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Amount (৳)</label>
                          <input
                            type="number"
                            min="0"
                            value={splitAmount2}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              setSplitAmount2(v);
                              setSplitAmount1(Math.max(0, grandTotal - v));
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-900 text-sm focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Split summary / balance check */}
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      splitBalanced
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-[#EC5B38]/5 border-[#EC5B38]/20 text-rose-900'
                    }`}>
                      <span className="font-semibold">
                        {splitBalanced ? (
                          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Balanced</span>
                        ) : splitMethod1 === splitMethod2 ? (
                          <span>⚠ Pick two different methods</span>
                        ) : (
                          <span>⚠ Amounts (৳{splitTotal.toLocaleString()}) ≠ Total (৳{grandTotal.toLocaleString()})</span>
                        )}
                      </span>
                      <span className="font-bold">Split Total: ৳{splitTotal.toLocaleString()} / ৳{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Cash sale note (single cash mode only) */}
                {paymentMode === 'single' && paymentMethod === 'cash' && (
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    ✓ Full cash sales at POS counter are instantly marked as <strong>Completed</strong> and added to the register drawer.
                  </div>
                )}
                {paymentMode === 'single' && paymentMethod === 'due' && (
                  <div className="text-[10px] text-[#EC5B38] bg-[#EC5B38]/5 border border-[#EC5B38]/20 rounded-lg px-2.5 py-1.5">
                    ⏱ Due / credit sale: full amount booked to <strong>Customer Accounts Receivable</strong> (unpaid balance).
                  </div>
                )}
              </div>
            )}

            {deliveryType === 'own_rider' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Assigned Delivery Rider</label>
                <select
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Rider Tareq">Rider Tareq (Gulshan & Banani Zone)</option>
                  <option value="Rider Sumon">Rider Sumon (Dhanmondi & Mirpur Zone)</option>
                  <option value="Rider Farhan">Rider Farhan (Uttara Zone)</option>
                </select>
              </div>
            )}

            {deliveryType === 'third_party_courier' && (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Courier Partner</label>
                  <select
                    value={courierName}
                    onChange={(e) => {
                      const c = e.target.value as CourierName;
                      setCourierName(c);
                      setPaymentMethod(`courier_${c.toLowerCase()}`);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  >
                    {availableCouriers.map((c) => (
                      <option key={c} value={c}>{c} Courier</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Delivery Charge (৳) {freeDelivery && <span className="text-purple-600 font-normal">— Free (company pays)</span>}
                  </label>
                  <input
                    type="number"
                    value={freeDelivery ? 0 : deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    disabled={freeDelivery}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500 disabled:bg-purple-50 disabled:text-purple-700 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              {freeDelivery && (
                <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
                  Free delivery: customer pays ৳0. The courier&apos;s delivery charge (৳{fees?.couriers.find((c) => c.courierName === courierName)?.baseDeliveryFeeInside || 70}) is booked as a company <strong>Courier Expense</strong> automatically.
                </div>
              )}
              </>
            )}
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">Customer / Patient Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quick Medicine Preset Buttons */}
          <div>
            <span className="text-slate-600 block mb-1">Quick Add Prescribed Medicines:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MEDICINES.slice(0, 6).map(med => (
                <button
                  key={med.name}
                  type="button"
                  onClick={() => handleAddItem(med)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  <span>{med.name.split(' (')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items */}
          <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
            <span className="font-bold text-slate-700 block">Order Cart Items:</span>
            {selectedItems.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="text-[10px] text-slate-400">৳{item.unitPrice} each</div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                    className="w-14 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-bold text-xs"
                  />
                  <span className="font-bold text-slate-900 w-16 text-right">
                    ৳{(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2 flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-emerald-700 text-base">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || selectedItems.length === 0 || (paymentMode === 'split' && !splitBalanced)}
              className="px-5 py-2 btn-physical btn-key-emerald rounded-xl font-bold transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Approve & Place Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
