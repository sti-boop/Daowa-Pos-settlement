import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      loyaltyPoints: customer.loyaltyPoints,
      totalEarned: customer.loyaltyPoints,
      availablePoints: customer.loyaltyPoints,
    })
  } catch (error) {
    console.error('Failed to fetch loyalty info:', error)
    return NextResponse.json({ error: 'Failed to fetch loyalty info' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { customerId, pointsToRedeem } = await req.json()

    if (!customerId || !pointsToRedeem) {
      return NextResponse.json(
        { error: 'customerId and pointsToRedeem are required' },
        { status: 400 }
      )
    }

    if (typeof pointsToRedeem !== 'number' || pointsToRedeem <= 0) {
      return NextResponse.json(
        { error: 'pointsToRedeem must be a positive number' },
        { status: 400 }
      )
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (customer.loyaltyPoints < pointsToRedeem) {
      return NextResponse.json(
        { error: `Insufficient points. Customer has ${customer.loyaltyPoints} points.` },
        { status: 400 }
      )
    }

    const updated = await db.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { decrement: pointsToRedeem } },
      select: { loyaltyPoints: true },
    })

    return NextResponse.json({
      success: true,
      discountValue: pointsToRedeem,
      remainingPoints: updated.loyaltyPoints,
    })
  } catch (error) {
    console.error('Failed to redeem loyalty points:', error)
    return NextResponse.json({ error: 'Failed to redeem loyalty points' }, { status: 500 })
  }
}
