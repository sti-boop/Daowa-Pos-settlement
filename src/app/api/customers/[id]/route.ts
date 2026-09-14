import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [sales, customer] = await Promise.all([
      db.sale.findMany({
        where: { customerId: id, status: 'completed' },
        include: {
          saleItems: {
            select: {
              productName: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              subtotal: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.customer.findUnique({
        where: { id },
        select: { loyaltyPoints: true },
      }),
    ]);

    const dueBalance = sales.reduce(
      (sum, s) => sum + (s.dueAmount > 0 ? s.dueAmount : 0),
      0
    );

    const orders = sales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      date: s.createdAt.toISOString(),
      subtotal: s.subtotal,
      totalDiscount: s.totalDiscount,
      deliveryCharge: s.deliveryCharge,
      grandTotal: s.grandTotal,
      paymentMethod: s.paymentMethod,
      receivedAmount: s.receivedAmount,
      changeAmount: s.changeAmount,
      dueAmount: s.dueAmount,
      status: s.status,
      items: s.saleItems.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
    }));

    return NextResponse.json({
      dueBalance: Math.round(dueBalance * 100) / 100,
      loyaltyPoints: customer?.loyaltyPoints ?? 0,
      totalOrders: sales.length,
      orders,
    });
  } catch (error) {
    console.error('Customer detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}
