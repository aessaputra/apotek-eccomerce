import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import ShippedOrders from '@/scenes/orders/ShippedOrders';
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
  gross_amount: 125000,
  total_amount: 125000,
  courier_code: 'sicepat',
  courier_service: 'reg',
  payment_status: 'settlement',
  status: 'shipped',
  customer_completion_stage: null,
  customer_order_bucket: 'shipped',
  order_items: [
    {
      id: `${id}-item`,
      order_id: id,
      product_id: `${id}-product`,
      quantity: 1,
      price_at_purchase: 125000,
      products: {
        id: `${id}-product`,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
      },
    },
  ],
});

const mockOrders = [createOrder('order-3', 'Salep Luka')];

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

describe('<ShippedOrders />', () => {
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

  test('queries the shipped customer bucket for the shipped tab', () => {
    render(<ShippedOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'shipped',
      cacheKey: 'shipped',
    });
  });

  test('shows the loading state while shipped orders are fetching', () => {
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

    render(<ShippedOrders />);

    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('renders the shipped empty state copy', () => {
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

    render(<ShippedOrders />);

    expect(
      screen.getByText(
        'Pesanan yang sedang dikirim atau menunggu konfirmasi penerimaan akan muncul di sini.',
      ),
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

    render(<ShippedOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('retries from the shipped error state', () => {
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

    render(<ShippedOrders />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('routes to order detail when an order card is pressed', () => {
    render(<ShippedOrders />);

    fireEvent.press(screen.getByText(formatOrderNumber('order-3')));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-3' },
    });
  });

  test('wires refresh through the refresh control', () => {
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

    render(<ShippedOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);
    list.props.refreshControl.props.onRefresh();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('loads more orders when scrolling to the end', () => {
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

    render(<ShippedOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    list.props.onEndReached();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test('refreshes cache on mount when a user is present', async () => {
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

    render(<ShippedOrders />);

    await waitFor(() => {
      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
