/**
 * Tiny in-memory TTL cache for GET API responses.
 * Safe for single-process dev/small deployments. Entries expire quickly,
 * and mutation endpoints can call invalidate() to bust stale data.
 */

interface CacheEntry {
  payload: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/** Max cached entries — prevents unbounded growth */
const MAX_ENTRIES = 100;

export const cacheGet = (key: string): unknown | undefined => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.payload;
};

export const cacheSet = (key: string, payload: unknown, ttlMs: number) => {
  if (store.size >= MAX_ENTRIES) {
    // Evict the oldest expired entry, or the first key if none expired
    const now = Date.now();
    let evicted = false;
    for (const [k, v] of store) {
      if (now > v.expiresAt) {
        store.delete(k);
        evicted = true;
        break;
      }
    }
    if (!evicted && store.size > 0) {
      store.delete(store.keys().next().value as string);
    }
  }
  store.set(key, { payload, expiresAt: Date.now() + ttlMs });
};

/** Invalidate keys starting with the given prefix (e.g. 'groups:', 'company:') */
export const cacheInvalidate = (prefix: string) => {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
