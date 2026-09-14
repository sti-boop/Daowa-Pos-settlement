import { NextResponse } from 'next/server';
import { runFullSync, syncPosCatalogToAccounting, refreshInventoryValue } from '@/lib/accounting-sync';
import { db as accDb } from '@/lib/accounting-db';

export async function GET() {
  try {
    const [ledgerCount, voucherCount, groupCount, stockItemCount, company] = await Promise.all([
      accDb.ledger.count({}),
      accDb.voucher.count({}),
      accDb.ledgerGroup.count({}),
      accDb.stockItem.count({}),
      accDb.company.findFirst(),
    ]);
    return NextResponse.json({
      synced: true,
      ledgerCount,
      voucherCount,
      groupCount,
      stockItemCount,
      inventoryValue: company?.inventoryValue ?? 0,
      inventoryValueUpdatedAt: company?.inventoryValueUpdatedAt ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read sync status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await runFullSync();
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
