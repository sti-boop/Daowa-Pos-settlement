import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });

    // Parse header
    const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const nameIdx = header.findIndex(h => h === 'name' || h === 'ledger name');
    const groupIdx = header.findIndex(h => h === 'group' || h === 'group name' || h === 'under group');
    const balanceIdx = header.findIndex(h => h === 'opening balance' || h === 'balance');
    const typeIdx = header.findIndex(h => h === 'balance type' || h === 'type');
    const binIdx = header.findIndex(h => h === 'bin');
    const phoneIdx = header.findIndex(h => h === 'phone');
    const emailIdx = header.findIndex(h => h === 'email');
    const addressIdx = header.findIndex(h => h === 'address');

    if (nameIdx === -1) return NextResponse.json({ error: 'CSV must have a "Name" column' }, { status: 400 });
    if (groupIdx === -1) return NextResponse.json({ error: 'CSV must have a "Group" column' }, { status: 400 });

    // Validate groups exist
    const allGroups = await db.ledgerGroup.findMany({ select: { name: true } });
    const groupNames = new Set(allGroups.map(g => g.name));

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const name = (cols[nameIdx] || '').trim();
      const groupName = (cols[groupIdx] || '').trim();

      if (!name) { results.errors.push(`Row ${i + 1}: Name is empty`); continue; }
      if (!groupName) { results.errors.push(`Row ${i + 1}: Group is empty`); continue; }
      if (!groupNames.has(groupName)) {
        results.errors.push(`Row ${i + 1}: Group "${groupName}" does not exist`);
        results.skipped++;
        continue;
      }

      // Check for duplicate
      const exists = await db.ledger.findFirst({ where: { name } });
      if (exists) { results.skipped++; continue; }

      const openingBalance = balanceIdx >= 0 ? parseFloat(cols[balanceIdx]) || 0 : 0;
      const balanceType = typeIdx >= 0 ? (cols[typeIdx] || '').trim() : 'Dr';
      const bin = binIdx >= 0 ? (cols[binIdx] || '').trim() : '';
      const phone = phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '';
      const email = emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '';
      const address = addressIdx >= 0 ? (cols[addressIdx] || '').trim() : '';

      if (balanceType !== 'Dr' && balanceType !== 'Cr') {
        results.errors.push(`Row ${i + 1}: Invalid balance type "${balanceType}" (must be Dr or Cr)`);
        results.skipped++;
        continue;
      }

      try {
        await db.ledger.create({
          data: { name, groupName, openingBalance, balanceType, bin, phone, email, address },
        });
        results.created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Row ${i + 1}: ${msg}`);
        results.skipped++;
      }
    }

    if (results.created > 0) {
      await auditLog({
        action: 'CREATE',
        entityType: 'Ledger',
        entityId: 'csv-import',
        entityName: `${file.name} (import)`,
        description: `CSV import: ${results.created} ledger(s) created, ${results.skipped} skipped from "${file.name}"`,
        after: { file: file.name, created: results.created, skipped: results.skipped, errorCount: results.errors.length },
      });
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Parse a CSV line handling quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
