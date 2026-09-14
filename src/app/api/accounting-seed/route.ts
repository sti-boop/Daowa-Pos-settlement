import { db } from '@/lib/accounting-db';
import { NextResponse } from 'next/server';
import {
  DEFAULT_GROUPS,
  DEFAULT_VOUCHER_TYPES,
  DEFAULT_LEDGERS,
  DEFAULT_STOCK_GROUPS,
  DEFAULT_STOCK_ITEMS,
} from '@/lib/accounting-seed-data';

export async function POST() {
  try {
    // Create default company
    const existingCompany = await db.company.findFirst();
    if (!existingCompany) {
      await db.company.create({
        data: {
          name: 'Daowa Healthcare',
          address: 'Daowa.net Healthcare Store',
          phone: '',
          email: 'info@daowa.net',
          bin: '',
          tin: '',
        },
      });
    }

    // Create default groups
    for (const g of DEFAULT_GROUPS) {
      const existing = await db.ledgerGroup.findUnique({ where: { name: g.name } });
      if (!existing) {
        await db.ledgerGroup.create({ data: g });
      }
    }

    // Create default voucher types
    for (const vt of DEFAULT_VOUCHER_TYPES) {
      const existing = await db.voucherType.findUnique({ where: { name: vt.name } });
      if (!existing) {
        await db.voucherType.create({ data: vt });
      }
    }

    // Create default ledgers
    for (const l of DEFAULT_LEDGERS) {
      const existing = await db.ledger.findFirst({ where: { name: l.name } });
      if (!existing) {
        await db.ledger.create({ data: l });
      }
    }

    // Create default stock groups
    for (const sg of DEFAULT_STOCK_GROUPS) {
      const existing = await db.stockGroup.findUnique({ where: { name: sg.name } });
      if (!existing) {
        await db.stockGroup.create({ data: sg }).catch(() => {});
      }
    }

    // Create default stock items (ensure groups exist first)
    for (const si of DEFAULT_STOCK_ITEMS) {
      const existing = await db.stockItem.findFirst({ where: { name: si.name } });
      if (!existing) {
        await db.stockItem.create({ data: si }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, message: 'Seed data created successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
