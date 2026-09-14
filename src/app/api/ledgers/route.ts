import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function ledgerSnapshot(l: {
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: string;
  isActive?: boolean;
}) {
  return {
    name: l.name,
    groupName: l.groupName,
    openingBalance: l.openingBalance,
    balanceType: l.balanceType,
    isActive: l.isActive,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    const includeGroup = searchParams.get('includeGroup') === 'true';

    const where: Record<string, unknown> = { isActive: true };
    if (groupId) {
      where.groupName = groupId;
    }

    const ledgers = await db.ledger.findMany({
      where,
      include: { group: { select: { name: true, nature: true, subCategory: true } } },
      orderBy: { name: 'asc' },
    });

    // Calculate closing balance for each ledger
    const entries = await db.voucherEntry.findMany({
      select: { ledgerId: true, debit: true, credit: true },
    });
    const entryMap = new Map<string, { totalDebit: number; totalCredit: number }>();
    for (const e of entries) {
      const existing = entryMap.get(e.ledgerId) || { totalDebit: 0, totalCredit: 0 };
      existing.totalDebit += e.debit;
      existing.totalCredit += e.credit;
      entryMap.set(e.ledgerId, existing);
    }

    const ledgersWithClosing = ledgers.map(l => {
      const entry = entryMap.get(l.id) || { totalDebit: 0, totalCredit: 0 };
      const closing = l.balanceType === 'Dr'
        ? l.openingBalance + entry.totalDebit - entry.totalCredit
        : l.openingBalance + entry.totalCredit - entry.totalDebit;
      const closingType = closing >= 0
        ? l.balanceType
        : (l.balanceType === 'Dr' ? 'Cr' : 'Dr');
      return { ...l, closingBalance: Math.abs(closing), closingType };
    });

    return NextResponse.json(ledgersWithClosing);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ledgers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ledger = await db.ledger.create({ data: body });
    await auditLog({
      action: 'CREATE',
      entityType: 'Ledger',
      entityId: ledger.id,
      entityName: ledger.name,
      description: `Ledger "${ledger.name}" created under ${ledger.groupName}`,
      after: ledgerSnapshot(ledger),
    });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create ledger';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const existing = await db.ledger.findUnique({ where: { id } });
    const ledger = await db.ledger.update({ where: { id }, data });
    await auditLog({
      action: 'UPDATE',
      entityType: 'Ledger',
      entityId: id,
      entityName: ledger.name,
      description: `Ledger "${ledger.name}" updated`,
      before: existing ? ledgerSnapshot(existing) : null,
      after: ledgerSnapshot(ledger),
    });
    return NextResponse.json(ledger);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update ledger';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const existing = await db.ledger.findUnique({ where: { id } });
    await db.ledger.update({ where: { id }, data: { isActive: false } });
    if (existing) {
      await auditLog({
        action: 'DELETE',
        entityType: 'Ledger',
        entityId: id,
        entityName: existing.name,
        description: `Ledger "${existing.name}" deactivated`,
        before: ledgerSnapshot(existing),
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete ledger';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}