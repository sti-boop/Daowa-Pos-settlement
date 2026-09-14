// @ts-nocheck
// Daowa Accounting — shared voucher numbering.
//
// Format: `{PREFIX}-{YYYY}-{NNNN}` (e.g. SV-2026-0001, JV-2026-0001).
// The sequence resets every calendar year and is shared across ALL voucher
// sources (manual accounting entries, POS sales/returns, settlement journals),
// so the accounting module keeps one continuous, gap-free register.

import { db as accDb } from './accounting-db';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return the next voucher number for the given voucher-type prefix.
 * Looks up the voucher type by prefix and scans existing vouchers of that type
 * for the current year, returning `{prefix}-{year}-{maxSeq+1}` zero-padded to 4.
 */
export async function nextVoucherNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const vt = await accDb.voucherType.findFirst({ where: { prefix } });
  const vouchers = vt
    ? await accDb.voucher.findMany({ where: { voucherTypeId: vt.id } })
    : await accDb.voucher.findMany({});

  let maxSeq = 0;
  const re = new RegExp(`^${escapeRegExp(prefix)}-${year}-(\\d+)$`);
  for (const v of vouchers) {
    const m = String(v.voucherNumber || '').match(re);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}
