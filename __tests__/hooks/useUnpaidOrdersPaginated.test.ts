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
const mockIsBackendExpired = jest.fn<(value: string | null) => boolean>();

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
  UNPAID_ORDER_STATUSES: ['pending'],
  UNPAID_PAYMENT_STATUSES: ['pending'],
  getOrdersOptimized: mockGetOrdersOptimized,
  isBackendExpired: (...args: unknown[]) => mockIsBackendExpired(args[0] as string | null),
}));

const { useUnpaidOrdersPaginated } = require('@/hooks/useUnpaidOrdersPaginated');

function createOrder(index: number, expiredAt: string | null = null): OrderListItem {
  return {
    id: `order-${index}`,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    expired_at: expiredAt,
    midtrans_order_id: `MID-${index}`,
    gross_amount: 10000 + index,
    total_amount: 10000 + index,
    courier_code: null,
    courier_service: null,
    payment_status: 'pending',
    status: 'pending',
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

describe('useUnpaidOrdersPaginated', () => {
  beforeEach(() => {
    clearDedupedRequests();
    mockRootState = { app: appReducer(undefined, { type: 'TEST_INIT' }) };
    mockDispatch.mockClear();
    mockGetOrdersOptimized.mockReset();
    mockIsBackendExpired.mockReset();
    mockIsBackendExpired.mockImplementation(value => value === 'expired');
  });

  it('filters expired cached orders from the rendered unpaid list', () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertUnpaidOrdersCachePage({
          userId: 'user-1',
          items: [createOrder(1, null), createOrder(2, 'expired')],
          offset: 0,
          hasMore: false,
          fetchedAt: Date.now(),
          payloadBytes: 200,
          durationMs: 50,
          replace: true,
        }),
      ),
    };

    const { result } = renderHook(() => useUnpaidOrdersPaginated('user-1'));

    expect((result.current.orders as OrderListItem[]).map(order => order.id)).toEqual(['order-1']);
  });

  it('requests unpaid orders with expired-pending exclusion', async () => {
    mockGetOrdersOptimized.mockResolvedValue({
      data: [createOrder(1)],
      error: null,
      metrics: createMetrics(false),
    });

    const { result } = renderHook(() => useUnpaidOrdersPaginated('user-1'));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });

    await waitFor(() => {
      expect(mockGetOrdersOptimized).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          excludeExpiredPending: true,
          orderStatuses: ['pending'],
          paymentStatuses: ['pending'],
        }),
      );
    });
  });

  it('revalidates stale unpaid cache only once when refreshIfNeeded is used from an effect', async () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertUnpaidOrdersCachePage({
          userId: 'user-1',
          items: [createOrder(1, null)],
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
      data: [createOrder(2, null)],
      error: null,
      metrics: createMetrics(false),
    });

    const useSceneLikeUnpaidOrders = () => {
      const result = useUnpaidOrdersPaginated('user-1');

      useEffect(() => {
        void result.refreshIfNeeded();
      }, [result.refreshIfNeeded]);

      return result;
    };

    const { result } = renderHook(() => useSceneLikeUnpaidOrders());

    await waitFor(() => {
      expect(result.current.orders[0]?.id).toBe('order-2');
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledTimes(1);
  });
});
