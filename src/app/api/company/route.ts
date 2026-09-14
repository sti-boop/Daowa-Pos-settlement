import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/api-cache';
import { NextRequest, NextResponse } from 'next/server';

function companySnapshot(c: {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  bin: string | null;
  tin: string | null;
  fYearStart: string;
  fYearEnd: string;
  currency: string;
  logo?: string;
}) {
  return {
    name: c.name,
    address: c.address,
    phone: c.phone,
    email: c.email,
    bin: c.bin,
    tin: c.tin,
    fYearStart: c.fYearStart,
    fYearEnd: c.fYearEnd,
    currency: c.currency,
  };
}

export async function GET() {
  try {
    const cached = cacheGet('company:profile');
    if (cached) return NextResponse.json(cached);

    const company = await db.company.findFirst();
    cacheSet('company:profile', company || {}, 15_000);
    return NextResponse.json(company || {});
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = await db.company.findFirst();
    let company;
    if (existing) {
      company = await db.company.update({ where: { id: existing.id }, data: body });
    } else {
      company = await db.company.create({ data: body });
    }
    await auditLog({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: existing
        ? `Company profile "${company.name}" updated`
        : `Company profile "${company.name}" created`,
      before: existing ? companySnapshot(existing) : null,
      after: companySnapshot(company),
    });
    cacheInvalidate('company:profile');
    return NextResponse.json(company);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update company';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/company — update the manually-managed inventory value (external backend system) */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { inventoryValue } = body;

    if (typeof inventoryValue !== 'number' || !isFinite(inventoryValue) || inventoryValue < 0) {
      return NextResponse.json({ error: 'inventoryValue must be a non-negative number' }, { status: 400 });
    }

    const existing = await db.company.findFirst();
    if (!existing) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const company = await db.company.update({
      where: { id: existing.id },
      data: {
        inventoryValue,
        inventoryValueUpdatedAt: new Date(),
      },
    });

    await auditLog({
      action: 'UPDATE',
      entityType: 'Company',
      entityId: company.id,
      entityName: company.name,
      description: `Inventory value updated: BDT ${(existing.inventoryValue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} → BDT ${inventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      before: { inventoryValue: existing.inventoryValue, updatedAt: existing.inventoryValueUpdatedAt },
      after: { inventoryValue: company.inventoryValue, updatedAt: company.inventoryValueUpdatedAt },
    });
    cacheInvalidate('company:profile');

    return NextResponse.json(company);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update inventory value';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
