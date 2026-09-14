import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function recurringSnapshot(r: {
  name: string;
  scheduleType: string;
  frequency: number;
  nextDate: string;
  voucherTypeName: string;
  isActive: boolean;
  entries?: { ledgerName: string; debit: number; credit: number }[];
}) {
  return {
    name: r.name,
    scheduleType: r.scheduleType,
    frequency: r.frequency,
    nextDate: r.nextDate,
    voucherTypeName: r.voucherTypeName,
    isActive: r.isActive,
    entries: r.entries?.map(e => ({ ledger: e.ledgerName, debit: e.debit, credit: e.credit })) ?? [],
  };
}

/** Calculate next occurrence date based on schedule */
function calculateNextDate(currentDate: string, scheduleType: string, frequency: number): string {
  const date = new Date(currentDate);

  switch (scheduleType) {
    case 'Daily':
      date.setDate(date.getDate() + frequency);
      break;
    case 'Weekly':
      date.setDate(date.getDate() + 7 * frequency);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + frequency);
      break;
    case 'Quarterly':
      date.setMonth(date.getMonth() + 3 * frequency);
      break;
    case 'Half-Yearly':
      date.setMonth(date.getMonth() + 6 * frequency);
      break;
    case 'Yearly':
      date.setFullYear(date.getFullYear() + frequency);
      break;
    default:
      date.setMonth(date.getMonth() + frequency);
  }

  return date.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'overdue') {
      where.isActive = true;
      where.nextDate = { lte: new Date().toISOString().split('T')[0] };
    }
    if (type) where.scheduleType = type;

    const journals = await db.recurringJournal.findMany({
      where,
      include: {
        entries: {
          include: { ledger: { select: { name: true, groupName: true } } },
        },
        vouchers: {
          select: { id: true, voucherNumber: true, date: true, createdAt: true },
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(journals);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recurring journals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entries, ...journalData } = body;

    // Validate entries balance
    const totalDebit = entries.reduce((sum: number, e: { debit: number }) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: { credit: number }) => sum + (e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Entries must balance (Debit = Credit)' }, { status: 400 });
    }
    if (entries.length < 2) {
      return NextResponse.json({ error: 'At least 2 entries required' }, { status: 400 });
    }

    const journal = await db.recurringJournal.create({
      data: {
        ...journalData,
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
      },
      include: {
        entries: { include: { ledger: { select: { name: true, groupName: true } } } },
      },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'RecurringJournal',
      entityId: journal.id,
      entityName: journal.name,
      description: `Recurring journal "${journal.name}" created (${journal.scheduleType}${journal.frequency > 1 ? ` ×${journal.frequency}` : ''})`,
      after: recurringSnapshot(journal),
    });

    return NextResponse.json(journal, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create recurring journal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, entries, ...journalData } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await db.recurringJournal.findUnique({
      where: { id },
      include: { entries: true },
    });

    // If entries are provided, delete old ones and create new
    if (entries && entries.length > 0) {
      const totalDebit = entries.reduce((sum: number, e: { debit: number }) => sum + (e.debit || 0), 0);
      const totalCredit = entries.reduce((sum: number, e: { credit: number }) => sum + (e.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json({ error: 'Entries must balance (Debit = Credit)' }, { status: 400 });
      }

      await db.recurringEntry.deleteMany({ where: { recurringJournalId: id } });

      const journal = await db.recurringJournal.update({
        where: { id },
        data: {
          ...journalData,
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
        },
        include: {
          entries: { include: { ledger: { select: { name: true, groupName: true } } } },
        },
      });

      await auditLog({
        action: 'UPDATE',
        entityType: 'RecurringJournal',
        entityId: id,
        entityName: journal.name,
        description: `Recurring journal "${journal.name}" updated`,
        before: existing ? recurringSnapshot(existing) : null,
        after: recurringSnapshot(journal),
      });

      return NextResponse.json(journal);
    }

    const journal = await db.recurringJournal.update({
      where: { id },
      data: journalData,
      include: {
        entries: { include: { ledger: { select: { name: true, groupName: true } } } },
      },
    });

    await auditLog({
      action: 'UPDATE',
      entityType: 'RecurringJournal',
      entityId: id,
      entityName: journal.name,
      description: `Recurring journal "${journal.name}" updated`,
      before: existing ? recurringSnapshot(existing) : null,
      after: recurringSnapshot(journal),
    });

    return NextResponse.json(journal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update recurring journal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await db.recurringJournal.findUnique({
      where: { id },
      include: { entries: true },
    });

    // Delete entries first, then the journal (cascade should handle this, but be explicit)
    await db.recurringEntry.deleteMany({ where: { recurringJournalId: id } });
    await db.recurringJournal.delete({ where: { id } });

    if (existing) {
      await auditLog({
        action: 'DELETE',
        entityType: 'RecurringJournal',
        entityId: id,
        entityName: existing.name,
        description: `Recurring journal "${existing.name}" deleted`,
        before: recurringSnapshot(existing),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete recurring journal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/recurring-journals/execute?id=xxx — Execute a single recurring journal now */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (action === 'toggle') {
      // Toggle active/inactive
      const journal = await db.recurringJournal.findUnique({ where: { id } });
      if (!journal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const updated = await db.recurringJournal.update({
        where: { id },
        data: { isActive: !journal.isActive },
      });
      return NextResponse.json(updated);
    }

    if (action === 'execute') {
      // Execute this recurring journal — create a voucher
      const journal = await db.recurringJournal.findUnique({
        where: { id },
        include: { entries: true },
      });
      if (!journal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (!journal.isActive) return NextResponse.json({ error: 'Journal is inactive' }, { status: 400 });

      // Get or create voucher type
      let vt = await db.voucherType.findUnique({ where: { name: journal.voucherTypeName } });
      if (!vt) {
        vt = await db.voucherType.create({
          data: { name: journal.voucherTypeName, prefix: journal.voucherTypeName.substring(0, 2).toUpperCase() },
        });
      }

      const totalAmount = journal.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const voucherNumber = await nextVoucherNumber(vt.prefix);

      const voucher = await db.voucher.create({
        data: {
          voucherNumber,
          date: journal.nextDate,
          voucherTypeId: vt.id,
          narration: `[Recurring] ${journal.narration || journal.name}`,
          totalAmount,
          entries: {
            create: journal.entries.map(e => ({
              ledgerId: e.ledgerId,
              ledgerName: e.ledgerName,
              debit: e.debit,
              credit: e.credit,
              taxRate: e.taxRate,
              taxAmount: e.taxAmount,
            })),
          },
        },
        include: { voucherType: true, entries: true },
      });

      // Calculate and update next date
      const nextDate = calculateNextDate(journal.nextDate, journal.scheduleType, journal.frequency);

      // Check if we've passed the end date
      let isActive = journal.isActive;
      if (journal.endDate && nextDate > journal.endDate) {
        isActive = false;
      }

      await db.recurringJournal.update({
        where: { id },
        data: {
          nextDate,
          lastExecuted: new Date(),
          executionCount: journal.executionCount + 1,
          isActive,
        },
      });

      await auditLog({
        action: 'EXECUTE',
        entityType: 'RecurringJournal',
        entityId: id,
        entityName: journal.name,
        description: `Recurring journal "${journal.name}" executed → voucher ${voucherNumber} (BDT ${totalAmount.toFixed(2)}), next: ${nextDate}`,
        after: { voucherNumber, voucherId: voucher.id, date: voucher.date, amount: totalAmount, nextDate },
      });

      return NextResponse.json({
        voucher,
        nextDate,
        autoDeactivated: !isActive,
        message: `Voucher ${voucherNumber} created for ${journal.name}`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "toggle" or "execute".' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}