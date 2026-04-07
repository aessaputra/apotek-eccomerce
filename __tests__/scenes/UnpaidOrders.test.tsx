import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import UnpaidOrders from '@/scenes/orders/UnpaidOrders';
import type { OrderListItem } from '@/services/order.service';

const mockRefresh = jest.fn();
const mockRefreshIfNeeded = jest.fn();
const mockLoadMore = jest.fn();

const mockOrders: OrderListItem[] = [
  {
    id: 'order-1',
    created_at: '2026-01-01T00:00:00Z',
    expired_at: null,
    midtrans_order_id: 'MID-001',
    gross_amount: 50000,
    total_amount: 55000,
    courier_code: 'jne',
    courier_service: 'same-day',
    payment_status: 'pending',
    status: 'pending',
    order_items: [
      {
        id: 'item-1',
        order_id: 'order-1',
        product_id: 'product-1',
        quantity: 2,
        price_at_purchase: 25000,
        products: {
          id: 'product-1',
          name: 'Paracetamol',
          slug: 'paracetamol',
        },
      },
    ],
  },
  {
    id: 'order-2',
    created_at: '2026-01-02T00:00:00Z',
    expired_at: null,
    midtrans_order_id: 'MID-002',
    gross_amount: 100000,
    total_amount: 110000,
    courier_code: null,
    courier_service: null,
    payment_status: 'pending',
    status: 'pending',
    order_items: [
      {
        id: 'item-2',
        order_id: 'order-2',
        product_id: 'product-2',
        quantity: 1,
        price_at_purchase: 100000,
        products: {
          id: 'product-2',
          name: 'Vitamin C',
          slug: 'vitamin-c',
        },
      },
    ],
  },
];

jest.mock('@/hooks/useUnpaidOrdersPaginated', () => ({
  useUnpaidOrdersPaginated: () => ({
    orders: mockOrders,
    error: null,
    hasMore: false,
    isInitialLoading: false,
    isRefreshing: false,
    isFetchingMore: false,
    isRevalidating: false,
    isUsingCachedData: true,
    refresh: mockRefresh,
    refreshIfNeeded: mockRefreshIfNeeded,
    loadMore: mockLoadMore,
    metrics: {
      lastFetchDurationMs: 100,
      lastPayloadBytes: 1024,
      cacheAgeMs: 5000,
    },
  }),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-123' },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('UnpaidOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders order list', () => {
    render(<UnpaidOrders />);

    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Vitamin C')).toBeTruthy();
  });

  test('shows empty state when no orders', () => {
    jest.resetModules();
    jest.doMock('@/hooks/useUnpaidOrdersPaginated', () => ({
      useUnpaidOrdersPaginated: () => ({
        orders: [],
        error: null,
        hasMore: false,
        isInitialLoading: false,
        isRefreshing: false,
        isFetchingMore: false,
        isRevalidating: false,
        isUsingCachedData: false,
        refresh: mockRefresh,
        refreshIfNeeded: mockRefreshIfNeeded,
        loadMore: mockLoadMore,
        metrics: {
          lastFetchDurationMs: 0,
          lastPayloadBytes: 0,
          cacheAgeMs: null,
        },
      }),
    }));

    const { UnpaidOrders: UnpaidOrdersEmpty } = require('@/scenes/orders/UnpaidOrders');
    render(<UnpaidOrdersEmpty />);

    expect(screen.getByText('Belum Ada Pesanan')).toBeTruthy();
  });

  test('shows loading state', () => {
    jest.resetModules();
    jest.doMock('@/hooks/useUnpaidOrdersPaginated', () => ({
      useUnpaidOrdersPaginated: () => ({
        orders: [],
        error: null,
        hasMore: true,
        isInitialLoading: true,
        isRefreshing: false,
        isFetchingMore: false,
        isRevalidating: false,
        isUsingCachedData: false,
        refresh: mockRefresh,
        refreshIfNeeded: mockRefreshIfNeeded,
        loadMore: mockLoadMore,
        metrics: {
          lastFetchDurationMs: 0,
          lastPayloadBytes: 0,
          cacheAgeMs: null,
        },
      }),
    }));

    const { UnpaidOrders: UnpaidOrdersLoading } = require('@/scenes/orders/UnpaidOrders');
    render(<UnpaidOrdersLoading />);

    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('shows error state', () => {
    jest.resetModules();
    jest.doMock('@/hooks/useUnpaidOrdersPaginated', () => ({
      useUnpaidOrdersPaginated: () => ({
        orders: [],
        error: 'Gagal memuat data',
        hasMore: false,
        isInitialLoading: false,
        isRefreshing: false,
        isFetchingMore: false,
        isRevalidating: false,
        isUsingCachedData: false,
        refresh: mockRefresh,
        refreshIfNeeded: mockRefreshIfNeeded,
        loadMore: mockLoadMore,
        metrics: {
          lastFetchDurationMs: 0,
          lastPayloadBytes: 0,
          cacheAgeMs: null,
        },
      }),
    }));

    const { UnpaidOrders: UnpaidOrdersError } = require('@/scenes/orders/UnpaidOrders');
    render(<UnpaidOrdersError />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
  });
});
