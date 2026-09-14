import { db } from '@/lib/accounting-db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/api-cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const cached = cacheGet('voucher-types:all');
    if (cached) return NextResponse.json(cached);

    const types = await db.voucherType.findMany({ orderBy: { name: 'asc' } });
    cacheSet('voucher-types:all', types, 60_000);
    return NextResponse.json(types);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch voucher types';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];
    const results = [];
    for (const u of updates) {
      if (u.id && u.prefix !== undefined) {
        const updated = await db.voucherType.update({
          where: { id: u.id },
          data: { prefix: u.prefix },
        });
        results.push(updated);
        cacheInvalidate('voucher-types:all');
      }
    }
    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update voucher types';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}