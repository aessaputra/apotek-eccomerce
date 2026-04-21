import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { UnknownAction } from '@reduxjs/toolkit';
import appReducer, { appActions } from '@/slices/app.slice';
import type { User } from '@/types';
import type { GetUserOrdersParams, OrderListItem, OrderListResult } from '@/services/order.service';
import { clearDedupedRequests } from '@/utils/requestDeduplication';

const ORDERS_PAGE_SIZE = 20;
const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

type AppSliceState = ReturnType<typeof appReducer>;
type TestRootState = { app: AppSliceState };

let mockRootState: TestRootState;

const mockDispatch = jest.fn((action: UnknownAction) => {
  mockRootState = {
    app: appReducer(mockRootState.app, action),
  };

  return action;
});

const mockGetOrdersOptimized = jest.fn() as jest.MockedFunction<
  (userId: string, params?: GetUserOrdersParams) => Promise<OrderListResult>
>;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: TestRootState) => unknown) => selector(mockRootState),
}));

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));

jest.mock('@/services', () => {
  return {
    __esModule: true,
    ORDERS_PAGE_SIZE,
    ORDERS_CACHE_TTL_MS,
    getOrdersOptimized: mockGetOrdersOptimized,
  };
});

const { useOrdersPaginated } = require('@/hooks/useOrdersPaginated');

function createUser(): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    full_name: 'Test User',
    phone_number: null,
    avatar_url: null,
    role: 'customer',
  };
}

function createOrder(index: number): OrderListItem {
  return {
    id: `order-${index}`,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    expired_at: null,
    midtrans_order_id: `MID-${index}`,
    gross_amount: 10000 + index,
    total_amount: 10000 + index,
    courier_code: index % 2 === 0 ? 'jne' : null,
    courier_service: index % 2 === 0 ? 'same-day' : null,
    payment_status: 'settlement',
    status: 'processing',
    order_items: [
      {
        id: `order-item-${index}`,
        order_id: `order-${index}`,
        product_id: `product-${index}`,
        quantity: 1,
        price_at_purchase: 10000 + index,
        products: {
          id: `product-${index}`,
          name: `Produk ${index}`,
          slug: `produk-${index}`,
        },
      },
    ],
  };
}

function createOrders(count: number, startIndex = 0): OrderListItem[] {
  return Array.from({ length: count }, (_, index) => createOrder(startIndex + index));
}

function createMetrics(
  overrides: Partial<{
    fetchedAt: number;
    hasMore: boolean;
    payloadBytes: number;
    durationMs: number;
  }> = {},
) {
  return {
    durationMs: overrides.durationMs ?? 120,
    payloadBytes: overrides.payloadBytes ?? 4096,
    fetchedAt: overrides.fetchedAt ?? Date.now(),
    offset: 0,
    limit: ORDERS_PAGE_SIZE,
    hasMore: overrides.hasMore ?? true,
  };
}

describe('useOrdersPaginated', () => {
  beforeEach(() => {
    clearDedupedRequests();
    mockRootState = { app: appReducer(undefined, { type: 'TEST_INIT' }) };
    mockDispatch.mockClear();
    mockGetOrdersOptimized.mockReset();
  });

  test('uses fresh cached orders without refetching', async () => {
    const user = createUser();
    const cachedOrders = createOrders(20);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersCachePage({
          userId: user.id,
          items: cachedOrders,
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now(),
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    const { result, rerender } = renderHook(() => useOrdersPaginated(user.id));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    expect(mockGetOrdersOptimized).not.toHaveBeenCalled();
    expect(result.current.orders).toHaveLength(20);
    expect(result.current.isUsingCachedData).toBe(true);
  });

  test('revalidates stale cached orders and replaces the cache', async () => {
    const user = createUser();
    const staleOrders = createOrders(20);
    const freshOrders = createOrders(20, 100);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersCachePage({
          userId: user.id,
          items: staleOrders,
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now() - ORDERS_CACHE_TTL_MS - 1000,
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    mockGetOrdersOptimized.mockResolvedValue({
      data: freshOrders,
      error: null,
      metrics: createMetrics({ fetchedAt: Date.now(), payloadBytes: 1024 }),
    });

    const { result, rerender } = renderHook(() => useOrdersPaginated(user.id));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
    expect(mockRootState.app.ordersCache[user.id]?.items[0]?.id).toBe('order-100');
    expect(result.current.orders[0]?.id).toBe('order-100');
  });

  test('dedupes duplicate loadMore calls and appends the next page', async () => {
    const user = createUser();
    const firstPage = createOrders(20);
    const secondPage = createOrders(20, 20);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };

    let resolveSecondPage:
      | ((value: OrderListResult | PromiseLike<OrderListResult>) => void)
      | null = null;

    mockGetOrdersOptimized
      .mockResolvedValueOnce({
        data: firstPage,
        error: null,
        metrics: createMetrics({ hasMore: true, payloadBytes: 2000 }),
      })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecondPage = resolve;
          }),
      );

    const { result, rerender } = renderHook(() => useOrdersPaginated(user.id));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    await act(async () => {
      const firstLoadMore = result.current.loadMore();
      const secondLoadMore = result.current.loadMore();

      resolveSecondPage?.({
        data: secondPage,
        error: null,
        metrics: createMetrics({ hasMore: true, payloadBytes: 2100 }),
      });

      await Promise.all([firstLoadMore, secondLoadMore]);
    });
    rerender({});

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(2);
    expect(mockRootState.app.ordersCache[user.id]?.items).toHaveLength(40);
    expect(mockRootState.app.ordersCache[user.id]?.items[0]?.id).toBe('order-39');
  });

  test('refresh invalidates cached data and replaces it with the newest page', async () => {
    const user = createUser();
    const cachedOrders = createOrders(20);
    const refreshedOrders = createOrders(20, 200);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersCachePage({
          userId: user.id,
          items: cachedOrders,
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now(),
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    mockGetOrdersOptimized.mockResolvedValue({
      data: refreshedOrders,
      error: null,
      metrics: createMetrics({ fetchedAt: Date.now(), hasMore: false, payloadBytes: 1024 }),
    });

    const { result, rerender } = renderHook(() => useOrdersPaginated(user.id));

    await act(async () => {
      await result.current.refresh();
    });
    rerender({});

    await waitFor(() => {
      expect(mockRootState.app.ordersCache[user.id]?.items[0]?.id).toBe('order-200');
    });

    expect(mockRootState.app.ordersCache[user.id]?.hasMore).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
  });

  test('does not request another page when the last full page reports hasMore false', async () => {
    const user = createUser();
    const firstPage = createOrders(20);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };

    mockGetOrdersOptimized.mockResolvedValue({
      data: firstPage,
      error: null,
      metrics: createMetrics({ hasMore: false, payloadBytes: 1500 }),
    });

    const { result, rerender } = renderHook(() => useOrdersPaginated(user.id));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
    expect(result.current.hasMore).toBe(false);
  });

  test('revalidates stale cache only once when refreshIfNeeded is called from an effect', async () => {
    const user = createUser();
    const staleOrders = createOrders(20);
    const freshOrders = createOrders(20, 100);

    mockRootState = {
      app: appReducer(mockRootState.app, appActions.setUser(user)),
    };
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersCachePage({
          userId: user.id,
          items: staleOrders,
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now() - ORDERS_CACHE_TTL_MS - 1000,
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    mockGetOrdersOptimized.mockResolvedValue({
      data: freshOrders,
      error: null,
      metrics: createMetrics({ fetchedAt: Date.now(), payloadBytes: 1024 }),
    });

    const useSceneLikeOrders = () => {
      const result = useOrdersPaginated(user.id);

      useEffect(() => {
        void result.refreshIfNeeded();
      }, [result.refreshIfNeeded]);

      return result;
    };

    const { result } = renderHook(() => useSceneLikeOrders());

    await waitFor(() => {
      expect(result.current.orders[0]?.id).toBe('order-100');
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
  });
});
