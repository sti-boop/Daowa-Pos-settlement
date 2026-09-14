import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/api-cache';
import { NextRequest, NextResponse } from 'next/server';

function groupSnapshot(g: {
  name: string;
  code: string;
  parentName: string | null;
  nature: string;
  classification: string;
  isReserved: boolean;
}) {
  return {
    name: g.name,
    code: g.code,
    parentName: g.parentName,
    nature: g.nature,
    classification: g.classification,
    isReserved: g.isReserved,
  };
}

export async function GET() {
  try {
    const cached = cacheGet('groups:all');
    if (cached) return NextResponse.json(cached);

    const groups = await db.ledgerGroup.findMany({
      orderBy: [{ nature: 'asc' }, { code: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { ledgers: true, children: true } },
      },
    });
    cacheSet('groups:all', groups, 30_000);
    return NextResponse.json(groups);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch groups';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const group = await db.ledgerGroup.create({ data: body });

    // Auto-create a ledger with the same name under this group
    const balanceType = ['Asset', 'Expense'].includes(body.nature) ? 'Dr' : 'Cr';
    try {
      await db.ledger.create({
        data: {
          name: body.name,
          groupName: body.name,
          openingBalance: 0,
          balanceType,
        },
      });
    } catch {
      // Ledger creation is best-effort (e.g. duplicate name)
    }

    await auditLog({
      action: 'CREATE',
      entityType: 'LedgerGroup',
      entityId: group.id,
      entityName: group.name,
      description: `COA group "${group.name}" (${group.code || 'no code'}) created under ${group.parentName || 'Primary'} — ${group.nature}`,
      after: groupSnapshot(group),
    });
    cacheInvalidate('groups:');

    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const existing = await db.ledgerGroup.findUnique({ where: { id } });
    const group = await db.ledgerGroup.update({ where: { id }, data });
    await auditLog({
      action: 'UPDATE',
      entityType: 'LedgerGroup',
      entityId: id,
      entityName: group.name,
      description: `COA group "${group.name}" (${group.code}) updated`,
      before: existing ? groupSnapshot(existing) : null,
      after: groupSnapshot(group),
    });
    cacheInvalidate('groups:');
    return NextResponse.json(group);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const group = await db.ledgerGroup.findUnique({
      where: { id },
      include: {
        ledgers: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, code: true } },
      },
    });

    if (!group) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // ---- FORCE DELETE: cascade everything ----
    if (force) {
      const stats = { groupsDeleted: 0, ledgersDeleted: 0, voucherEntriesDeleted: 0, vouchersDeleted: 0, recurringEntriesDeleted: 0, recurringJournalsDeleted: 0 };

      // Collect ALL descendant group names (recursive, deepest first)
      const allGroupNames: string[] = [];
      const collectGroups = async (parentName: string) => {
        const kids = await db.ledgerGroup.findMany({
          where: { parentName },
          select: { name: true },
        });
        for (const kid of kids) {
          await collectGroups(kid.name);
          allGroupNames.push(kid.name);
        }
      };
      await collectGroups(group.name);
      allGroupNames.push(group.name); // include the main group itself

      // 1. Find all ledgers in all these groups (active or not)
      const allLedgers = await db.ledger.findMany({
        where: { groupName: { in: allGroupNames } },
        select: { id: true, groupName: true },
      });
      const allLedgerIds = allLedgers.map(l => l.id);

      // 2. Find all voucher entries referencing these ledgers
      if (allLedgerIds.length > 0) {
        // Find voucher IDs that have entries referencing these ledgers
        const voucherWithEntries = await db.voucherEntry.findMany({
          where: { ledgerId: { in: allLedgerIds } },
          select: { id: true, voucherId: true },
        });
        const entryIds = voucherWithEntries.map(e => e.id);
        const affectedVoucherIds = [...new Set(voucherWithEntries.map(e => e.voucherId))];

        // 3. Delete recurring entries referencing these ledgers
        const recurringWithEntries = await db.recurringEntry.findMany({
          where: { ledgerId: { in: allLedgerIds } },
          select: { id: true, recurringJournalId: true },
        });
        const recurringEntryIds = recurringWithEntries.map(e => e.id);
        const affectedRecurringIds = [...new Set(recurringWithEntries.map(e => e.recurringJournalId))];

        if (recurringEntryIds.length > 0) {
          const r1 = await db.recurringEntry.deleteMany({ where: { id: { in: recurringEntryIds } } });
          stats.recurringEntriesDeleted = r1.count;
        }

        // 4. Check if any affected recurring journals now have zero entries — delete them
        for (const rjId of affectedRecurringIds) {
          const remaining = await db.recurringEntry.count({ where: { recurringJournalId: rjId } });
          if (remaining === 0) {
            // Also delete any vouchers generated by this recurring journal
            const rjVouchers = await db.voucher.findMany({
              where: { recurringJournals: { some: { id: rjId } } },
              select: { id: true },
            });
            if (rjVouchers.length > 0) {
              const rjVoucherIds = rjVouchers.map(v => v.id);
              const rjVeDelete = await db.voucherEntry.deleteMany({ where: { voucherId: { in: rjVoucherIds } } });
              stats.voucherEntriesDeleted += rjVeDelete.count;
              const rjVDelete = await db.voucher.deleteMany({ where: { id: { in: rjVoucherIds } } });
              stats.vouchersDeleted += rjVDelete.count;
            }
            await db.recurringJournal.delete({ where: { id: rjId } });
            stats.recurringJournalsDeleted++;
          }
        }

        // 5. Delete all voucher entries for these ledgers
        if (entryIds.length > 0) {
          const r2 = await db.voucherEntry.deleteMany({ where: { id: { in: entryIds } } });
          stats.voucherEntriesDeleted += r2.count;
        }

        // 6. Delete vouchers that now have zero entries (orphaned vouchers)
        for (const vId of affectedVoucherIds) {
          const remaining = await db.voucherEntry.count({ where: { voucherId: vId } });
          if (remaining === 0) {
            await db.voucher.delete({ where: { id: vId } });
            stats.vouchersDeleted++;
          }
        }
      }

      // 7. Hard-delete all ledgers (entries already removed above)
      if (allLedgerIds.length > 0) {
        const r3 = await db.ledger.deleteMany({
          where: { id: { in: allLedgerIds } },
        });
        stats.ledgersDeleted = r3.count;
      }

      // 8. Delete all groups — deepest first (allGroupNames is already in that order from collectGroups)
      // Ledgers are already hard-deleted so no FK issues
      const allGroupRecords = await db.ledgerGroup.findMany({
        where: { name: { in: allGroupNames } },
        select: { id: true, name: true },
      });

      for (const gName of allGroupNames) {
        const gRecord = allGroupRecords.find(g => g.name === gName);
        if (gRecord) {
          try {
            await db.ledgerGroup.delete({ where: { id: gRecord.id } });
            stats.groupsDeleted++;
          } catch {
            // If still blocked, skip (shouldn't happen after ledger hard-delete)
          }
        }
      }

      await auditLog({
        action: 'DELETE',
        entityType: 'LedgerGroup',
        entityId: id,
        entityName: group.name,
        description: `COA group "${group.name}" force-deleted with ${stats.groupsDeleted} group(s), ${stats.ledgersDeleted} ledger(s), ${stats.vouchersDeleted} voucher(s)`,
        before: { ...groupSnapshot(group), stats },
      });

      return NextResponse.json({ success: true, force: true, stats });
    }

    // ---- NORMAL DELETE (safe, with checks) ----
    if (group.isReserved && (group.ledgers.length > 0 || group.children.length > 0)) {
      return NextResponse.json({ error: 'Cannot delete a reserved system account that has dependencies' }, { status: 400 });
    }
    if (group.ledgers.length > 0) {
      return NextResponse.json({ error: 'Cannot delete account with existing ledgers' }, { status: 400 });
    }
    if (group.children.length > 0) {
      return NextResponse.json({ error: 'Cannot delete account with sub-accounts. Delete sub-accounts first.' }, { status: 400 });
    }

    await db.ledgerGroup.delete({ where: { id } });
    await auditLog({
      action: 'DELETE',
      entityType: 'LedgerGroup',
      entityId: id,
      entityName: group.name,
      description: `COA group "${group.name}" (${group.code || 'no code'}) deleted`,
      before: groupSnapshot(group),
    });
    cacheInvalidate('groups:');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET dependencies blocking deletion of a specific group
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const group = await db.ledgerGroup.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, isReserved: true },
    });
    if (!group) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Get direct child groups
    const children = await db.ledgerGroup.findMany({
      where: { parentName: group.name },
      select: { id: true, name: true, code: true, isReserved: true },
      orderBy: { code: 'asc' },
    });

    // Get ledgers attached to this group
    const ledgers = await db.ledger.findMany({
      where: { groupName: group.name, isActive: true },
      select: { id: true, name: true, balanceType: true, openingBalance: true },
      orderBy: { name: 'asc' },
    });

    // Check if any child ledger has voucher entries or recurring entries
    const ledgerIds = ledgers.map(l => l.id);
    let entryCountMap = new Map<string, number>();
    let recurringCountMap = new Map<string, number>();

    if (ledgerIds.length > 0) {
      const entryCounts = await db.voucherEntry.groupBy({
        where: { ledgerId: { in: ledgerIds } },
        by: ['ledgerId'],
        _count: { id: true },
      });
      entryCountMap = new Map(entryCounts.map(e => [e.ledgerId, e._count.id]));

      const recurringCounts = await db.recurringEntry.groupBy({
        where: { ledgerId: { in: ledgerIds } },
        by: ['ledgerId'],
        _count: { id: true },
      });
      recurringCountMap = new Map(recurringCounts.map(e => [e.ledgerId, e._count.id]));
    }

    const ledgersWithEntries = ledgers.map(l => ({
      ...l,
      hasVouchers: (entryCountMap.get(l.id) || 0) > 0,
      voucherCount: entryCountMap.get(l.id) || 0,
      hasRecurring: (recurringCountMap.get(l.id) || 0) > 0,
      recurringCount: recurringCountMap.get(l.id) || 0,
      canDelete: (entryCountMap.get(l.id) || 0) === 0 && (recurringCountMap.get(l.id) || 0) === 0,
    }));

    // Recursively collect ALL descendant sub-accounts with their dependency info
    const allDescendants: {
      id: string; name: string; code: string; depth: number;
      isReserved: boolean; hasChildren: boolean; hasLedgers: boolean;
      canDelete: boolean; deleteReason: string;
    }[] = [];

    const collectDescendants = async (parentName: string, depth: number) => {
      const kids = await db.ledgerGroup.findMany({
        where: { parentName },
        select: { id: true, name: true, code: true, isReserved: true },
        orderBy: { code: 'asc' },
      });
      for (const kid of kids) {
        const childCount = await db.ledgerGroup.count({ where: { parentName: kid.name } });
        const ledgerCount = await db.ledger.count({ where: { groupName: kid.name, isActive: true } });

        let canDelete = !kid.isReserved && childCount === 0 && ledgerCount === 0;
        let deleteReason = '';
        if (kid.isReserved) deleteReason = 'System reserved';
        else if (childCount > 0) deleteReason = `Has ${childCount} sub-account(s)`;
        else if (ledgerCount > 0) deleteReason = `Has ${ledgerCount} ledger(s)`;

        allDescendants.push({
          ...kid,
          depth,
          hasChildren: childCount > 0,
          hasLedgers: ledgerCount > 0,
          canDelete,
          deleteReason,
        });
        await collectDescendants(kid.name, depth + 1);
      }
    };
    await collectDescendants(group.name, 1);

    // Get total ledger count across all descendants
    const descendantNames = allDescendants.map(d => d.name);
    const totalDescendantLedgers = descendantNames.length > 0
      ? await db.ledger.count({ where: { groupName: { in: descendantNames }, isActive: true } })
      : 0;

    // Count total voucher entries across all ledgers in this group and descendants
    const allGroupNamesForCount = [group.name, ...descendantNames];
    const allLedgersForCount = await db.ledger.findMany({
      where: { groupName: { in: allGroupNamesForCount } },
      select: { id: true },
    });
    const allLedgerIdsForCount = allLedgersForCount.map(l => l.id);
    const totalVoucherEntries = allLedgerIdsForCount.length > 0
      ? await db.voucherEntry.count({ where: { ledgerId: { in: allLedgerIdsForCount } } })
      : 0;
    const totalRecurringEntries = allLedgerIdsForCount.length > 0
      ? await db.recurringEntry.count({ where: { ledgerId: { in: allLedgerIdsForCount } } })
      : 0;

    const canDelete = children.length === 0 && ledgers.length === 0 && !group.isReserved;

    return NextResponse.json({
      group,
      canDelete,
      isReserved: group.isReserved,
      directChildren: children,
      directLedgers: ledgersWithEntries,
      allDescendants,
      totalDescendantLedgers,
      totalLedgers: (ledgers.length || 0) + totalDescendantLedgers,
      totalVoucherEntries,
      totalRecurringEntries,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check dependencies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}