import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import type { UnknownAction } from '@reduxjs/toolkit';
import appReducer, { appActions } from '@/slices/app.slice';
import { clearDedupedRequests } from '@/utils/requestDeduplication';
import type { GetUserOrdersParams, OrderListItem, OrderListResult } from '@/services/order.service';

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

jest.mock('@/services', () => ({
  __esModule: true,
  ORDERS_PAGE_SIZE,
  ORDERS_CACHE_TTL_MS,
  getOrdersOptimized: mockGetOrdersOptimized,
}));

const { useOrdersByStatusPaginated } = require('@/hooks/useOrdersByStatusPaginated');

function createOrder(index: number): OrderListItem {
  return {
    id: `order-${index}`,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    expired_at: null,
    midtrans_order_id: `MID-${index}`,
    gross_amount: 10000 + index,
    total_amount: 10000 + index,
    courier_code: 'jne',
    courier_service: 'reg',
    payment_status: 'settlement',
    status: 'processing',
    customer_completion_stage: 'not_applicable',
    customer_order_bucket: 'packing',
    order_items: [],
  };
}

function createMetrics(hasMore = true) {
  return {
    durationMs: 120,
    payloadBytes: 4096,
    fetchedAt: Date.now(),
    offset: 0,
    limit: ORDERS_PAGE_SIZE,
    hasMore,
  };
}

describe('useOrdersByStatusPaginated', () => {
  beforeEach(() => {
    clearDedupedRequests();
    mockRootState = { app: appReducer(undefined, { type: 'TEST_INIT' }) };
    mockDispatch.mockClear();
    mockGetOrdersOptimized.mockReset();
  });

  it('fetches orders with the provided status filters and stores them in the selected cache bucket', async () => {
    mockGetOrdersOptimized.mockResolvedValue({
      data: [createOrder(1)],
      error: null,
      metrics: createMetrics(false),
    });

    const { result } = renderHook(() =>
      useOrdersByStatusPaginated({
        userId: 'user-1',
        cacheKey: 'packing',
        orderStatuses: ['processing'],
        paymentStatuses: ['settlement'],
        customerOrderBucket: 'packing',
      }),
    );

    await act(async () => {
      await result.current.refreshIfNeeded();
    });

    await waitFor(() => {
      expect(mockGetOrdersOptimized).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          orderStatuses: ['processing'],
          paymentStatuses: ['settlement'],
          customerOrderBucket: 'packing',
        }),
      );
    });

    expect(mockRootState.app.ordersByStatusCache.packing['user-1']?.items[0]?.id).toBe('order-1');
  });

  it('reuses fresh cached data without fetching again', async () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersByStatusCachePage({
          cacheKey: 'completed',
          userId: 'user-1',
          items: [createOrder(1)],
          offset: 0,
          hasMore: false,
          fetchedAt: Date.now(),
          payloadBytes: 200,
          durationMs: 50,
          replace: true,
        }),
      ),
    };

    const { result } = renderHook(() =>
      useOrdersByStatusPaginated({
        userId: 'user-1',
        cacheKey: 'completed',
        customerOrderBucket: 'completed',
      }),
    );

    await act(async () => {
      await result.current.refreshIfNeeded();
    });

    expect(mockGetOrdersOptimized).not.toHaveBeenCalled();
    expect(result.current.orders[0]?.id).toBe('order-1');
  });

  it('does not retrigger initial fetches when refreshIfNeeded is used from an effect', async () => {
    mockGetOrdersOptimized.mockResolvedValue({
      data: [createOrder(1)],
      error: null,
      metrics: createMetrics(false),
    });

    const useSceneLikePackingOrders = () => {
      const result = useOrdersByStatusPaginated({
        userId: 'user-1',
        cacheKey: 'packing',
        orderStatuses: ['processing'],
        customerOrderBucket: 'packing',
      });

      useEffect(() => {
        void result.refreshIfNeeded();
      }, [result.refreshIfNeeded]);

      return result;
    };

    const { result } = renderHook(() => useSceneLikePackingOrders());

    await waitFor(() => {
      expect(result.current.orders[0]?.id).toBe('order-1');
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
  });

  it('revalidates stale cache only once when refreshIfNeeded is used from an effect', async () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertOrdersByStatusCachePage({
          cacheKey: 'packing',
          userId: 'user-1',
          items: [createOrder(1)],
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now() - ORDERS_CACHE_TTL_MS - 1000,
          payloadBytes: 200,
          durationMs: 50,
          replace: true,
        }),
      ),
    };

    mockGetOrdersOptimized.mockResolvedValue({
      data: [createOrder(2)],
      error: null,
      metrics: createMetrics(false),
    });

    const useSceneLikePackingOrders = () => {
      const result = useOrdersByStatusPaginated({
        userId: 'user-1',
        cacheKey: 'packing',
        orderStatuses: ['processing'],
        customerOrderBucket: 'packing',
      });

      useEffect(() => {
        void result.refreshIfNeeded();
      }, [result.refreshIfNeeded]);

      return result;
    };

    const { result } = renderHook(() => useSceneLikePackingOrders());

    await waitFor(() => {
      expect(result.current.orders[0]?.id).toBe('order-2');
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
  });
});
