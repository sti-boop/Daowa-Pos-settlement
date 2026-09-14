import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const history = searchParams.get('history') === 'true'

    if (history) {
      const closedShifts = await db.shift.findMany({
        where: { status: 'closed' },
        orderBy: { closedAt: 'desc' },
        take: 50,
      })
      return NextResponse.json(closedShifts)
    }

    const openShift = await db.shift.findFirst({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
    })

    return NextResponse.json(openShift ?? null)
  } catch (error) {
    console.error('Failed to fetch shift:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const existingOpen = await db.shift.findFirst({
      where: { status: 'open' },
    })

    if (existingOpen) {
      return NextResponse.json(
        { error: 'A shift is already open. Close it before opening a new one.' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { cashierName, openingCash, note } = body

    const shift = await db.shift.create({
      data: {
        cashierName: cashierName || 'Admin',
        openingCash: openingCash ?? 0,
        note: note || null,
        status: 'open',
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Failed to open shift:', error)
    return NextResponse.json(
      { error: 'Failed to open shift' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const openShift = await db.shift.findFirst({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
    })

    if (!openShift) {
      return NextResponse.json(
        { error: 'No open shift found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { closingCash, note } = body

    // Calculate today's completed sales since the shift opened
    const todaySales = await db.sale.findMany({
      where: {
        createdAt: { gte: openShift.openedAt },
        status: 'completed',
      },
    })

    const totalSales = todaySales.length
    const totalRevenue = Math.round(
      todaySales.reduce((sum, s) => sum + s.grandTotal, 0) * 100
    ) / 100

    const closedShift = await db.shift.update({
      where: { id: openShift.id },
      data: {
        closingCash: closingCash ?? 0,
        totalSales,
        totalRevenue,
        status: 'closed',
        closedAt: new Date(),
        note: note || openShift.note || null,
      },
    })

    return NextResponse.json(closedShift)
  } catch (error) {
    console.error('Failed to close shift:', error)
    return NextResponse.json(
      { error: 'Failed to close shift' },
      { status: 500 }
    )
  }
}
