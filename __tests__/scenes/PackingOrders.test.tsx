import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import PackingOrders from '@/scenes/orders/PackingOrders';
import { formatOrderNumber } from '@/utils/orderNumber';
import type { OrderListItem } from '@/services';

const mockPush = jest.fn();
const mockUseOrdersByStatusPaginated = jest.fn();

const mockOrderCard = jest.fn();

const createOrder = (id: string, productName: string): OrderListItem => ({
  id,
  created_at: '2026-01-03T00:00:00Z',
  expired_at: null,
  midtrans_order_id: `MID-${id}`,
  gross_amount: 50000,
  total_amount: 55000,
  courier_code: 'jne',
  courier_service: 'same-day',
  payment_status: 'pending',
  status: 'processing',
  customer_completion_stage: null,
  customer_order_bucket: 'packing',
  order_items: [
    {
      id: `${id}-item`,
      order_id: id,
      product_id: `${id}-product`,
      quantity: 2,
      price_at_purchase: 25000,
      products: {
        id: `${id}-product`,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
      },
    },
  ],
});

const mockOrders = [createOrder('order-1', 'Paracetamol'), createOrder('order-2', 'Vitamin C')];

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

describe('<PackingOrders />', () => {
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

  test('queries the packing customer bucket for the packing tab', () => {
    render(<PackingOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'packing',
      cacheKey: 'packing',
    });
  });

  test('shows the loading state while packing orders are fetching', () => {
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

    render(<PackingOrders />);

    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('renders the existing packing empty state copy', () => {
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

    render(<PackingOrders />);

    expect(
      screen.getByText('Pesanan yang sedang diproses atau siap dikirim akan muncul di sini.'),
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

    render(<PackingOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('retries from the packing error state', () => {
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

    render(<PackingOrders />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('renders the order card mock and routes to order detail on press', () => {
    render(<PackingOrders />);

    fireEvent.press(screen.getByText(formatOrderNumber('order-1')));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-1' },
    });
  });

  test('calls refresh through the list refresh control when refreshing', () => {
    const refresh = jest.fn();
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: mockOrders,
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: true,
      isFetchingMore: false,
      refresh,
      refreshIfNeeded: jest.fn(),
      loadMore: jest.fn(),
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<PackingOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);
    list.props.refreshControl.props.onRefresh();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('loads more orders when the list reaches the end', () => {
    const loadMore = jest.fn();
    mockUseOrdersByStatusPaginated.mockReturnValue({
      orders: mockOrders,
      error: null,
      hasMore: true,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      refreshIfNeeded: jest.fn(),
      loadMore,
      isRevalidating: false,
      isUsingCachedData: false,
      metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
    });

    render(<PackingOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    list.props.onEndReached();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test('waits for the cached refresh bootstrap after mount', async () => {
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

    render(<PackingOrders />);

    await waitFor(() => {
      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
