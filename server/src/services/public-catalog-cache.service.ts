/**
 * A small, process-local cache for public storefront data. These responses are
 * read frequently and change only when an administrator changes the catalog.
 * It intentionally stores plain response data (never Mongoose documents) and
 * is also safe to discard on a process restart.
 */
type CacheEntry<T> = { expiresAt: number; value: T };

const entries = new Map<string, CacheEntry<unknown>>();

export async function getPublicCatalogCache<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = entries.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await load();
  entries.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/** Call after a successful catalog, category, settings, or stock mutation. */
export function invalidatePublicCatalogCache(): void {
  entries.clear();
}
