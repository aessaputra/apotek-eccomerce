import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import CancelledOrders from '@/scenes/orders/CancelledOrders';
import { formatOrderNumber } from '@/utils/orderNumber';
import type { OrderListItem } from '@/services';

const mockPush = jest.fn();
const mockUseOrdersByStatusPaginated = jest.fn();
const mockOrderCard = jest.fn();
const mockOrderStatusTabsHeader = jest.fn();

const createOrder = (id: string, productName: string): OrderListItem => ({
  id,
  created_at: '2026-01-05T00:00:00Z',
  expired_at: null,
  midtrans_order_id: `MID-${id}`,
  gross_amount: 45000,
  total_amount: 45000,
  courier_code: 'jne',
  courier_service: 'reg',
  payment_status: 'cancel',
  status: 'cancelled',
  customer_completion_stage: null,
  customer_order_bucket: 'cancelled',
  order_items: [
    {
      id: `${id}-item`,
      order_id: id,
      product_id: `${id}-product`,
      quantity: 1,
      price_at_purchase: 45000,
      products: {
        id: `${id}-product`,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
      },
    },
  ],
});

const mockOrders = [createOrder('order-5', 'Obat Flu')];

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

jest.mock('@/scenes/orders/OrderStatusTabsHeader', () => ({
  OrderStatusTabsHeader: (props: { activeTab: string }) => {
    mockOrderStatusTabsHeader(props);

    const React = require('react') as typeof import('react');
    const { Text } = require('react-native') as typeof import('react-native');

    return React.createElement(Text, null, `tabs-header-${props.activeTab}`);
  },
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

describe('<CancelledOrders />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockOrderCard.mockClear();
    mockOrderStatusTabsHeader.mockClear();
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

  test('queries the cancelled customer bucket for the cancelled tab', () => {
    render(<CancelledOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'cancelled',
      cacheKey: 'cancelled',
    });
  });

  test('shows the loading state while cancelled orders are fetching', () => {
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

    render(<CancelledOrders />);

    expect(screen.getByText('tabs-header-cancelled')).toBeTruthy();
    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('renders the cancelled empty state copy', () => {
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

    render(<CancelledOrders />);

    expect(screen.getByText('tabs-header-cancelled')).toBeTruthy();
    expect(screen.getByText('Belum Ada Pesanan Dibatalkan')).not.toBeNull();
    expect(screen.getByText('Pesanan yang dibatalkan akan muncul di sini.')).not.toBeNull();
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

    render(<CancelledOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('retries from the cancelled error state', () => {
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

    render(<CancelledOrders />);

    expect(screen.getByText('tabs-header-cancelled')).toBeTruthy();
    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('routes to order detail when an order card is pressed', () => {
    render(<CancelledOrders />);

    expect(screen.getByText('tabs-header-cancelled')).toBeTruthy();
    expect(mockOrderStatusTabsHeader).toHaveBeenCalledWith({ activeTab: 'cancelled' });

    fireEvent.press(screen.getByText(formatOrderNumber('order-5')));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-5' },
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

    render(<CancelledOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);
    list.props.refreshControl.props.onRefresh();
    list.props.onEndReached();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test('refreshes cached cancelled orders on mount', async () => {
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

    render(<CancelledOrders />);

    await waitFor(() => {
      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
