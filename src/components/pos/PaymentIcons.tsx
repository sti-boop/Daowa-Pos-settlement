'use client';

import * as React from 'react';

/**
 * Payment method icons.
 * - bKash, Nagad, Rocket: real brand logo images
 * - Cash, Card, Due, Split: lucide-style inline SVG icons
 *
 * All icons accept a className and inherit color via currentColor where appropriate.
 */

export interface IconProps {
  className?: string;
}

/* ---------------- bKash ---------------- */
export function BkashIcon({ className }: IconProps) {
  return (
    <img src="/payment-icons/bkash.jpg" alt="bKash" className={`object-contain ${className || ''}`} />
  );
}

/* ---------------- Nagad ---------------- */
export function NagadIcon({ className }: IconProps) {
  return (
    <img src="/payment-icons/nagad.png" alt="Nagad" className={`object-contain ${className || ''}`} />
  );
}

/* ---------------- Rocket ---------------- */
export function RocketIcon({ className }: IconProps) {
  return (
    <img src="/payment-icons/rocket.png" alt="Rocket" className={`object-contain ${className || ''}`} />
  );
}

/* ---------------- Cash ---------------- */
// Stack of banknotes (paper money)
export function CashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 6v12M18 6v12" />
    </svg>
  );
}

/* ---------------- Card ---------------- */
// Credit/debit card
export function CardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

/* ---------------- Due ---------------- */
// Clock with an exclamation — represents "owed/pending"
export function DueIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M19 4l1.5 1.5M21 4h-3" />
    </svg>
  );
}

/* ---------------- Split ---------------- */
// Two arrows splitting — represents split payment
export function SplitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H10a6 6 0 0 0-6 6v4" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h10a6 6 0 0 0 6-6V7" />
    </svg>
  );
}

/* ---------------- Master Lookup ---------------- */
export interface PaymentIconConfig {
  label: string;
  Icon: React.ComponentType<IconProps>;
  /** Tailwind classes for the icon container background */
  containerClass: string;
  /** Tailwind classes for the icon */
  iconClass: string;
  /** Whether this icon uses a real image (not SVG) */
  isImage?: boolean;
}

/* ---------------- COD (Cash on Delivery) ---------------- */
// Hand holding cash — delivery payment
export function CodIcon({ className }: IconProps) {
  return (
    <svg className={className || ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />
      <path d="M3 10l2-5h9l2 5" />
      <path d="M7 14h2" />
      <path d="M21 16l-2-1V9a2 2 0 0 1 2 2v5z" />
      <circle cx="18" cy="13" r="1" />
    </svg>
  );
}

export const PAYMENT_ICON_CONFIG: Record<string, PaymentIconConfig> = {
  cash: {
    label: 'Cash',
    Icon: CashIcon,
    containerClass: 'bg-[#2D9F73]/15',
    iconClass: 'h-4 w-4 text-[#2D9F73]',
  },
  bkash: {
    label: 'bKash',
    Icon: BkashIcon,
    containerClass: 'bg-pink-50',
    iconClass: 'h-6 w-auto',
    isImage: true,
  },
  nagad: {
    label: 'Nagad',
    Icon: NagadIcon,
    containerClass: 'bg-orange-50',
    iconClass: 'h-6 w-auto',
    isImage: true,
  },
  rocket: {
    label: 'Rocket',
    Icon: RocketIcon,
    containerClass: 'bg-purple-50',
    iconClass: 'h-6 w-auto',
    isImage: true,
  },
  card: {
    label: 'Card',
    Icon: CardIcon,
    containerClass: 'bg-sky-50',
    iconClass: 'h-4 w-4 text-sky-600',
  },
  due: {
    label: 'Due',
    Icon: DueIcon,
    containerClass: 'bg-amber-50',
    iconClass: 'h-4 w-4 text-amber-600',
  },
  split: {
    label: 'Split',
    Icon: SplitIcon,
    containerClass: 'bg-[#3FB98C]/15',
    iconClass: 'h-4 w-4 text-[#2D7A65]',
  },
  cod: {
    label: 'COD',
    Icon: CodIcon,
    containerClass: 'bg-amber-50',
    iconClass: 'h-4 w-4 text-amber-600',
  },
};
