import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  prependCachedFeedItem,
  useInfiniteList,
} from '../src/hooks/useInfiniteList';
import type { CursorPage } from '../src/types/post';

interface Item {
  id: string;
}

describe('useInfiniteList', () => {
  it('loads cursor pages and removes duplicate items by key', async () => {
    const fetchPage = jest.fn(
      async (cursor: string | null, _pageSize: number): Promise<CursorPage<Item>> =>
        cursor === null
          ? {
              items: [{ id: 'one' }, { id: 'two' }],
              nextCursor: 'next-page',
              hasMore: true,
            }
          : {
              items: [{ id: 'two' }, { id: 'three' }],
              nextCursor: null,
              hasMore: false,
            },
    );
    const cacheKey = `pagination-test-${Date.now()}`;
    const { result } = await renderHook(() =>
      useInfiniteList({
        cacheKey,
        fetchPage,
        keyExtractor: (item: Item) => item.id,
        pageSize: 2,
      }),
    );

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items.map((item) => item.id)).toEqual([
      'one',
      'two',
      'three',
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('immediately reflects prepended items in mounted feeds without requiring a manual refresh', async () => {
    const fetchPage = jest.fn(
      async (): Promise<CursorPage<Item>> => ({
        items: [{ id: 'existing-1' }],
        nextCursor: null,
        hasMore: false,
      }),
    );
    const cacheKey = `marketplace-posts:Semua area:all`;
    const { result } = await renderHook(() =>
      useInfiniteList({
        cacheKey,
        fetchPage,
        keyExtractor: (item: Item) => item.id,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      prependCachedFeedItem<Item>(
        (key) => key.startsWith('marketplace-posts:'),
        { id: 'new-post-from-profile' },
        (item) => item.id,
      );
    });

    expect(result.current.items.map((item) => item.id)).toEqual([
      'new-post-from-profile',
      'existing-1',
    ]);
    expect(result.current.refreshing).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
