import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import AllOrders from '@/scenes/orders/AllOrders';
import { formatOrderNumber } from '@/utils/orderNumber';
import type { OrderListItem } from '@/services';

interface MockOrdersPaginatedState {
  orders: OrderListItem[];
  error: string | null;
  hasMore: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  refresh: () => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  loadMore: () => Promise<void>;
  isRevalidating: boolean;
  isUsingCachedData: boolean;
  metrics: {
    lastFetchDurationMs: number;
    lastPayloadBytes: number;
    cacheAgeMs: number | null;
  };
}

const mockPush = jest.fn();
const mockUseOrdersPaginated = jest.fn();
const mockOrderCard = jest.fn();
const mockUnpaidOrderCard = jest.fn();
const mockOrderStatusTabsHeader = jest.fn();

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

function mockHookState(overrides: Partial<MockOrdersPaginatedState> = {}) {
  mockUseOrdersPaginated.mockReturnValue({
    ...createHookState(),
    ...overrides,
  });
}

function createHookState(): MockOrdersPaginatedState {
  return {
    orders: mockOrders,
    error: null,
    hasMore: false,
    isInitialLoading: false,
    isRefreshing: false,
    isFetchingMore: false,
    refresh: jest.fn(() => Promise.resolve()),
    refreshIfNeeded: jest.fn(() => Promise.resolve()),
    loadMore: jest.fn(() => Promise.resolve()),
    isRevalidating: false,
    isUsingCachedData: false,
    metrics: { lastFetchDurationMs: 10, lastPayloadBytes: 10, cacheAgeMs: 10 },
  };
}

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useOrdersPaginated', () => ({
  useOrdersPaginated: (userId?: string) => mockUseOrdersPaginated(userId),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/scenes/orders/OrderStatusTabsHeader', () => ({
  OrderStatusTabsHeader: (props: { activeTab: string }) => {
    mockOrderStatusTabsHeader(props);

    const React = require('react') as typeof import('react');
    const { Text } = require('react-native') as typeof import('react-native');

    return React.createElement(Text, null, `tabs-header-${props.activeTab}`);
  },
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

jest.mock('@/components/elements/UnpaidOrderCard', () => ({
  UnpaidOrderCard: ({ order }: { order: OrderListItem }) => {
    mockUnpaidOrderCard(order);

    const React = require('react') as typeof import('react');
    const { Text } = require('react-native') as typeof import('react-native');

    return React.createElement(Text, null, `unpaid-card-${order.id}`);
  },
}));

describe('<AllOrders />', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUseOrdersPaginated.mockReset();
    mockOrderCard.mockClear();
    mockUnpaidOrderCard.mockClear();
    mockOrderStatusTabsHeader.mockClear();
    mockHookState();
  });

  test('queries all orders without status, bucket, or unpaid filters', () => {
    render(<AllOrders />);

    expect(mockUseOrdersPaginated.mock.calls[0]).toEqual(['user-1']);
  });

  test('renders all orders with the all tab header and default order cards', () => {
    render(<AllOrders />);

    expect(screen.getByText('tabs-header-all')).toBeTruthy();
    expect(mockOrderStatusTabsHeader).toHaveBeenCalledWith({ activeTab: 'all' });
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Vitamin C')).toBeTruthy();
    expect(mockOrderCard).toHaveBeenCalledTimes(2);
    expect(mockUnpaidOrderCard).not.toHaveBeenCalled();
    expect(screen.queryByText('unpaid-card-order-1')).toBeNull();
  });

  test('shows the shared loading state while all orders are fetching', () => {
    mockHookState({ orders: [], isInitialLoading: true });

    render(<AllOrders />);

    expect(screen.getByText('tabs-header-all')).toBeTruthy();
    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('renders the all-orders empty state copy and shop CTA navigation', () => {
    mockHookState({ orders: [] });

    render(<AllOrders />);

    expect(screen.getByText('tabs-header-all')).toBeTruthy();
    expect(screen.getByText('Belum ada pesanan')).toBeTruthy();
    expect(screen.getByText('Pesanan yang kamu buat akan muncul di sini.')).toBeTruthy();

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('shows the shared error state and retries through refresh', () => {
    const refresh = jest.fn(() => Promise.resolve());
    mockHookState({ orders: [], error: 'Gagal memuat data', refresh });

    render(<AllOrders />);

    expect(screen.getByText('tabs-header-all')).toBeTruthy();
    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('routes order presses to order detail', () => {
    render(<AllOrders />);

    fireEvent.press(screen.getByText(formatOrderNumber('order-1')));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-1' },
    });
  });

  test('wires refresh and pagination to the shared list', () => {
    const refresh = jest.fn(() => Promise.resolve());
    const loadMore = jest.fn(() => Promise.resolve());
    mockHookState({ hasMore: true, isRefreshing: true, refresh, loadMore });

    render(<AllOrders />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);

    list.props.refreshControl.props.onRefresh();
    list.props.onEndReached();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test('refreshes cached all-orders data on mount', async () => {
    const refreshIfNeeded = jest.fn(() => Promise.resolve());
    mockHookState({ refreshIfNeeded });

    render(<AllOrders />);

    await waitFor(() => {
      expect(refreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
