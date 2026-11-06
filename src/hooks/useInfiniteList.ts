import { useCallback, useEffect, useRef, useState } from 'react';

import type { CursorPage } from '../types/post';

export type { CursorPage } from '../types/post';

export interface UseInfiniteListOptions<T> {
  cacheKey: string;
  enabled?: boolean;
  pageSize?: number;
  staleTimeMs?: number;
  initialData?: () => CursorPage<T> | null;
  fetchPage: (cursor: string | null, pageSize: number) => Promise<CursorPage<T>>;
  keyExtractor: (item: T) => string;
}

interface CacheEntry<T> extends CursorPage<T> {
  cachedAt: number;
}

const PAGE_CACHE = new Map<string, CacheEntry<unknown>>();
const MAX_CACHED_FEEDS = 24;

type CacheListener = (cacheKey: string, action: 'sync' | 'revalidate') => void;
const CACHE_LISTENERS = new Set<CacheListener>();

function notifyCacheListeners(cacheKey: string, action: 'sync' | 'revalidate') {
  for (const listener of CACHE_LISTENERS) {
    listener(cacheKey, action);
  }
}

function saveFirstPage<T>(key: string, page: CursorPage<T>) {
  PAGE_CACHE.delete(key);
  PAGE_CACHE.set(key, { ...page, cachedAt: Date.now() });
  if (PAGE_CACHE.size > MAX_CACHED_FEEDS) {
    const oldestKey = PAGE_CACHE.keys().next().value;
    if (oldestKey) PAGE_CACHE.delete(oldestKey);
  }
}

/**
 * Prepends an item to all cached feeds whose key satisfies `predicate`,
 * immediately updating any mounted `useInfiniteList` instances without a reload spinner.
 */
export function prependCachedFeedItem<T>(
  predicate: (cacheKey: string) => boolean,
  item: T,
  keyExtractor: (item: T) => string,
): void {
  const targetId = keyExtractor(item);
  for (const [key, rawEntry] of PAGE_CACHE.entries()) {
    if (!predicate(key)) continue;
    const entry = rawEntry as CacheEntry<T>;
    const filtered = entry.items.filter((existing) => keyExtractor(existing) !== targetId);
    const updated: CacheEntry<T> = {
      ...entry,
      items: [item, ...filtered],
      cachedAt: Date.now(),
    };
    PAGE_CACHE.set(key, updated);
    notifyCacheListeners(key, 'sync');
  }
}

/**
 * Updates matching items in-place across all cached feeds whose key satisfies `predicate`.
 * When `options.silent` is true, mutates the in-memory cache for future mounts without
 * triggering a full parent list re-render.
 */
export function updateCachedFeedItem<T>(
  predicate: (cacheKey: string) => boolean,
  matcher: (item: T) => boolean,
  updater: (item: T) => T,
  options?: { silent?: boolean },
): void {
  for (const [key, rawEntry] of PAGE_CACHE.entries()) {
    if (!predicate(key)) continue;
    const entry = rawEntry as CacheEntry<T>;
    let changed = false;
    const nextItems = entry.items.map((item) => {
      if (matcher(item)) {
        changed = true;
        return updater(item);
      }
      return item;
    });
    if (changed) {
      PAGE_CACHE.set(key, {
        ...entry,
        items: nextItems,
        cachedAt: Date.now(),
      });
      if (!options?.silent) {
        notifyCacheListeners(key, 'sync');
      }
    }
  }
}

/**
 * Removes matching items from all cached feeds whose key satisfies `predicate`.
 */
export function removeCachedFeedItem<T>(
  predicate: (cacheKey: string) => boolean,
  matcher: (item: T) => boolean,
): void {
  for (const [key, rawEntry] of PAGE_CACHE.entries()) {
    if (!predicate(key)) continue;
    const entry = rawEntry as CacheEntry<T>;
    const nextItems = entry.items.filter((item) => !matcher(item));
    if (nextItems.length !== entry.items.length) {
      PAGE_CACHE.set(key, {
        ...entry,
        items: nextItems,
        cachedAt: Date.now(),
      });
      notifyCacheListeners(key, 'sync');
    }
  }
}

/**
 * Marks matching cached feeds as stale and triggers silent revalidation on active hooks.
 */
export function invalidateCachedFeeds(
  predicate: (cacheKey: string) => boolean = () => true,
): void {
  for (const [key, rawEntry] of PAGE_CACHE.entries()) {
    if (!predicate(key)) continue;
    PAGE_CACHE.set(key, {
      ...rawEntry,
      cachedAt: 0,
    });
    notifyCacheListeners(key, 'revalidate');
  }
}

function uniqueItems<T>(
  current: T[],
  incoming: T[],
  keyExtractor: (item: T) => string,
): T[] {
  const seen = new Set(current.map(keyExtractor));
  return [
    ...current,
    ...incoming.filter((item) => {
      const key = keyExtractor(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}

export function useInfiniteList<T>({
  cacheKey,
  enabled = true,
  pageSize = 20,
  staleTimeMs = 300_000,
  initialData,
  fetchPage,
  keyExtractor,
}: UseInfiniteListOptions<T>) {
  const initialDataRef = useRef(initialData);
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  const [seedState] = useState<{
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
    loading: boolean;
  }>(() => {
    if (!enabled) {
      return { items: [], nextCursor: null, hasMore: false, loading: false };
    }
    const cached = PAGE_CACHE.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached) {
      return {
        items: cached.items as T[],
        nextCursor: cached.nextCursor,
        hasMore: cached.hasMore,
        loading: false,
      };
    }
    const syncSeed = initialData?.() ?? null;
    if (syncSeed && syncSeed.items.length > 0) {
      return {
        items: syncSeed.items,
        nextCursor: syncSeed.nextCursor,
        hasMore: syncSeed.hasMore,
        loading: false,
      };
    }
    return { items: [], nextCursor: null, hasMore: false, loading: true };
  });

  const [items, setItems] = useState<T[]>(seedState.items);
  const [nextCursor, setNextCursor] = useState<string | null>(seedState.nextCursor);
  const [hasMore, setHasMore] = useState<boolean>(seedState.hasMore);
  const [loading, setLoading] = useState<boolean>(seedState.loading);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef(0);
  const loadingMoreRef = useRef(false);

  // Subscribe to in-memory cache updates (e.g., new post created on profile/compose, like toggled, post edited/deleted)
  useEffect(() => {
    if (!enabled) return;
    const listener: CacheListener = (updatedKey, action) => {
      if (updatedKey !== cacheKey) return;
      const cached = PAGE_CACHE.get(cacheKey) as CacheEntry<T> | undefined;
      if (cached && action === 'sync') {
        setItems(cached.items);
        setNextCursor(cached.nextCursor);
        setHasMore(cached.hasMore);
        setLoading(false);
      } else if (action === 'revalidate') {
        const requestId = ++activeRequest.current;
        void fetchPage(null, pageSize)
          .then((page) => {
            if (activeRequest.current !== requestId) return;
            saveFirstPage(cacheKey, page);
            setItems(page.items);
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
            setError(null);
          })
          .catch(() => {
            // Preserve existing items on silent revalidation error
          });
      }
    };
    CACHE_LISTENERS.add(listener);
    return () => {
      CACHE_LISTENERS.delete(listener);
    };
  }, [cacheKey, enabled, fetchPage, pageSize]);

  useEffect(() => {
    const requestId = ++activeRequest.current;
    loadingMoreRef.current = false;
    void Promise.resolve()
      .then(() => {
        if (activeRequest.current !== requestId) return;
        setLoadingMore(false);
        setError(null);
        if (!enabled) {
          setItems([]);
          setNextCursor(null);
          setHasMore(false);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const cached = PAGE_CACHE.get(cacheKey) as CacheEntry<T> | undefined;
        const cacheIsFresh = Boolean(
          cached && Date.now() - cached.cachedAt < staleTimeMs,
        );
        const syncSeed = !cached ? (initialDataRef.current?.() ?? null) : null;
        if (cached) {
          setItems(cached.items);
          setNextCursor(cached.nextCursor);
          setHasMore(cached.hasMore);
          setLoading(false);
          setRefreshing(false);
        } else if (syncSeed && syncSeed.items.length > 0) {
          setItems(syncSeed.items);
          setNextCursor(syncSeed.nextCursor);
          setHasMore(syncSeed.hasMore);
          setLoading(false);
          setRefreshing(false);
        } else {
          setNextCursor(null);
          setHasMore(false);
        }

        if (cacheIsFresh) {
          return;
        }

        if (!cached && (!syncSeed || syncSeed.items.length === 0)) {
          setLoading(true);
        }
        return fetchPage(null, pageSize)
          .then((page) => {
            if (activeRequest.current !== requestId) return;
            saveFirstPage(cacheKey, page);
            setItems(page.items);
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
            setError(null);
          })
          .catch((cause: unknown) => {
            if (activeRequest.current !== requestId) return;
            if (!cached && (!syncSeed || syncSeed.items.length === 0)) {
              setError(
                cause instanceof Error ? cause.message : 'Unable to load items.',
              );
            }
          })
          .finally(() => {
            if (activeRequest.current === requestId) {
              setLoading(false);
              setRefreshing(false);
            }
          });
      })
      .catch((cause: unknown) => {
        if (activeRequest.current === requestId) {
          setError(cause instanceof Error ? cause.message : 'Unable to load items.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      if (activeRequest.current === requestId) activeRequest.current += 1;
    };
  }, [cacheKey, enabled, fetchPage, pageSize, staleTimeMs]);

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const requestId = activeRequest.current;
    try {
      const page = await fetchPage(nextCursor, pageSize);
      if (activeRequest.current !== requestId) return;
      setItems((current) => {
        const merged = uniqueItems(current, page.items, keyExtractor);
        const existingCache = PAGE_CACHE.get(cacheKey) as CacheEntry<T> | undefined;
        if (existingCache) {
          PAGE_CACHE.set(cacheKey, {
            items: merged,
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            cachedAt: existingCache.cachedAt,
          });
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (cause: unknown) {
      if (activeRequest.current === requestId) {
        setError(cause instanceof Error ? cause.message : 'Unable to load more items.');
      }
    } finally {
      if (activeRequest.current === requestId) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [cacheKey, enabled, fetchPage, hasMore, keyExtractor, nextCursor, pageSize]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const requestId = ++activeRequest.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setRefreshing(true);
    setError(null);
    try {
      const page = await fetchPage(null, pageSize);
      if (activeRequest.current !== requestId) return;
      saveFirstPage(cacheKey, page);
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (cause: unknown) {
      if (activeRequest.current === requestId) {
        setError(cause instanceof Error ? cause.message : 'Unable to refresh items.');
      }
    } finally {
      if (activeRequest.current === requestId) setRefreshing(false);
    }
  }, [cacheKey, enabled, fetchPage, pageSize]);

  return {
    items,
    hasMore,
    loading,
    loadingMore,
    refreshing,
    error,
    loadMore,
    refresh,
  };
}
