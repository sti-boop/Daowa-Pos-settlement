import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    try {
      await db.holdOrder.delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return NextResponse.json({ error: 'Hold order not found' }, { status: 404 })
      }
      throw e
    }
  } catch (error) {
    console.error('Failed to delete hold order:', error)
    return NextResponse.json(
      { error: 'Failed to delete hold order' },
      { status: 500 },
    )
  }
}
