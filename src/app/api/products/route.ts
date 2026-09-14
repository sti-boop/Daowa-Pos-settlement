import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const generic = searchParams.get('generic') || '';
  const frequentlyBoughtWith = searchParams.get('frequentlyBoughtWith');

  // Alternatives by generic endpoint: ?generic=<generic name>&exclude=<productId>
  if (generic) {
    try {
      const excludeId = searchParams.get('exclude') || '';
      const alternatives = await db.product.findMany({
        where: {
          generic,
          ...(excludeId ? { id: { not: excludeId } } : {}),
          stock: { gt: 0 },
        },
        take: 10,
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(alternatives);
    } catch {
      return NextResponse.json([]);
    }
  }

  // Frequently bought together endpoint
  if (frequentlyBoughtWith) {
    try {
      // Find all sale IDs that contain the given product
      const saleItemsWithProduct = await db.saleItem.findMany({
        where: { productId: frequentlyBoughtWith },
        select: { saleId: true },
      });

      const saleIds = saleItemsWithProduct.map((si) => si.saleId);

      if (saleIds.length === 0) {
        return NextResponse.json([]);
      }

      // Find all other products sold in those same sales
      const companionItems = await db.saleItem.findMany({
        where: {
          saleId: { in: saleIds },
          productId: { not: frequentlyBoughtWith },
        },
        select: { productId: true, productName: true },
      });

      // Aggregate by productId
      const productMap = new Map<string, { name: string; count: number }>();
      for (const ci of companionItems) {
        const existing = productMap.get(ci.productId) || { name: ci.productName, count: 0 };
        productMap.set(ci.productId, { name: ci.productName, count: existing.count + 1 });
      }

      const sorted = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Fetch full product data for top 5
      const productIds = sorted.map((s) => s.productId);
      const products = await db.product.findMany({
        where: { id: { in: productIds } },
      });

      // Merge count data with product data
      const result = products.map((p) => ({
        ...p,
        togetherCount: sorted.find((s) => s.productId === p.id)?.count || 0,
      })).sort((a, b) => b.togetherCount - a.togetherCount).slice(0, 5);

      return NextResponse.json(result);
    } catch {
      return NextResponse.json([]);
    }
  }

  if (!search.trim()) {
    const where = category ? { category } : {};
    const limit = parseInt(searchParams.get('limit') || '0', 10) || undefined;

    // Expiry alert endpoint: ?expiry=true
    if (searchParams.get('expiry') === 'true') {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const expiringProducts = await db.product.findMany({
        where: {
          expiryDate: { not: null, lte: ninetyDays },
          stock: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });

      const enriched = expiringProducts.map((p) => {
        const exp = p.expiryDate ? new Date(p.expiryDate) : null;
        const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        let severity: 'expired' | 'critical' | 'warning' | 'info' = 'info';
        if (daysLeft !== null) {
          if (daysLeft <= 0) severity = 'expired';
          else if (daysLeft <= 30) severity = 'critical';
          else if (daysLeft <= 60) severity = 'warning';
        }
        return { ...p, daysLeft, severity };
      });

      return NextResponse.json(enriched);
    }

    const allProducts = await db.product.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(allProducts);
  }

  // Smart Hybrid Search Engine (Combines Barcode, Brand Prefix, Generic Molecule, and Multi-Token Intersection)
  const cleanQuery = search.trim().toLowerCase();
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  // Fetch candidate pool
  const candidateWhere: Record<string, unknown> = category ? { category } : {};
  const allCandidates = await db.product.findMany({
    where: candidateWhere,
  });

  interface ScoredResult {
    product: typeof allCandidates[0];
    score: number;
    matchType: 'barcode' | 'exact' | 'prefix' | 'generic' | 'hybrid' | 'contains';
  }

  const scoredResults: ScoredResult[] = [];

  for (const p of allCandidates) {
    const pName = (p.name || '').toLowerCase();
    const pBarcode = (p.barcode || '').toLowerCase();
    const pGeneric = (p.generic || '').toLowerCase();
    const pCategory = (p.category || '').toLowerCase();
    const pUnit = (p.unit || '').toLowerCase();
    const pBatch = (p.batchNo || '').toLowerCase();

    let score = 0;
    let matchType: ScoredResult['matchType'] | null = null;

    // 1. Exact / Prefix Barcode Scanner Match (Highest Priority)
    if (pBarcode && (pBarcode === cleanQuery || pBarcode.trim() === cleanQuery)) {
      score = 1000;
      matchType = 'barcode';
    } else if (pBarcode && pBarcode.startsWith(cleanQuery)) {
      score = 850;
      matchType = 'barcode';
    } else if (pBarcode && pBarcode.includes(cleanQuery) && cleanQuery.length >= 3) {
      score = 700;
      matchType = 'barcode';
    }
    // 2. Exact Brand / Product Name Match
    else if (pName === cleanQuery) {
      score = 900;
      matchType = 'exact';
    }
    // 3. Brand Name Prefix (Starts With) Match
    else if (pName.startsWith(cleanQuery)) {
      score = 750;
      matchType = 'prefix';
    }
    // 4. Generic (Molecule/Salt) Exact or Prefix Match
    else if (pGeneric && pGeneric === cleanQuery) {
      score = 650;
      matchType = 'generic';
    } else if (pGeneric && pGeneric.startsWith(cleanQuery)) {
      score = 600;
      matchType = 'generic';
    }
    // 5. Multi-Token Hybrid Intersection (e.g. "Napa 500", "Seclo 20mg", "Paracetamol syrup")
    else if (tokens.length > 1) {
      const allTokensInName = tokens.every((t) => pName.includes(t));
      const allTokensInNameOrGeneric = tokens.every((t) => pName.includes(t) || pGeneric.includes(t));
      const fullText = `${pName} ${pGeneric} ${pCategory} ${pUnit} ${pBatch}`;
      const allTokensInProduct = tokens.every((t) => fullText.includes(t));

      if (allTokensInName) {
        score = 550;
        matchType = 'hybrid';
      } else if (allTokensInNameOrGeneric) {
        score = 500;
        matchType = 'hybrid';
      } else if (allTokensInProduct) {
        score = 450;
        matchType = 'hybrid';
      }
    }
    // 6. Substring / Keyword Contains Match
    else if (pName.includes(cleanQuery)) {
      score = 350;
      matchType = 'contains';
    } else if (pGeneric && pGeneric.includes(cleanQuery)) {
      score = 300;
      matchType = 'generic';
    } else if (pCategory && pCategory.includes(cleanQuery)) {
      score = 250;
      matchType = 'contains';
    }

    // Only include matching items (no fuzzy noise or false positives)
    if (score > 0 && matchType) {
      // In-stock availability boost (+10)
      if ((p.stock ?? 0) > 0) {
        score += 10;
      }
      scoredResults.push({
        product: p,
        score,
        matchType,
      });
    }
  }

  // Sort by score descending, then alphabetically by name
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.name.localeCompare(b.product.name);
  });

  const products = scoredResults.slice(0, 20).map((item) => ({
    ...item.product,
    _matchType: item.matchType,
    _score: item.score,
  }));

  return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, barcode, category, generic, unitPrice, costPrice, stock, unit, image, batchNo, expiryDate } = body;

    if (!name || unitPrice === undefined || unitPrice === null) {
      return NextResponse.json(
        { error: 'Name and unitPrice are required' },
        { status: 400 }
      );
    }

    if (unitPrice < 0) {
      return NextResponse.json(
        { error: 'Unit price cannot be negative' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name,
        barcode: barcode || null,
        category: category || null,
        generic: generic || null,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        costPrice: costPrice !== undefined && costPrice !== null ? parseFloat(costPrice.toFixed(2)) : null,
        stock: stock !== undefined && stock !== null ? parseInt(stock, 10) : 0,
        unit: unit || 'pcs',
        image: image || null,
        batchNo: batchNo || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    if (message.includes('Unique')) {
      return NextResponse.json(
        { error: 'A product with this barcode already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
