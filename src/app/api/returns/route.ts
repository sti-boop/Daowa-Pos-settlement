import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_REASONS = [
  'defective',
  'wrong_item',
  'expired',
  'customer_changed_mind',
  'other',
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const saleId = searchParams.get('saleId')

    const where = saleId ? { saleId } : {}
    const returns = await db.return.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: saleId ? 100 : 50,
    })

    return NextResponse.json(returns)
  } catch (error) {
    console.error('Failed to fetch returns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { saleId, items, reason } = body

    // Validate required top-level fields
    if (!saleId || !reason) {
      return NextResponse.json(
        { error: 'saleId and reason are required' },
        { status: 400 }
      )
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        {
          error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one return item is required' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.saleItemId || !item.productName || !item.quantity || !item.unitPrice || !item.refundAmount) {
        return NextResponse.json(
          { error: 'Each item must include saleItemId, productName, quantity, unitPrice, and refundAmount' },
          { status: 400 }
        )
      }
      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be greater than 0' },
          { status: 400 }
        )
      }
      if (item.refundAmount <= 0) {
        return NextResponse.json(
          { error: 'Refund amount must be greater than 0' },
          { status: 400 }
        )
      }
    }

    // Verify sale exists
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { saleItems: true },
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Verify all saleItemIds belong to this sale
    const saleItemIds = new Set(sale.saleItems.map((si) => si.id))
    for (const item of items) {
      if (!saleItemIds.has(item.saleItemId)) {
        return NextResponse.json(
          { error: `Sale item ${item.saleItemId} does not belong to this sale` },
          { status: 400 }
        )
      }
    }

    // Calculate total refund amount
    const totalRefund = items.reduce((sum, item) => sum + item.refundAmount, 0)

    // Prevent refunding more than the sale grand total
    const existingReturns = await db.return.findMany({
      where: { saleId },
    })
    const alreadyRefunded = existingReturns.reduce(
      (sum, r) => sum + r.refundAmount,
      0
    )
    const maxAllowed = sale.grandTotal - alreadyRefunded
    if (totalRefund > maxAllowed) {
      return NextResponse.json(
        {
          error: `Total refund (৳${totalRefund.toFixed(2)}) would exceed remaining refundable amount (৳${maxAllowed.toFixed(2)})`,
        },
        { status: 400 }
      )
    }

    // Execute in a transaction
    const returnRecords = await db.$transaction(async (tx) => {
      // Create all return records
      const created = await Promise.all(
        items.map((item) =>
          tx.return.create({
            data: {
              saleId,
              saleItemId: item.saleItemId,
              productId: item.productId || null,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              refundAmount: item.refundAmount,
              reason,
              status: 'processed',
            },
          })
        )
      )

      // Restore stock for returned items
      await Promise.all(
        items.map((item) => {
          if (item.productId) {
            return tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
          return Promise.resolve()
        })
      )

      // Update sale: subtract refund from grandTotal and adjust status
      const newGrandTotal = Math.max(
        0,
        Math.round((sale.grandTotal - totalRefund) * 100) / 100
      )

      const newStatus =
        newGrandTotal <= 0
          ? 'returned'
          : sale.status === 'returned'
            ? 'returned'
            : 'completed'

      await tx.sale.update({
        where: { id: saleId },
        data: {
          grandTotal: newGrandTotal,
          status: newStatus,
        },
      })

      return created
    })

    // Sync the return to the Accounting system (Credit Note + stock inward)
    try {
      const { syncPosReturnToAccounting } = await import('@/lib/accounting-sync')
      await syncPosReturnToAccounting(
        sale,
        items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          refundAmount: item.refundAmount,
        })),
        totalRefund,
        reason
      )
    } catch (accErr) {
      console.error('Accounting return sync failed (non-fatal):', accErr)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Return processed. Total refund: ৳${totalRefund.toFixed(2)}`,
        totalRefund: Math.round(totalRefund * 100) / 100,
        returns: returnRecords,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Failed to process return:', error)
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 })
  }
}
