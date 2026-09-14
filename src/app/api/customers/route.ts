import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const searchBy = searchParams.get('searchBy') || '';
  const all = searchParams.get('all');
  const id = searchParams.get('id');

  // Single customer details with purchase history
  if (id) {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { saleItems: true },
        },
      },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const totalPurchases = customer.sales.length;
    const totalSpent = customer.sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalDue = customer.sales.reduce((sum, s) => sum + (s.dueAmount > 0 ? s.dueAmount : 0), 0);
    const lastPurchase = customer.sales[0]?.createdAt || null;
    return NextResponse.json({
      ...customer,
      totalPurchases,
      totalSpent,
      totalDue,
      lastPurchase,
    });
  }

  // All customers with aggregated purchase summaries
  if (all === 'true') {
    const customers = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate sales data for all customers
    const salesByCustomer: any[] = await db.sale.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null } },
      _count: { id: true },
      _sum: { grandTotal: true, dueAmount: true },
      _max: { createdAt: true },
    }) as any[];

    const salesMap = new Map(salesByCustomer.map((s) => [s.customerId, s]));

    const enriched = customers.map((c) => {
      const agg = salesMap.get(c.id);
      return {
        ...c,
        totalPurchases: agg?._count.id || 0,
        totalSpent: agg?._sum.grandTotal || 0,
        totalDue: agg?._sum.dueAmount
          ? (agg._sum.dueAmount > 0 ? agg._sum.dueAmount : 0)
          : 0,
        lastPurchase: agg?._max.createdAt || null,
      };
    });

    return NextResponse.json(enriched);
  }

  // Search mode (Smart Multi-Field Hybrid Search)
  if (!search.trim()) {
    // No search query — return recent customers (limited)
    const recent = await db.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    return NextResponse.json(recent);
  }

  const cleanQuery = search.trim().toLowerCase();
  const digitsOnly = search.replace(/\D/g, '');
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  const allCustomers = await db.customer.findMany({
    orderBy: { createdAt: 'desc' },
  });

  interface ScoredCustomer {
    customer: typeof allCustomers[0];
    score: number;
    matchType: 'phone' | 'name' | 'email' | 'address';
  }

  const scored: ScoredCustomer[] = [];

  for (const c of allCustomers) {
    const cName = (c.name || '').toLowerCase();
    const cPhone = (c.phone || '').toLowerCase();
    const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
    const cEmail = (c.email || '').toLowerCase();
    const cAddress = (c.address || '').toLowerCase();

    let score = 0;
    let matchType: ScoredCustomer['matchType'] | null = null;

    // 1. Phone number match (normalized digits and formatted string)
    if (digitsOnly.length >= 3) {
      if (cPhoneDigits === digitsOnly) {
        score = 1000;
        matchType = 'phone';
      } else if (cPhoneDigits.endsWith(digitsOnly)) {
        // e.g. typing local 10-11 digits or last digits
        score = 900;
        matchType = 'phone';
      } else if (cPhoneDigits.startsWith(digitsOnly)) {
        // e.g. typing prefix 01711
        score = 850;
        matchType = 'phone';
      } else if (cPhoneDigits.includes(digitsOnly)) {
        score = 750;
        matchType = 'phone';
      }
    }

    // Direct phone string containment (for formats with dashes, etc.)
    if (score < 700 && cPhone.includes(cleanQuery)) {
      score = 700;
      matchType = 'phone';
    }

    // 2. Exact or Prefix Name Match
    if (cName === cleanQuery) {
      if (score < 950) {
        score = 950;
        matchType = 'name';
      }
    } else if (cName.startsWith(cleanQuery)) {
      if (score < 850) {
        score = 850;
        matchType = 'name';
      }
    }
    // 3. Multi-token name match (e.g. "Rahim Uddin", "Dr Hasan")
    else if (tokens.length > 1) {
      const allTokensInName = tokens.every((t) => cName.includes(t));
      if (allTokensInName && score < 750) {
        score = 750;
        matchType = 'name';
      }
    }
    // 4. Substring Name Match
    else if (cName.includes(cleanQuery)) {
      if (score < 600) {
        score = 600;
        matchType = 'name';
      }
    }

    // 5. Email or Address match
    if (score === 0) {
      if (cEmail && cEmail.includes(cleanQuery)) {
        score = 400;
        matchType = 'email';
      } else if (cAddress && cAddress.includes(cleanQuery)) {
        score = 350;
        matchType = 'address';
      }
    }

    if (score > 0 && matchType) {
      // Loyalty boost for active customers
      if ((c.loyaltyPoints ?? 0) > 0) {
        score += Math.min(20, (c.loyaltyPoints ?? 0));
      }
      scored.push({
        customer: c,
        score,
        matchType,
      });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.customer.name.localeCompare(b.customer.name);
  });

  const topCustomers = scored.slice(0, 15).map((item) => ({
    ...item.customer,
    _matchType: item.matchType,
    _score: item.score,
  }));

  return NextResponse.json(topCustomers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, address } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const existing = await db.customer.findUnique({
      where: { phone: phone.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this phone already exists' },
        { status: 409 }
      );
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Customer create error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
