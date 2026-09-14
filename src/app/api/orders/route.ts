import { NextRequest, NextResponse } from 'next/server';
import { orders, isMfsMethod } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') || undefined;
  const status = searchParams.get('status') || undefined;

  let filtered = [...orders];

  if (channel) {
    if (channel === 'mfs') {
      filtered = filtered.filter((o) => isMfsMethod(o.paymentMethod));
    } else if (channel === 'courier') {
      filtered = filtered.filter((o) => o.deliveryType === 'third_party_courier');
    } else if (channel === 'rider') {
      filtered = filtered.filter((o) => o.deliveryType === 'own_rider');
    } else if (channel === 'card') {
      filtered = filtered.filter((o) => o.paymentMethod.startsWith('card_'));
    }
  }

  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  return NextResponse.json(filtered);
}
