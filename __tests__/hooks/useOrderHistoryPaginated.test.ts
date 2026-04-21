import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { GetUserOrdersParams, OrderListItem, OrderListResult } from '@/services/order.service';
import { clearDedupedRequests } from '@/utils/requestDeduplication';

const ORDERS_PAGE_SIZE = 20;
const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

const mockGetOrdersOptimized = jest.fn() as jest.MockedFunction<
  (userId: string, params?: GetUserOrdersParams) => Promise<OrderListResult>
>;

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));

jest.mock('@/services', () => ({
  __esModule: true,
  ORDERS_PAGE_SIZE,
  ORDERS_CACHE_TTL_MS,
  HISTORY_PAYMENT_STATUSES: ['expire', 'cancel', 'deny'],
  getOrdersOptimized: mockGetOrdersOptimized,
}));

const { useOrderHistoryPaginated } = require('@/hooks/useOrderHistoryPaginated');

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
    payment_status: 'expire',
    status: 'pending',
    order_items: [],
  };
}

function createMetrics(hasMore = true, offset = 0) {
  return {
    durationMs: 120,
    payloadBytes: 4096,
    fetchedAt: Date.now(),
    offset,
    limit: ORDERS_PAGE_SIZE,
    hasMore,
  };
}

describe('useOrderHistoryPaginated', () => {
  beforeEach(() => {
    clearDedupedRequests();
    mockGetOrdersOptimized.mockReset();
  });

  it('loads history with expired-pending inclusion on first fetch', async () => {
    mockGetOrdersOptimized.mockResolvedValue({
      data: [createOrder(1)],
      error: null,
      metrics: createMetrics(false),
    });

    const { result } = renderHook(() => useOrderHistoryPaginated('user-1'));

    await waitFor(() => {
      expect(result.current.orders[0]?.id).toBe('order-1');
    });

    expect(mockGetOrdersOptimized).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        includeExpiredPendingInHistory: true,
        paymentStatuses: ['expire', 'cancel', 'deny'],
      }),
    );
  });

  it('appends additional history pages on loadMore', async () => {
    mockGetOrdersOptimized
      .mockResolvedValueOnce({
        data: [createOrder(1)],
        error: null,
        metrics: createMetrics(true, 0),
      })
      .mockResolvedValueOnce({
        data: [createOrder(2)],
        error: null,
        metrics: createMetrics(false, 1),
      });

    const { result } = renderHook(() => useOrderHistoryPaginated('user-1'));

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
    });

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.orders.map((order: OrderListItem) => order.id)).toEqual([
        'order-2',
        'order-1',
      ]);
    });
  });
});
