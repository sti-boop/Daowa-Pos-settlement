import { NextResponse } from 'next/server';
import {
  accounts,
  orders,
  businessBankAccounts,
  settlementBatches,
  activeShift,
  isMfsMethod,
  updateActiveShiftExpectedCash,
} from '@/lib/store';

export async function GET() {
  updateActiveShiftExpectedCash();

  const pendingMfsOrders = orders.filter(
    (o) => isMfsMethod(o.paymentMethod) && o.status === 'delivered_pending_payout'
  );
  const pendingMfsTotal = pendingMfsOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCourierOrders = orders.filter(
    (o) => o.deliveryType === 'third_party_courier' && o.status === 'delivered_pending_payout'
  );
  const pendingCourierTotal = pendingCourierOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingRiderOrders = orders.filter(
    (o) => o.deliveryType === 'own_rider' && o.status === 'delivered_pending_payout'
  );
  const pendingRiderTotal = pendingRiderOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCardOrders = orders.filter(
    (o) => o.paymentMethod.startsWith('card_') && o.status === 'delivered_pending_payout'
  );
  const pendingCardTotal = pendingCardOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingReturns = orders.filter((o) => o.status === 'failed_pending_return');

  const totalBankLiquidity = businessBankAccounts.reduce(
    (sum, b) => sum + (b.isActive ? b.balance : 0),
    0
  );

  return NextResponse.json({
    bankBalance: totalBankLiquidity,
    bankAccounts: businessBankAccounts,
    defaultBankAccount:
      businessBankAccounts.find((b) => b.isDefault) || businessBankAccounts[0],
    vaultBalance: accounts['Main Cash/Vault A/c'].balance,
    posDrawerCash: accounts['POS Cash Holding A/c'].balance,
    activeShift,
    pendingAmounts: {
      mfs: pendingMfsTotal,
      courier: pendingCourierTotal,
      rider: pendingRiderTotal,
      card: pendingCardTotal,
    },
    counts: {
      pendingMfs: pendingMfsOrders.length,
      pendingCourier: pendingCourierOrders.length,
      pendingRider: pendingRiderOrders.length,
      pendingCard: pendingCardOrders.length,
      pendingReturns: pendingReturns.length,
    },
    accounts: Object.values(accounts),
    recentBatches: settlementBatches.slice(0, 5),
  });
}
