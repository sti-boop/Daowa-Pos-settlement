// Double-Entry Accounting Transaction Processor

import { db } from '@/lib/db';

export type EntryType = 'DEBIT' | 'CREDIT';

export interface JournalLine {
  accountType: string;
  entryType: EntryType;
  amount: number;
  description: string;
  clearingId?: string;
}

export const ACCOUNTS = {
  CASH_IN_HAND: 'cash_in_hand',
  SALES_REVENUE: 'sales_revenue',
  SERVICE_CHARGE_EXPENSE: 'service_charge_expense',
  DELIVERY_INCOME: 'delivery_income',
  DUE_RECEIVABLE: 'due_receivable',
  BANK: 'bank',
  ROUNDING_INCOME: 'rounding_income',
  ROUNDING_EXPENSE: 'rounding_expense',
} as const;

function generateAccountCode(providerCode: string): string {
  return `clr_${providerCode}`;
}

function computeChargePaisa(
  amountTaka: number,
  chargePct: number,
  minChargeTaka: number
): number {
  const pctPaisa = Math.round(amountTaka * chargePct);
  const minPaisa = Math.round(minChargeTaka * 100);
  return Math.max(minPaisa, pctPaisa);
}

const toTaka = (paisa: number) => Math.abs(Math.round(paisa)) / 100;

export function processSaleJournal(
  saleData: {
    subtotal: number;
    deliveryCharge: number;
    grandTotal: number;
    totalDiscount: number;
    paymentMethod: string;
    receivedAmount: number;
    splitPayments?: { method: string; amount: number }[];
    isDelivery: boolean;
    deliveryPartnerCode?: string;
  },
  providerConfigs: {
    code: string;
    name?: string;
    type: string;
    serviceCharge: number;
    minCharge: number;
    clearingAccountId?: string;
  }[]
): JournalLine[] {
  const lines: JournalLine[] = [];
  const grandTotalP = Math.round(saleData.grandTotal * 100);
  const productRevenueP = Math.round((saleData.subtotal - (saleData.totalDiscount || 0)) * 100);
  const deliveryIncomeP = Math.round(saleData.deliveryCharge * 100);

  const pushRounding = (debitP: number, creditP: number) => {
    const roundingP = debitP - creditP;
    if (roundingP !== 0) {
      if (roundingP > 0) {
        // Customer paid more (round up) → rounding income (Credit)
        lines.push({
          accountType: ACCOUNTS.ROUNDING_INCOME,
          entryType: 'CREDIT',
          amount: toTaka(roundingP),
          description: 'Rounding income — customer paid extra',
        });
      } else {
        // Customer paid less (round down) → rounding expense (Debit)
        lines.push({
          accountType: ACCOUNTS.ROUNDING_EXPENSE,
          entryType: 'DEBIT',
          amount: toTaka(-roundingP),
          description: 'Rounding expense — customer paid less',
        });
      }
    }
  };

  // CASH
  if (saleData.paymentMethod === 'cash') {
    lines.push({ accountType: ACCOUNTS.CASH_IN_HAND, entryType: 'DEBIT', amount: toTaka(grandTotalP), description: 'Cash received — Invoice' });
    lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: 'Product sales revenue' });
    if (deliveryIncomeP > 0) lines.push({ accountType: ACCOUNTS.DELIVERY_INCOME, entryType: 'CREDIT', amount: toTaka(deliveryIncomeP), description: 'Delivery charge collected' });
    pushRounding(grandTotalP, productRevenueP + deliveryIncomeP);
    return lines;
  }

  // DUE
  if (saleData.paymentMethod === 'due') {
    lines.push({ accountType: ACCOUNTS.DUE_RECEIVABLE, entryType: 'DEBIT', amount: toTaka(grandTotalP), description: 'Due receivable — Invoice' });
    lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: 'Product sales revenue (on credit)' });
    if (deliveryIncomeP > 0) lines.push({ accountType: ACCOUNTS.DELIVERY_INCOME, entryType: 'CREDIT', amount: toTaka(deliveryIncomeP), description: 'Delivery charge collected' });
    pushRounding(grandTotalP, productRevenueP + deliveryIncomeP);
    return lines;
  }

  // SPLIT
  if (saleData.paymentMethod === 'split' && saleData.splitPayments) {
    let totalDebitP = 0;
    for (const sp of saleData.splitPayments) {
      const provider = providerConfigs.find((p) => p.code === sp.method);
      const spP = Math.round(sp.amount * 100);
      if (sp.method === 'cash') {
        lines.push({ accountType: ACCOUNTS.CASH_IN_HAND, entryType: 'DEBIT', amount: toTaka(spP), description: `Split payment — Cash ৳${sp.amount}` });
        totalDebitP += spP;
      } else if (provider && provider.type !== 'cash') {
        const feeP = computeChargePaisa(sp.amount, provider.serviceCharge, provider.minCharge);
        const netP = spP - feeP;
        if (provider.clearingAccountId) lines.push({ accountType: generateAccountCode(provider.code), entryType: 'DEBIT', amount: toTaka(netP), description: `Split payment — ${provider.name} clearing (net of ${provider.serviceCharge}% fee)`, clearingId: provider.clearingAccountId });
        if (feeP > 0) lines.push({ accountType: ACCOUNTS.SERVICE_CHARGE_EXPENSE, entryType: 'DEBIT', amount: toTaka(feeP), description: `${provider.name} service charge (${provider.serviceCharge}% on ৳${sp.amount})` });
        totalDebitP += spP;
      } else {
        lines.push({ accountType: ACCOUNTS.CASH_IN_HAND, entryType: 'DEBIT', amount: toTaka(spP), description: `Split payment — ${sp.method} ৳${sp.amount}` });
        totalDebitP += spP;
      }
    }
    lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: 'Product sales revenue (split payment)' });
    if (deliveryIncomeP > 0) lines.push({ accountType: ACCOUNTS.DELIVERY_INCOME, entryType: 'CREDIT', amount: toTaka(deliveryIncomeP), description: 'Delivery charge collected' });
    pushRounding(grandTotalP, productRevenueP + deliveryIncomeP);
    return lines;
  }

  // MFS / CARD
  const provider = providerConfigs.find((p) => p.code === saleData.paymentMethod);
  if (provider && (provider.type === 'mfs' || provider.type === 'card')) {
    const feeP = computeChargePaisa(saleData.grandTotal, provider.serviceCharge, provider.minCharge);
    const netToClearingP = grandTotalP - feeP;
    if (provider.clearingAccountId) lines.push({ accountType: generateAccountCode(provider.code), entryType: 'DEBIT', amount: toTaka(netToClearingP), description: `${provider.name} payment — clearing (net of ${provider.serviceCharge}% fee on ৳${saleData.grandTotal})`, clearingId: provider.clearingAccountId });
    if (feeP > 0) lines.push({ accountType: ACCOUNTS.SERVICE_CHARGE_EXPENSE, entryType: 'DEBIT', amount: toTaka(feeP), description: `${provider.name} service charge (${provider.serviceCharge}% on ৳${saleData.grandTotal})` });
    lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: `Product sales revenue (${provider.name})` });
    if (deliveryIncomeP > 0) lines.push({ accountType: ACCOUNTS.DELIVERY_INCOME, entryType: 'CREDIT', amount: toTaka(deliveryIncomeP), description: 'Delivery charge collected' });
    pushRounding(grandTotalP, productRevenueP + deliveryIncomeP);
    return lines;
  }

  // DELIVERY COD
  const deliveryProvider = saleData.isDelivery ? providerConfigs.find((p) => p.code === saleData.deliveryPartnerCode) : null;
  if (deliveryProvider) {
    const feeP = computeChargePaisa(toTaka(productRevenueP), deliveryProvider.serviceCharge, deliveryProvider.minCharge);
    const netToClearingP = grandTotalP - feeP;
    if (deliveryProvider.clearingAccountId) lines.push({ accountType: generateAccountCode(deliveryProvider.code), entryType: 'DEBIT', amount: toTaka(netToClearingP), description: `COD collected — ${deliveryProvider.name} clearing (net after ${deliveryProvider.serviceCharge}% fee)`, clearingId: deliveryProvider.clearingAccountId });
    if (feeP > 0) lines.push({ accountType: ACCOUNTS.SERVICE_CHARGE_EXPENSE, entryType: 'DEBIT', amount: toTaka(feeP), description: `${deliveryProvider.name} COD fee (${deliveryProvider.serviceCharge}% on product ৳${toTaka(productRevenueP)})` });
    lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: `Product sales revenue (COD — ${deliveryProvider.name})` });
    if (deliveryIncomeP > 0) lines.push({ accountType: ACCOUNTS.DELIVERY_INCOME, entryType: 'CREDIT', amount: toTaka(deliveryIncomeP), description: `Delivery fee income (${deliveryProvider.name})` });
    const debitP = netToClearingP + feeP;
    const creditP = productRevenueP + deliveryIncomeP;
    pushRounding(debitP, creditP);
    return lines;
  }

  // FALLBACK: treat as cash
  lines.push({ accountType: ACCOUNTS.CASH_IN_HAND, entryType: 'DEBIT', amount: toTaka(grandTotalP), description: `Payment received (${saleData.paymentMethod})` });
  lines.push({ accountType: ACCOUNTS.SALES_REVENUE, entryType: 'CREDIT', amount: toTaka(productRevenueP), description: 'Product sales revenue' });
  pushRounding(grandTotalP, productRevenueP);
  return lines;
}

export async function reconcileSettlement(
  clearingAccountId: string,
  receivedAmount: number,
  settledSaleIds: string[],
  reference?: string,
  note?: string
) {
  return await db.$transaction(async (tx) => {
    const clearing = await tx.clearingAccount.findUnique({
      where: { id: clearingAccountId },
      include: { providerConfig: true, settlements: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!clearing) throw new Error('Clearing account not found');

    const sales = await tx.sale.findMany({
      where: { id: { in: settledSaleIds }, clearingStatus: { in: ['PENDING_SETTLEMENT', 'PARTIALLY_SETTLED'] } },
      include: { saleItems: true },
    });
    if (sales.length === 0) throw new Error('No eligible sales found for settlement');

    const provider = clearing.providerConfig;
    const chargePct = provider.serviceCharge;
    const minCharge = provider.minCharge;

    let totalSettled = 0;
    const settlementItems: { saleId: string; saleAmount: number; serviceCharge: number; netAmount: number; status: string }[] = [];

    for (const sale of sales) {
      const productRevenue = Math.round((sale.subtotal - (sale.totalDiscount || 0)) * 100) / 100;
      const fee = Math.max(minCharge, (productRevenue * chargePct) / 100);
      const netAmount = sale.grandTotal - fee;
      settlementItems.push({ saleId: sale.id, saleAmount: sale.grandTotal, serviceCharge: Math.round(fee * 100) / 100, netAmount: Math.round(netAmount * 100) / 100, status: 'SETTLED' });
      totalSettled += netAmount;
      await tx.sale.update({ where: { id: sale.id }, data: { clearingStatus: 'SETTLED' } });
    }

    const settlement = await tx.settlement.create({
      data: {
        clearingAccountId,
        providerConfigId: provider.id,
        amount: Math.round(receivedAmount * 100) / 100,
        status: receivedAmount >= totalSettled ? 'COMPLETED' : 'PARTIAL',
        reference,
        note,
        items: { create: settlementItems },
        journalEntries: {
          create: [
            { accountType: ACCOUNTS.BANK, entryType: 'DEBIT', amount: Math.round(receivedAmount * 100) / 100, description: `Settlement received from ${provider.name} — Ref: ${reference || 'N/A'}` },
            { accountType: generateAccountCode(provider.code), entryType: 'CREDIT', amount: Math.round(receivedAmount * 100) / 100, description: `Clearing account debited — ${provider.name} settlement`, clearingId: clearingAccountId },
          ],
        },
      },
      include: { items: true, journalEntries: true },
    });

    await tx.clearingAccount.update({
      where: { id: clearingAccountId },
      data: { settledBalance: { increment: receivedAmount }, pendingBalance: { decrement: Math.min(receivedAmount, clearing.pendingBalance) } },
    });

    return settlement;
  }, { timeout: 30000 });
}

export function validateJournalBalance(lines: JournalLine[]): {
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
} {
  const totalDebits = lines.filter((l) => l.entryType === 'DEBIT').reduce((sum, l) => sum + l.amount, 0);
  const totalCredits = lines.filter((l) => l.entryType === 'CREDIT').reduce((sum, l) => sum + l.amount, 0);
  return {
    balanced: Math.abs(totalDebits - totalCredits) < 0.02,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
  };
}
