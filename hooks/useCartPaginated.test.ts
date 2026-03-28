import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { UnknownAction } from '@reduxjs/toolkit';
import appReducer, { appActions } from '@/slices/app.slice';
import { CART_CACHE_TTL_MS, CART_PAGE_SIZE } from '@/constants/cart.constants';
import { getCartItemsOptimized, getOrCreateCart } from '@/services/cart.service';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';
import type { CartItemWithProduct, CartListItem, CartListResult, CartSnapshot } from '@/types/cart';

type AppSliceState = ReturnType<typeof appReducer>;
type TestRootState = { app: AppSliceState };

let mockRootState: TestRootState;

const mockDispatch = jest.fn((action: UnknownAction) => {
  mockRootState = {
    app: appReducer(mockRootState.app, action),
  };
  return action;
});

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: TestRootState) => unknown) => selector(mockRootState),
}));

jest.mock('@/services/cart.service', () => ({
  getCartItemsOptimized: jest.fn(),
  getOrCreateCart: jest.fn(),
}));

jest.mock('@/utils/requestDeduplication', () => ({
  runDedupedRequest: jest.fn(
    (_: string, executor: (signal: AbortSignal) => Promise<CartListResult>) =>
      executor({ aborted: false } as AbortSignal),
  ),
  cancelDedupedRequests: jest.fn(),
}));

const { useCartPaginated } = require('./useCartPaginated') as {
  useCartPaginated: (userId?: string) => {
    items: CartItemWithProduct[];
    snapshot: CartSnapshot;
    error: string | null;
    hasMore: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    isFetchingMore: boolean;
    isRevalidating: boolean;
    isUsingCachedData: boolean;
    refresh: () => Promise<void>;
    refreshIfNeeded: () => Promise<void>;
    loadMore: () => Promise<void>;
    metrics: {
      lastFetchDurationMs: number;
      lastPayloadBytes: number;
      cacheAgeMs: number | null;
    };
  };
};

const mockGetCartItemsOptimized = getCartItemsOptimized as jest.MockedFunction<
  typeof getCartItemsOptimized
>;
const mockGetOrCreateCart = getOrCreateCart as jest.MockedFunction<typeof getOrCreateCart>;
const mockRunDedupedRequest = runDedupedRequest as jest.MockedFunction<typeof runDedupedRequest>;
const mockCancelDedupedRequests = cancelDedupedRequests as jest.MockedFunction<
  typeof cancelDedupedRequests
>;

function reduceApp(action: UnknownAction) {
  mockRootState = {
    app: appReducer(mockRootState.app, action),
  };
}

function createCartListItem(index: number): CartListItem {
  return {
    id: `cart-item-${index}`,
    product_id: `product-${index}`,
    quantity: 1,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    product: {
      id: `product-${index}`,
      name: `Produk ${index}`,
      price: 10000 + index,
      stock: 10,
      weight: 200,
      slug: `produk-${index}`,
      is_active: true,
    },
    images: [{ id: `image-${index}`, url: `https://cdn.example.com/${index}.jpg` }],
  };
}

function createCartListItems(count: number, startIndex = 0): CartListItem[] {
  return Array.from({ length: count }, (_, index) => createCartListItem(startIndex + index));
}

function createCachedCartItem(index: number): CartItemWithProduct {
  return {
    id: `cached-cart-item-${index}`,
    cart_id: 'cart-1',
    product_id: `cached-product-${index}`,
    quantity: 1,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    product: {
      id: `cached-product-${index}`,
      name: `Cached Produk ${index}`,
      price: 9000 + index,
      stock: 10,
      weight: 100,
      slug: `cached-produk-${index}`,
      is_active: true,
    },
    images: [
      {
        id: `cached-image-${index}`,
        url: `https://cdn.example.com/cached-${index}.jpg`,
        sort_order: 0,
      },
    ],
  };
}

function createSnapshot(itemCount: number): CartSnapshot {
  return {
    itemCount,
    estimatedWeightGrams: itemCount * 200,
    packageValue: itemCount * 10000,
  };
}

function createResult(
  items: CartListItem[],
  overrides: Partial<{
    hasMore: boolean;
    fetchedAt: number;
    payloadBytes: number;
    durationMs: number;
    offset: number;
  }> = {},
): CartListResult {
  return {
    data: {
      items,
      snapshot: createSnapshot(items.length),
    },
    error: null,
    metrics: {
      durationMs: overrides.durationMs ?? 80,
      payloadBytes: overrides.payloadBytes ?? 1024,
      fetchedAt: overrides.fetchedAt ?? Date.now(),
      offset: overrides.offset ?? 0,
      limit: CART_PAGE_SIZE,
      hasMore: overrides.hasMore ?? true,
    },
  };
}

describe('useCartPaginated', () => {
  beforeEach(() => {
    mockRootState = { app: appReducer(undefined, { type: 'TEST_INIT' }) };
    mockDispatch.mockClear();
    mockGetCartItemsOptimized.mockReset();
    mockGetOrCreateCart.mockReset();
    mockRunDedupedRequest.mockReset();
    mockCancelDedupedRequests.mockReset();

    mockGetOrCreateCart.mockResolvedValue({
      data: { id: 'cart-1', user_id: 'user-1', created_at: new Date().toISOString() },
      error: null,
    });

    mockRunDedupedRequest.mockImplementation((_: string, executor) =>
      executor({ aborted: false } as AbortSignal),
    );
  });

  it('should return initial state when userId is undefined', () => {
    const { result } = renderHook(() => useCartPaginated(undefined));

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch cart on initial mount when no cache exists', async () => {
    const userId = 'user-1';
    const firstPage = createCartListItems(2);
    mockGetCartItemsOptimized.mockResolvedValue(createResult(firstPage, { hasMore: true }));

    const { result, rerender } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(mockGetCartItemsOptimized).toHaveBeenCalledWith(
      'cart-1',
      expect.objectContaining({ offset: 0, limit: CART_PAGE_SIZE }),
    );
    expect(result.current.snapshot.itemCount).toBe(2);
    expect(result.current.metrics.lastFetchDurationMs).toBe(80);
    expect(result.current.metrics.lastPayloadBytes).toBe(1024);
  });

  it('should use cached data when available and fresh', async () => {
    const userId = 'user-cache-fresh';

    reduceApp(
      appActions.upsertCartCachePage({
        userId,
        items: [createCachedCartItem(1), createCachedCartItem(2)],
        snapshot: createSnapshot(2),
        hasMore: true,
        offset: 0,
        fetchedAt: Date.now(),
        payloadBytes: 2048,
        durationMs: 50,
        replace: true,
      }),
    );

    const { result } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });

    expect(mockGetCartItemsOptimized).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]?.id).toBe('cached-cart-item-1');
  });

  it('should show stale data while revalidating', async () => {
    const userId = 'user-cache-stale';

    reduceApp(
      appActions.upsertCartCachePage({
        userId,
        items: [createCachedCartItem(1)],
        snapshot: createSnapshot(1),
        hasMore: true,
        offset: 0,
        fetchedAt: Date.now() - CART_CACHE_TTL_MS - 1000,
        payloadBytes: 1500,
        durationMs: 45,
        replace: true,
      }),
    );

    const freshItems = createCartListItems(1, 100);
    let resolveRequest: ((value: CartListResult) => void) | undefined;

    mockGetCartItemsOptimized.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        }),
    );

    const { result } = renderHook(() => useCartPaginated(userId));

    expect(result.current.items[0]?.id).toBe('cached-cart-item-1');
    expect(result.current.isUsingCachedData).toBe(true);

    let refreshPromise: Promise<void> | undefined;
    await act(async () => {
      refreshPromise = result.current.refreshIfNeeded();
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('cached-cart-item-1');
      expect(result.current.isRevalidating).toBe(true);
    });

    await act(async () => {
      resolveRequest?.(createResult(freshItems, { hasMore: false }));
      await refreshPromise;
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('cart-item-100');
      expect(result.current.isRevalidating).toBe(false);
    });
  });

  it('should dedupe concurrent requests', async () => {
    const userId = 'user-dedupe';
    const inFlight = new Map<string, Promise<unknown>>();

    mockRunDedupedRequest.mockImplementation(
      <T>(key: string, executor: (signal: AbortSignal) => Promise<T>) => {
        const existing = inFlight.get(key);
        if (existing) {
          return existing as Promise<T>;
        }

        const request = executor({ aborted: false } as AbortSignal).finally(() => {
          inFlight.delete(key);
        });

        inFlight.set(key, request as Promise<unknown>);
        return request;
      },
    );

    let resolveRequest: ((value: CartListResult) => void) | undefined;
    mockGetCartItemsOptimized.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        }),
    );

    const first = renderHook(() => useCartPaginated(userId));
    const second = renderHook(() => useCartPaginated(userId));

    let refreshPromises: [Promise<void>, Promise<void>] | undefined;
    await act(async () => {
      refreshPromises = [
        first.result.current.refreshIfNeeded(),
        second.result.current.refreshIfNeeded(),
      ];
    });

    await act(async () => {
      resolveRequest?.(createResult(createCartListItems(2), { hasMore: true }));
      await Promise.all(refreshPromises ?? []);
    });

    await waitFor(() => {
      expect(first.result.current.items).toHaveLength(2);
      expect(second.result.current.items).toHaveLength(2);
    });

    expect(mockGetCartItemsOptimized).toHaveBeenCalledTimes(1);
  });

  it('should refresh data when refresh is called', async () => {
    const userId = 'user-refresh';

    mockGetCartItemsOptimized
      .mockResolvedValueOnce(createResult(createCartListItems(1), { hasMore: true }))
      .mockResolvedValueOnce(createResult(createCartListItems(1, 200), { hasMore: false }));

    const { result, rerender } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});
    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('cart-item-0');
    });

    await act(async () => {
      await result.current.refresh();
    });
    rerender({});

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('cart-item-200');
    });

    expect(mockGetCartItemsOptimized).toHaveBeenCalledTimes(2);
    expect(mockRootState.app.cartCache[userId]?.items[0]?.id).toBe('cart-item-200');
  });

  it('should load more items when loadMore is called', async () => {
    const userId = 'user-pagination';

    mockGetCartItemsOptimized
      .mockResolvedValueOnce(createResult(createCartListItems(20), { hasMore: true, offset: 0 }))
      .mockResolvedValueOnce(
        createResult(createCartListItems(20, 20), { hasMore: false, offset: 20 }),
      );

    const { result, rerender } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});
    await waitFor(() => {
      expect(result.current.items).toHaveLength(20);
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });
    rerender({});

    await waitFor(() => {
      expect(result.current.items).toHaveLength(40);
      expect(result.current.hasMore).toBe(false);
    });

    expect(mockGetCartItemsOptimized).toHaveBeenNthCalledWith(
      2,
      'cart-1',
      expect.objectContaining({ offset: 20, limit: CART_PAGE_SIZE }),
    );
  });

  it('should handle fetch errors gracefully', async () => {
    const userId = 'user-error';

    mockGetCartItemsOptimized.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
      metrics: null,
    });

    const { result } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.items).toEqual([]);
    });
  });

  it('should preserve stale items on error', async () => {
    const userId = 'user-stale-error';

    reduceApp(
      appActions.upsertCartCachePage({
        userId,
        items: [createCachedCartItem(1)],
        snapshot: createSnapshot(1),
        hasMore: false,
        offset: 0,
        fetchedAt: Date.now() - CART_CACHE_TTL_MS - 500,
        payloadBytes: 1024,
        durationMs: 20,
        replace: true,
      }),
    );

    mockGetCartItemsOptimized.mockResolvedValue({
      data: null,
      error: new Error('Refresh failed'),
      metrics: null,
    });

    const { result } = renderHook(() => useCartPaginated(userId));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.id).toBe('cached-cart-item-1');
      expect(result.current.error).toBe('Refresh failed');
    });
  });
});
