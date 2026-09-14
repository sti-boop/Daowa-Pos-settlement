import { db } from '@/lib/accounting-db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const groups = await db.stockGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json(groups);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock groups';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const group = await db.stockGroup.create({ data: body });
    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create stock group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.stockGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete stock group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}