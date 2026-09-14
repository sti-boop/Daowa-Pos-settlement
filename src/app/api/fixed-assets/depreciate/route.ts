import { db } from '@/lib/accounting-db';
import { nextVoucherNumber } from '@/lib/accounting-numbering';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

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
    const rate = Number(asset.rate || 10);
    const nbv = Math.max(0, cost - accumulated - salvage);
    return round2((nbv * (rate / 100)) / 12);
  }
  const remaining = Math.max(0, cost - salvage - accumulated);
  return round2(Math.min(remaining, (cost - salvage) / life));
}

export async function POST(req: NextRequest) {
  try {
    const { asOfDate } = await req.json().catch(() => ({}));
    const today = asOfDate || todayISO();

    const assets = await db.fixedAsset.findMany({ where: { isActive: true } });
    const due = assets.filter(
      (a) => !a.lastDepreciationDate || (a.lastDepreciationDate && a.lastDepreciationDate < today)
    );
    if (due.length === 0) {
      return NextResponse.json({ success: true, posted: false, message: 'No depreciation is due for this period.' });
    }

    let expenseLedger = await db.ledger.findFirst({ where: { name: 'Fixed Asset Depreciation' } });
    if (!expenseLedger) {
      await db.ledger.create({
        data: { name: 'Fixed Asset Depreciation', groupName: 'Depreciation', openingBalance: 0, balanceType: 'Dr', isActive: true },
      });
      expenseLedger = await db.ledger.findFirst({ where: { name: 'Fixed Asset Depreciation' } });
    }
    let accumLedger = await db.ledger.findFirst({ where: { name: 'Accumulated Depreciation A/c' } });
    if (!accumLedger) {
      await db.ledger.create({
        data: { name: 'Accumulated Depreciation A/c', groupName: 'Accumulated Depreciation', openingBalance: 0, balanceType: 'Cr', isActive: true },
      });
      accumLedger = await db.ledger.findFirst({ where: { name: 'Accumulated Depreciation A/c' } });
    }

    let total = 0;
    const lines: string[] = [];
    for (const a of due) {
      const amt = monthlyDepreciation(a);
      if (amt <= 0.0005) continue;
      total += amt;
      lines.push(`${a.name} (৳${amt.toFixed(2)})`);
      await db.fixedAsset.update({
        where: { id: a.id },
        data: {
          accumulatedDepreciation: round2(Number(a.accumulatedDepreciation || 0) + amt),
          lastDepreciationDate: today,
        },
      });
    }
    total = round2(total);
    if (total <= 0) {
      return NextResponse.json({ success: true, posted: false, message: 'Assets fully depreciated — nothing to post.' });
    }

    const vt = await db.voucherType.findUnique({ where: { name: 'Journal' } });
    const voucherNumber = await nextVoucherNumber('JV');
    const voucher = await db.voucher.create({
      data: {
        voucherNumber,
        reference: `DEP-${today}`,
        date: today,
        voucherTypeId: vt.id,
        narration: `Monthly depreciation — ${lines.join('; ')}`,
        totalAmount: total,
        entries: {
          create: [
            { ledgerId: expenseLedger.id, ledgerName: expenseLedger.name, debit: total, credit: 0 },
            { ledgerId: accumLedger.id, ledgerName: accumLedger.name, debit: 0, credit: total },
          ],
        },
      },
      include: { entries: true },
    });

    await auditLog({
      action: 'CREATE',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityName: voucher.voucherNumber,
      description: `Depreciation ${voucher.voucherNumber} posted (BDT ${total.toFixed(2)}) for ${due.length} asset(s)`,
    });

    return NextResponse.json({
      success: true,
      posted: true,
      voucherNumber,
      amount: total,
      assetsDepreciated: due.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run depreciation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
