import { useCallback, useEffect, useRef, useState } from 'react';

import type { CursorPage } from '../types/post';

export type { CursorPage } from '../types/post';

export interface UseInfiniteListOptions<T> {
  cacheKey: string;
  enabled?: boolean;
  pageSize?: number;
  staleTimeMs?: number;
  fetchPage: (cursor: string | null, pageSize: number) => Promise<CursorPage<T>>;
  keyExtractor: (item: T) => string;
}

interface CacheEntry<T> extends CursorPage<T> {
  cachedAt: number;
}

const PAGE_CACHE = new Map<string, CacheEntry<unknown>>();
const MAX_CACHED_FEEDS = 12;

function saveFirstPage<T>(key: string, page: CursorPage<T>) {
  PAGE_CACHE.delete(key);
  PAGE_CACHE.set(key, { ...page, cachedAt: Date.now() });
  if (PAGE_CACHE.size > MAX_CACHED_FEEDS) {
    const oldestKey = PAGE_CACHE.keys().next().value;
    if (oldestKey) PAGE_CACHE.delete(oldestKey);
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
  staleTimeMs = 30_000,
  fetchPage,
  keyExtractor,
}: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef(0);
  const loadingMoreRef = useRef(false);

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
        if (cached) {
          setItems(cached.items);
          setNextCursor(cached.nextCursor);
          setHasMore(cached.hasMore);
        } else {
          setItems([]);
          setNextCursor(null);
          setHasMore(false);
        }

        if (cacheIsFresh) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        setLoading(!cached);
        setRefreshing(Boolean(cached));
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
            setError(
              cause instanceof Error ? cause.message : 'Unable to load items.',
            );
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
      setItems((current) => uniqueItems(current, page.items, keyExtractor));
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
  }, [enabled, fetchPage, hasMore, keyExtractor, nextCursor, pageSize]);

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
