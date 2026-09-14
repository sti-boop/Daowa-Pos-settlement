import { db } from '@/lib/accounting-db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const cursor = searchParams.get('cursor'); // createdAt of the last row of the previous page
    const take = Math.min(parseInt(searchParams.get('take') || '50', 10) || 50, 200);

    // Base filters (action/entity/date-range) — used for both page query and count
    const baseWhere: Record<string, unknown> = {};
    if (action && action !== 'all') baseWhere.action = action;
    if (entityType && entityType !== 'all') baseWhere.entityType = entityType;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from + 'T00:00:00.000Z');
      if (to) createdAt.lte = new Date(to + 'T23:59:59.999Z');
      baseWhere.createdAt = createdAt;
    }

    // Page query additionally constrained by cursor (createdAt < cursor)
    const pageWhere: Record<string, unknown> = { ...baseWhere };
    if (cursor) {
      pageWhere.createdAt = { ...(baseWhere.createdAt as object || {}), lt: new Date(cursor) };
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: pageWhere,
        orderBy: { createdAt: 'desc' },
        take: take + 1, // fetch one extra to detect next page
      }),
      db.auditLog.count({ where: baseWhere }),
    ]);

    const hasMore = logs.length > take;
    const page = hasMore ? logs.slice(0, take) : logs;
    const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({
      logs: page,
      total,
      hasMore,
      nextCursor,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
