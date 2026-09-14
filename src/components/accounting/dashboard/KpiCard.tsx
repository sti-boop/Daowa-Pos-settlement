'use client';

import { useRef, useCallback, useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import styles from './kpi-card.module.css';

export type KpiVariant =
  | 'income'
  | 'expenses'
  | 'receivables'
  | 'payables'
  | 'vouchers'
  | 'ledgers'
  | 'cash'
  | 'bank';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  variant: KpiVariant;
  onClick?: () => void;
}

const variantClass: Record<KpiVariant, string> = {
  income: styles.bgIncome,
  expenses: styles.bgExpenses,
  receivables: styles.bgReceivables,
  payables: styles.bgPayables,
  vouchers: styles.bgVouchers,
  ledgers: styles.bgLedgers,
  cash: styles.bgCash,
  bank: styles.bgBank,
};

function animateCounter(
  element: HTMLElement,
  target: number,
  prefix: string,
  duration: number
) {
  const startTime = performance.now();
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutProgress = 1 - Math.pow(1 - progress, 2);
    const current = Math.floor(target * easeOutProgress);
    element.textContent = prefix + current.toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = prefix + target.toLocaleString();
    }
  }
  requestAnimationFrame(update);
}

export function KpiCard({ title, value, subtitle, icon, variant, onClick }: KpiCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(value);

  const numericTarget = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
  const prefix = value.match(/^[^0-9-]*/)?.[0] ?? '';
  const isNumeric = !isNaN(numericTarget) && value !== '0' && numericTarget !== 0;

  useEffect(() => {
    if (!valueRef.current || !isNumeric) return;
    animateCounter(valueRef.current, numericTarget, prefix, 400);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (valueRef.current && isNumeric) {
      animateCounter(valueRef.current, numericTarget, prefix, 300);
    }
  }, [isNumeric, numericTarget, prefix]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${styles.kpiCard} ${variantClass[variant]}`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <div className={styles.iconBadge}>{icon}</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardValue} ref={valueRef}>{displayValue}</div>
        <div className={styles.cardSubtitle}>{subtitle}</div>
      </div>
    </div>
  );
}
