import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

const ASSET_GROUPS = [
  'Land & Building',
  'Furniture & Fixtures',
  'Electrical, Computers & IT Equipment',
  'Vehicles',
  'Machinery',
];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function monthlyDepreciation(asset: any): number {
  const cost = Number(asset.cost || 0);
  const salvage = Number(asset.salvageValue || 0);
  const accumulated = Number(asset.accumulatedDepreciation || 0);
  const life = Number(asset.usefulLifeMonths || 60);
  if (asset.method === 'reducing_balance') {
    const rate = Number(asset.rate || 10); // annual %
    const nbv = Math.max(0, cost - accumulated - salvage);
    return round2((nbv * (rate / 100)) / 12);
  }
  // straight line
  const remaining = Math.max(0, cost - salvage - accumulated);
  return round2(Math.min(remaining, (cost - salvage) / life));
}

function assetView(a: any) {
  const nbv = Math.max(0, Number(a.cost || 0) - Number(a.accumulatedDepreciation || 0));
  return { ...a, netBookValue: round2(nbv), monthlyDepreciation: monthlyDepreciation(a) };
}

export async function GET() {
  try {
    const assets = await db.fixedAsset.findMany({ orderBy: { purchaseDate: 'asc' } });
    return NextResponse.json(assets.map(assetView));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fixed assets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const asset = await db.fixedAsset.create({
      data: {
        name: body.name,
        groupName: body.groupName || 'Electrical, Computers & IT Equipment',
        cost: Number(body.cost || 0),
        salvageValue: Number(body.salvageValue || 0),
        usefulLifeMonths: Number(body.usefulLifeMonths || 60),
        method: body.method || 'straight_line',
        rate: Number(body.rate || 0),
        purchaseDate: body.purchaseDate || todayISO(),
        accumulatedDepreciation: 0,
        lastDepreciationDate: null,
        isActive: true,
      },
    });
    await auditLog({
      action: 'CREATE',
      entityType: 'FixedAsset',
      entityId: asset.id,
      entityName: asset.name,
      description: `Fixed asset "${asset.name}" registered (cost ৳${asset.cost}, ${asset.usefulLifeMonths} months)`,
    });
    return NextResponse.json(assetView(asset), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create fixed asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const asset = await db.fixedAsset.update({ where: { id }, data });
    await auditLog({
      action: 'UPDATE',
      entityType: 'FixedAsset',
      entityId: id,
      entityName: asset.name,
      description: `Fixed asset "${asset.name}" updated`,
    });
    return NextResponse.json(assetView(asset));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update fixed asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const asset = await db.fixedAsset.delete({ where: { id } });
    await auditLog({
      action: 'DELETE',
      entityType: 'FixedAsset',
      entityId: id,
      entityName: asset?.name,
      description: `Fixed asset "${asset?.name}" removed`,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete fixed asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
