import { db } from '@/lib/accounting-db';

/**
 * Record an audit trail entry.
 * Snapshots are stored as JSON strings; keep them small (omit bulky relation data).
 */
export async function auditLog(opts: {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const slim = (v: unknown) => {
      if (v === undefined || v === null) return null;
      try {
        return JSON.stringify(v);
      } catch {
        return null;
      }
    };
    await db.auditLog.create({
      data: {
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        entityName: opts.entityName ?? '',
        description: opts.description ?? '',
        before: slim(opts.before),
        after: slim(opts.after),
      },
    });
  } catch (err) {
    // Never let audit failures break the main operation
    console.error('[audit] failed to record:', err instanceof Error ? err.message : err);
  }
}
