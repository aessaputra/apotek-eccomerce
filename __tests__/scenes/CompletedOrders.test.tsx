import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import CompletedOrders from '@/scenes/orders/CompletedOrders';
import { formatOrderNumber } from '@/utils/orderNumber';
import type { OrderListItem } from '@/services';

const mockPush = jest.fn();
const mockUseOrdersByStatusPaginated = jest.fn();
const mockOrderCard = jest.fn();

const createOrder = (id: string, productName: string): OrderListItem => ({
  id,
  created_at: '2026-01-04T00:00:00Z',
  expired_at: null,
  midtrans_order_id: `MID-${id}`,
  gross_amount: 89000,
  total_amount: 89000,
  courier_code: 'pos',
  courier_service: 'economy',
  payment_status: 'settlement',
  status: 'delivered',
  customer_completion_stage: 'completed',
  customer_order_bucket: 'completed',
  order_items: [
    {
      id: `${id}-item`,
      order_id: id,
      product_id: `${id}-product`,
      quantity: 1,
      price_at_purchase: 89000,
      products: {
        id: `${id}-product`,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
      },
    },
  ],
});

const mockOrders = [createOrder('order-4', 'Masker Medis')];

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useOrdersByStatusPaginated', () => ({
  useOrdersByStatusPaginated: (...args: unknown[]) => mockUseOrdersByStatusPaginated(...args),
}));

jest.mock('@/components/elements/OrderCard', () => ({
  OrderCard: ({ order, onPress }: { order: OrderListItem; onPress?: () => void }) => {
    mockOrderCard(order);

    const React = require('react') as typeof import('react');
    const { Pressable, Text } = require('react-native') as typeof import('react-native');

    return React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: `order-card-${order.id}`,
        onPress,
      },
      React.createElement(Text, null, `APT-${order.id.slice(0, 8).toUpperCase()}`),
      React.createElement(Text, null, order.order_items[0]?.products?.name ?? 'Produk'),
    );
  },
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

describe('<CompletedOrders />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockOrderCard.mockClear();
    mockUseOrdersByStatusPaginated.mockReset();
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: mockOrders,
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });
  });

  test('queries the completed customer bucket for the completed tab', () => {
    render(<CompletedOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'completed',
      cacheKey: 'completed',
    });
  });

  test('shows the loading state while completed orders are fetching', () => {
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: [],
      error: null,
      hasMore: false,
      isInitialLoading: true,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('renders the completed empty state copy', () => {
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: [],
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    expect(
      screen.getByText('Pesanan yang sudah dikonfirmasi selesai akan muncul di sini.'),
    ).not.toBeNull();
  });

  test('navigates shop now CTA to /home', () => {
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: [],
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('retries from the completed error state', () => {
    const refresh = jest.fn();
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: [],
      error: 'Gagal memuat data',
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh,
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('routes to order detail when an order card is pressed', () => {
    render(<CompletedOrders />);

    fireEvent.press(screen.getByText(formatOrderNumber('order-4')));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-4' },
    });
  });

  test('wires refresh and pagination from the rendered list', () => {
    const refresh = jest.fn();
    const loadMore = jest.fn();

    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: mockOrders,
      error: null,
      hasMore: true,
      isInitialLoading: false,
      isRefreshing: true,
      isFetchingMore: false,
      refresh,
      refreshIfNeeded: jest.fn(),
      loadMore,
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);
    list.props.refreshControl.props.onRefresh();
    list.props.onEndReached();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test('refreshes cached orders on mount', async () => {
    const refreshIfNeeded = jest.fn();
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: mockOrders,
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded,
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<CompletedOrders />);

    await waitFor(() => {
      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
