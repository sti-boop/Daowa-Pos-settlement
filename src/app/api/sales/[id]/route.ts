import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        saleItems: true,
        splitPayments: true,
        journalEntries: {
          orderBy: { createdAt: 'asc' },
        },
        settlementItems: {
          select: {
            id: true,
            saleAmount: true,
            serviceCharge: true,
            netAmount: true,
            status: true,
          },
        },
        deliveryPartner: {
          select: { id: true, name: true, code: true },
        },
      },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(sale)
  } catch (error) {
    console.error('Failed to fetch sale:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    )
  }
}
