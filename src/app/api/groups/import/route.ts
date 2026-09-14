import { db } from '@/lib/accounting-db';
import { auditLog } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

const VALID_NATURES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const VALID_CLASSIFICATIONS = ['Balance Sheet', 'Profit & Loss'];
const VALID_SUB_CATEGORIES = [
  'Current', 'Long-Term', 'Bank', 'Cash', 'Inventory',
  'Fixed Asset', 'Equipment', 'Fixtures',
  'Payables', 'Taxes', 'Accrued', 'Loans',
  'Equity', 'Capital', 'Earnings', 'Drawings',
  'Revenue', 'Shipping', 'Cost of Sales', 'Wastage',
  'Direct Expense', 'Distribution', 'Packaging',
  'Operating Exp', 'Rent', 'Utilities', 'Technology',
  'Marketing', 'Payroll', 'Legal/Licenses',
];

interface CsvRow {
  rowIndex: number;
  name: string;
  code: string;
  parent: string;
  nature: string;
  classification: string;
  subCategory: string;
  affectsGrossProfit: boolean;
  isTaxRelated: boolean;
  notes: string;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
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
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseBoolean(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === '1' || v === 'y';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'CSV content is required' }, { status: 400 });
    }

    const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    // Parse header
    const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[_\s-]+/g, ''));
    const headerMap: Record<string, number> = {};
    const aliasMap: Record<string, string> = {
      'name': 'name',
      'accountname': 'name',
      'account': 'name',
      'code': 'code',
      'accountcode': 'code',
      'parent': 'parent',
      'parentaccount': 'parent',
      'parentname': 'parent',
      'nature': 'nature',
      'accountnature': 'nature',
      'classification': 'classification',
      'subcategory': 'subcategory',
      'sub-category': 'subcategory',
      'sub_category': 'subcategory',
      'affectsgrossprofit': 'affectsgrossprofit',
      'affectsgp': 'affectsgrossprofit',
      'gp': 'affectsgrossprofit',
      'istaxrelated': 'istaxrelated',
      'taxrelated': 'istaxrelated',
      'tax': 'istaxrelated',
      'notes': 'notes',
      'description': 'notes',
      'note': 'notes',
    };

    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      const mapped = aliasMap[h] || h;
      headerMap[mapped] = i;
    }

    // Check required columns
    if (headerMap['name'] === undefined) {
      return NextResponse.json({ error: 'Missing required column: Name (or Account Name)' }, { status: 400 });
    }
    if (headerMap['code'] === undefined) {
      return NextResponse.json({ error: 'Missing required column: Code (or Account Code)' }, { status: 400 });
    }
    if (headerMap['nature'] === undefined) {
      return NextResponse.json({ error: 'Missing required column: Nature (or Account Nature)' }, { status: 400 });
    }

    // Get existing accounts
    const existing = await db.ledgerGroup.findMany({ select: { name: true, code: true } });
    const existingNames = new Set(existing.map(e => e.name));
    const existingCodes = new Set(existing.map(e => e.code));

    // Parse all rows
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const getCol = (key: string) => headerMap[key] !== undefined ? (cols[headerMap[key]] || '').trim() : '';

      const name = getCol('name');
      const code = getCol('code');
      const parent = getCol('parent');
      let nature = getCol('nature');
      let classification = getCol('classification');
      let subCategory = getCol('subcategory');
      const affectsGrossProfit = getCol('affectsgrossprofit') ? parseBoolean(getCol('affectsgrossprofit')) : false;
      const isTaxRelated = getCol('istaxrelated') ? parseBoolean(getCol('istaxrelated')) : false;
      const notes = getCol('notes');

      const errors: string[] = [];

      if (!name) errors.push('Name is required');
      if (!code) errors.push('Code is required');
      if (!nature) {
        errors.push('Nature is required');
      } else {
        // Case-insensitive nature matching
        const matchedNature = VALID_NATURES.find(n => n.toLowerCase() === nature.toLowerCase());
        if (matchedNature) {
          nature = matchedNature;
        } else {
          errors.push(`Invalid nature "${nature}". Must be: ${VALID_NATURES.join(', ')}`);
        }
      }

      // Auto-derive classification if not provided
      if (!classification && nature) {
        classification = (nature === 'Income' || nature === 'Expense') ? 'Profit & Loss' : 'Balance Sheet';
      } else if (classification) {
        const matchedClass = VALID_CLASSIFICATIONS.find(c => c.toLowerCase() === classification.toLowerCase());
        if (matchedClass) {
          classification = matchedClass;
        } else {
          errors.push(`Invalid classification "${classification}". Must be: ${VALID_CLASSIFICATIONS.join(', ')}`);
        }
      } else {
        classification = 'Balance Sheet';
      }

      // Validate sub-category
      if (subCategory) {
        const matchedSub = VALID_SUB_CATEGORIES.find(s => s.toLowerCase() === subCategory.toLowerCase());
        if (matchedSub) {
          subCategory = matchedSub;
        } else {
          errors.push(`Invalid sub-category "${subCategory}". Must be one of the predefined values or leave empty`);
        }
      }

      rows.push({
        rowIndex: i + 1,
        name,
        code,
        parent,
        nature,
        classification,
        subCategory,
        affectsGrossProfit,
        isTaxRelated,
        notes,
        errors,
      });
    }

    // Check for duplicate names/codes within CSV
    const csvNames = new Map<string, number>();
    const csvCodes = new Map<string, number>();
    for (const row of rows) {
      if (row.name && csvNames.has(row.name)) {
        row.errors.push(`Duplicate name "${row.name}" in CSV (also on row ${csvNames.get(row.name)})`);
      } else if (row.name) {
        csvNames.set(row.name, row.rowIndex);
      }
      if (row.code && csvCodes.has(row.code)) {
        row.errors.push(`Duplicate code "${row.code}" in CSV (also on row ${csvCodes.get(row.code)})`);
      } else if (row.code) {
        csvCodes.set(row.code, row.rowIndex);
      }
    }

    // Check against existing DB records
    for (const row of rows) {
      if (row.name && existingNames.has(row.name)) {
        row.errors.push(`Account "${row.name}" already exists in database (will be skipped)`);
      }
      if (row.code && existingCodes.has(row.code)) {
        row.errors.push(`Code "${row.code}" already exists in database`);
      }
      // Check parent reference exists in CSV or DB
      if (row.parent && !csvNames.has(row.parent) && !existingNames.has(row.parent)) {
        row.errors.push(`Parent "${row.parent}" not found in database or CSV`);
      }
    }

    // Separate valid and invalid rows
    const validRows = rows.filter(r => r.errors.length === 0);
    const invalidRows = rows.filter(r => r.errors.length > 0);

    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        created: 0,
        skipped: rows.length,
        errors: invalidRows.map(r => ({ row: r.rowIndex, name: r.name || '(empty)', errors: r.errors })),
      });
    }

    // Topological sort: parents before children
    const createdNames = new Set<string>([...existingNames]);
    const sorted: CsvRow[] = [];
    const remaining = new Map<string, CsvRow>();
    validRows.forEach(r => remaining.set(r.name, r));

    let iterations = 0;
    const maxIterations = remaining.size + 1;
    while (remaining.size > 0 && iterations < maxIterations) {
      iterations++;
      let addedInRound = false;
      for (const [name, row] of remaining) {
        if (!row.parent || createdNames.has(row.parent)) {
          sorted.push(row);
          createdNames.add(name);
          remaining.delete(name);
          addedInRound = true;
        }
      }
      if (!addedInRound) break; // Circular dependency
    }

    // Any remaining have circular dependencies
    for (const [name, row] of remaining) {
      row.errors.push('Circular parent dependency or unresolved parent reference');
      invalidRows.push(row);
    }

    // Create accounts in order
    let created = 0;
    const createErrors: { row: number; name: string; errors: string[] }[] = [];

    for (const row of sorted) {
      try {
        await db.ledgerGroup.create({
          data: {
            name: row.name,
            code: row.code,
            parentName: row.parent || null,
            nature: row.nature,
            classification: row.classification,
            subCategory: row.subCategory || '',
            affectsGrossProfit: row.affectsGrossProfit,
            isTaxRelated: row.isTaxRelated,
            notes: row.notes || '',
          },
        });
        created++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Database error';
        createErrors.push({ row: row.rowIndex, name: row.name, errors: [message] });
      }
    }

    if (created > 0) {
      await auditLog({
        action: 'CREATE',
        entityType: 'LedgerGroup',
        entityId: 'csv-import',
        entityName: 'COA CSV import',
        description: `CSV import: ${created} COA group(s) created, ${invalidRows.length} skipped of ${rows.length} rows`,
        after: { created, skipped: invalidRows.length, total: rows.length, errorCount: createErrors.length },
      });
    }

    return NextResponse.json({
      success: true,
      created,
      skipped: invalidRows.length,
      total: rows.length,
      errors: [
        ...invalidRows.map(r => ({ row: r.rowIndex, name: r.name || '(empty)', errors: r.errors })),
        ...createErrors,
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import CSV';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}