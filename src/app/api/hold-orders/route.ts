import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const orders = await db.holdOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error: unknown) {
    console.error('Failed to fetch hold orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hold orders' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, items, discountType, discountValue, deliveryCharge, note } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 },
      );
    }

    const holdOrder = await db.holdOrder.create({
      data: {
        customerName: customerName || 'Walk-in',
        customerPhone: customerPhone || null,
        itemsJson: JSON.stringify(items),
        discountType: discountType || 'percentage',
        discountValue: discountValue || 0,
        deliveryCharge: deliveryCharge || 0,
        note: note || null,
      },
    });

    return NextResponse.json(holdOrder, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create hold order:', error);
    return NextResponse.json(
      { error: 'Failed to create hold order' },
      { status: 500 },
    );
  }
}
