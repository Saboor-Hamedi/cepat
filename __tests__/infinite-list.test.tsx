import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useInfiniteList } from '../src/hooks/useInfiniteList';
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
});
