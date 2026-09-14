import { db } from '@/lib/accounting-db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const [company, groups, ledgers, voucherTypes, vouchers, voucherEntries, recurringJournals, recurringEntries] = await Promise.all([
      db.company.findFirst(),
      db.ledgerGroup.findMany({ orderBy: { code: 'asc' } }),
      db.ledger.findMany({ orderBy: { name: 'asc' } }),
      db.voucherType.findMany({ orderBy: { name: 'asc' } }),
      db.voucher.findMany({ orderBy: { date: 'desc' } }),
      db.voucherEntry.findMany(),
      db.recurringJournal.findMany({ orderBy: { name: 'asc' } }),
      db.recurringEntry.findMany(),
    ]);

    const backup = {
      _meta: {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: 'daowa-accounting',
      },
      company,
      groups,
      ledgers,
      voucherTypes,
      vouchers,
      voucherEntries,
      recurringJournals,
      recurringEntries,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="daowa-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, groups, ledgers, voucherTypes, vouchers, voucherEntries, recurringJournals, recurringEntries } = body;

    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json({ error: 'Invalid backup: missing groups' }, { status: 400 });
    }

    const stats = { groups: 0, ledgers: 0, voucherTypes: 0, vouchers: 0, entries: 0, recurring: 0, recurringEntries: 0, company: false };

    // Delete everything in reverse dependency order
    await db.voucherEntry.deleteMany({});
    await db.recurringEntry.deleteMany({});
    await db.voucher.deleteMany({});
    await db.recurringJournal.deleteMany({});
    await db.ledger.deleteMany({});
    await db.ledgerGroup.deleteMany({});
    await db.voucherType.deleteMany({});

    // Restore groups (skip if name already exists from seed or something)
    for (const g of groups) {
      const { id, _count, createdAt, updatedAt, parent, children, ...data } = g as Record<string, unknown>;
      try {
        await db.ledgerGroup.create({ data: data as Parameters<typeof db.ledgerGroup.create>[0]['data'] });
        stats.groups++;
      } catch (e: unknown) {
        // Unique name conflict — update instead
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Unique')) {
          try {
            const existing = await db.ledgerGroup.findUnique({ where: { name: (data as Record<string, unknown>).name as string } });
            if (existing) {
              await db.ledgerGroup.update({ where: { id: existing.id }, data: data as Parameters<typeof db.ledgerGroup.update>[0]['data'] });
              stats.groups++;
            }
          } catch { /* skip */ }
        }
      }
    }

    // Restore voucher types
    if (voucherTypes && Array.isArray(voucherTypes)) {
      for (const vt of voucherTypes) {
        const { id, _count, createdAt, updatedAt, vouchers, ...data } = vt as Record<string, unknown>;
        try {
          await db.voucherType.create({ data: data as Parameters<typeof db.voucherType.create>[0]['data'] });
          stats.voucherTypes++;
        } catch { /* skip duplicates */ }
      }
    }

    // Restore ledgers
    if (ledgers && Array.isArray(ledgers)) {
      for (const l of ledgers) {
        const { id, _count, createdAt, updatedAt, group, entries, recurringEntries: _re, ...data } = l as Record<string, unknown>;
        try {
          await db.ledger.create({ data: data as Parameters<typeof db.ledger.create>[0]['data'] });
          stats.ledgers++;
        } catch { /* skip */ }
      }
    }

    // Restore vouchers
    if (vouchers && Array.isArray(vouchers)) {
      for (const v of vouchers) {
        const { id, _count, createdAt, updatedAt, voucherType, entries, stockEntries, recurringJournals: _rj, ...data } = v as Record<string, unknown>;
        try {
          await db.voucher.create({ data: data as Parameters<typeof db.voucher.create>[0]['data'] });
          stats.vouchers++;
        } catch { /* skip */ }
      }
    }

    // Restore voucher entries
    if (voucherEntries && Array.isArray(voucherEntries)) {
      for (const e of voucherEntries) {
        const { id, createdAt, updatedAt, voucher, ledger, ...data } = e as Record<string, unknown>;
        try {
          await db.voucherEntry.create({ data: data as Parameters<typeof db.voucherEntry.create>[0]['data'] });
          stats.entries++;
        } catch { /* skip FK issues */ }
      }
    }

    // Restore recurring journals
    if (recurringJournals && Array.isArray(recurringJournals)) {
      for (const rj of recurringJournals) {
        const { id, _count, createdAt, updatedAt, entries, vouchers, ...data } = rj as Record<string, unknown>;
        try {
          await db.recurringJournal.create({ data: data as Parameters<typeof db.recurringJournal.create>[0]['data'] });
          stats.recurring++;
        } catch { /* skip */ }
      }
    }

    // Restore recurring entries
    if (recurringEntries && Array.isArray(recurringEntries)) {
      for (const re of recurringEntries) {
        const { id, createdAt, updatedAt, recurringJournal, ledger, ...data } = re as Record<string, unknown>;
        try {
          await db.recurringEntry.create({ data: data as Parameters<typeof db.recurringEntry.create>[0]['data'] });
          stats.recurringEntries++;
        } catch { /* skip */ }
      }
    }

    // Restore company
    if (company) {
      const { id, createdAt, updatedAt, ...data } = company as Record<string, unknown>;
      const existing = await db.company.findFirst();
      if (existing) {
        await db.company.update({ where: { id: existing.id }, data: data as Parameters<typeof db.company.update>[0]['data'] });
      } else {
        await db.company.create({ data: data as Parameters<typeof db.company.create>[0]['data'] });
      }
      stats.company = true;
    }

    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}