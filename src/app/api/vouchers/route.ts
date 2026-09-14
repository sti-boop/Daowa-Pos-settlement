import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const ledgerId = searchParams.get('ledgerId');

    const where: Record<string, unknown> = {};
    if (type) {
      const vt = await db.voucherType.findUnique({ where: { name: type } });
      if (vt) where.voucherTypeId = vt.id;
    }
    if (from && to) {
      where.date = { gte: from, lte: to };
    }
    if (ledgerId) {
      where.entries = { some: { ledgerId } };
    }

    const vouchers = await db.voucher.findMany({
      where,
      include: {
        voucherType: true,
        entries: { include: { ledger: { select: { name: true, groupName: true } } } },
        stockEntries: true,
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(vouchers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch vouchers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voucherTypeName, entries, stockEntries, ...voucherData } = body;

    // Validate entries before anything else
    if (!Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json({ error: 'At least 2 entries required' }, { status: 400 });
    }
    const totalDebit = entries.reduce((sum: number, e: { debit: number }) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: { credit: number }) => sum + (e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Entries must balance (Debit = Credit)' }, { status: 400 });
    }
    if (entries.some((e: { ledgerId: string }) => !e.ledgerId)) {
      return NextResponse.json({ error: 'Every entry needs a ledger' }, { status: 400 });
    }

    // Get or find voucher type
    let vt = await db.voucherType.findUnique({ where: { name: voucherTypeName } });
    if (!vt) {
      vt = await db.voucherType.create({ data: { name: voucherTypeName, prefix: voucherTypeName.substring(0, 2) } });
    }

    // Generate sequential voucher number if not provided
    let voucherNumber = voucherData.voucherNumber;
    if (!voucherNumber) {
      const prefix = vt.prefix || 'V';
      voucherNumber = await nextVoucherNumber(prefix);
    }

    const totalAmount = entries.reduce((sum: number, e: { debit: number; credit: number }) => sum + (e.debit || 0), 0);

    const voucher = await db.voucher.create({
      data: {
        ...voucherData,
        voucherNumber,
        voucherTypeId: vt.id,
        totalAmount,
        entries: {
          create: entries.map((e: { ledgerId: string; ledgerName: string; debit: number; credit: number; taxRate: number; taxAmount: number }) => ({
            ledgerId: e.ledgerId,
            ledgerName: e.ledgerName,
            debit: e.debit || 0,
            credit: e.credit || 0,
            taxRate: e.taxRate || 0,
            taxAmount: e.taxAmount || 0,
          })),
        },
        stockEntries: stockEntries ? {
          create: stockEntries.map((s: { stockItemId: string; itemName: string; quantity: number; rate: number; value: number; type: string; batchNo?: string; expiryDate?: string; godown?: string }) => ({
            stockItemId: s.stockItemId,
            itemName: s.itemName,
            quantity: s.quantity,
            rate: s.rate,
            value: s.value,
            type: s.type,
            batchNo: s.batchNo || null,
            expiryDate: s.expiryDate || null,
            godown: s.godown || null,
          })),
        } : undefined,
      },
      include: {
        voucherType: true,
        entries: true,
        stockEntries: true,
      },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityName: voucher.voucherNumber,
      description: `${vt.name} voucher ${voucher.voucherNumber} created (BDT ${voucher.totalAmount.toFixed(2)})`,
      after: voucherSnapshot(voucher),
    });

    return NextResponse.json(voucher, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create voucher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper: slim voucher snapshot for audit (avoid bulky nested data)
function voucherSnapshot(v: {
  voucherNumber: string;
  date: string;
  narration?: string | null;
  totalAmount: number;
  voucherType?: { name: string } | null;
  entries?: { ledgerName: string; debit: number; credit: number }[];
}) {
  return {
    voucherNumber: v.voucherNumber,
    date: v.date,
    narration: v.narration,
    totalAmount: v.totalAmount,
    type: v.voucherType?.name,
    entries: v.entries?.map(e => ({ ledger: e.ledgerName, debit: e.debit, credit: e.credit })) ?? [],
  };
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, entries, stockEntries, ...voucherData } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    if (!Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json({ error: 'At least 2 entries required' }, { status: 400 });
    }

    // Validate entries balance
    const totalDebit = entries.reduce((sum: number, e: { debit: number }) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: { credit: number }) => sum + (e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Entries must balance (Debit = Credit)' }, { status: 400 });
    }

    // Validate stock entries when provided
    if (stockEntries !== undefined && !Array.isArray(stockEntries)) {
      return NextResponse.json({ error: 'stockEntries must be an array' }, { status: 400 });
    }

    // Verify voucher exists (with entries + type for audit snapshot)
    const existing = await db.voucher.findUnique({
      where: { id },
      include: { voucherType: true, entries: true, stockEntries: true },
    });
    if (!existing) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    const totalAmount = entries.reduce((sum: number, e: { debit: number }) => sum + (e.debit || 0), 0);

    // Replace accounting entries atomically
    await db.voucherEntry.deleteMany({ where: { voucherId: id } });

    // Replace stock entries too (when provided — undefined keeps existing lines)
    if (stockEntries) {
      await db.stockTransaction.deleteMany({ where: { voucherId: id } });
    }

    const voucher = await db.voucher.update({
      where: { id },
      data: {
        voucherNumber: voucherData.voucherNumber ?? existing.voucherNumber,
        date: voucherData.date ?? existing.date,
        narration: voucherData.narration ?? null,
        totalAmount,
        entries: {
          create: entries.map((e: { ledgerId: string; ledgerName: string; debit: number; credit: number; taxRate: number; taxAmount: number }) => ({
            ledgerId: e.ledgerId,
            ledgerName: e.ledgerName,
            debit: e.debit || 0,
            credit: e.credit || 0,
            taxRate: e.taxRate || 0,
            taxAmount: e.taxAmount || 0,
          })),
        },
        stockEntries: stockEntries ? {
          create: stockEntries.map((s: { stockItemId: string; itemName: string; quantity: number; rate: number; value: number; type: string; batchNo?: string; expiryDate?: string; godown?: string }) => ({
            stockItemId: s.stockItemId,
            itemName: s.itemName,
            quantity: s.quantity,
            rate: s.rate,
            value: s.value,
            type: s.type,
            batchNo: s.batchNo || null,
            expiryDate: s.expiryDate || null,
            godown: s.godown || null,
          })),
        } : undefined,
      },
      include: {
        voucherType: true,
        entries: true,
        stockEntries: true,
      },
    });

    await auditLog({
      action: 'UPDATE',
      entityType: 'Voucher',
      entityId: id,
      entityName: voucher.voucherNumber,
      description: `${voucher.voucherType.name} voucher ${voucher.voucherNumber} updated (BDT ${voucher.totalAmount.toFixed(2)})`,
      before: voucherSnapshot(existing),
      after: voucherSnapshot(voucher),
    });

    return NextResponse.json(voucher);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update voucher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Snapshot before delete for audit
    const existing = await db.voucher.findUnique({
      where: { id },
      include: { voucherType: true, entries: true },
    });

    await db.voucherEntry.deleteMany({ where: { voucherId: id } });
    await db.stockTransaction.deleteMany({ where: { voucherId: id } });
    await db.voucher.delete({ where: { id } });

    if (existing) {
      await auditLog({
        action: 'DELETE',
        entityType: 'Voucher',
        entityId: id,
        entityName: existing.voucherNumber,
        description: `${existing.voucherType.name} voucher ${existing.voucherNumber} deleted (BDT ${existing.totalAmount.toFixed(2)})`,
        before: voucherSnapshot(existing),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete voucher';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}