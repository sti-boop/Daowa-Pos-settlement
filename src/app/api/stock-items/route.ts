import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function stockItemSnapshot(s: {
  name: string;
  groupName: string;
  openingQty: number;
  openingRate: number;
  minStockLevel: number;
  unit: string;
  isActive?: boolean;
}) {
  return {
    name: s.name,
    groupName: s.groupName,
    openingQty: s.openingQty,
    openingRate: s.openingRate,
    minStockLevel: s.minStockLevel,
    unit: s.unit,
    isActive: s.isActive,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const includeTransactions = searchParams.get('transactions') === 'true';

    const where: Record<string, unknown> = { isActive: true };
    if (groupId) {
      where.groupName = groupId;
    }

    const items = await db.stockItem.findMany({
      where,
      include: {
        group: true,
        ...(includeTransactions ? { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await db.stockItem.create({ data: body });
    await auditLog({
      action: 'CREATE',
      entityType: 'StockItem',
      entityId: item.id,
      entityName: item.name,
      description: `Stock item "${item.name}" created in ${item.groupName} (${item.openingQty} ${item.unit})`,
      after: stockItemSnapshot(item),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create stock item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const existing = await db.stockItem.findUnique({ where: { id } });
    const item = await db.stockItem.update({ where: { id }, data });
    await auditLog({
      action: 'UPDATE',
      entityType: 'StockItem',
      entityId: id,
      entityName: item.name,
      description: `Stock item "${item.name}" updated`,
      before: existing ? stockItemSnapshot(existing) : null,
      after: stockItemSnapshot(item),
    });
    return NextResponse.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update stock item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const existing = await db.stockItem.findUnique({ where: { id } });
    await db.stockItem.update({ where: { id }, data: { isActive: false } });
    if (existing) {
      await auditLog({
        action: 'DELETE',
        entityType: 'StockItem',
        entityId: id,
        entityName: existing.name,
        description: `Stock item "${existing.name}" deactivated`,
        before: stockItemSnapshot(existing),
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete stock item';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}