import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { FlatList } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import UnpaidOrdersScreen from '@/scenes/orders/UnpaidOrders';
import type { OrderListItem } from '@/services/order.service';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockRefreshIfNeeded = jest.fn();
const mockLoadMore = jest.fn();

const mockOrders: OrderListItem[] = [
  {
    id: 'order-1',
    created_at: '2030-01-01T00:00:00Z',
    expired_at: null,
    midtrans_order_id: 'MID-001',
    gross_amount: 50000,
    total_amount: 55000,
    courier_code: 'jne',
    courier_service: 'same-day',
    payment_status: 'pending',
    status: 'pending',
    customer_completion_stage: null,
    customer_order_bucket: 'unpaid',
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
    created_at: '2030-01-02T00:00:00Z',
    expired_at: null,
    midtrans_order_id: 'MID-002',
    gross_amount: 100000,
    total_amount: 110000,
    courier_code: null,
    courier_service: null,
    payment_status: 'pending',
    status: 'pending',
    customer_completion_stage: null,
    customer_order_bucket: 'unpaid',
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

const hookState = {
  orders: mockOrders as OrderListItem[],
  error: null as string | null,
  hasMore: false,
  isInitialLoading: false,
  isRefreshing: false,
  isFetchingMore: false,
  isRevalidating: false,
  isUsingCachedData: true,
};

jest.mock('@/hooks/useUnpaidOrdersPaginated', () => ({
  useUnpaidOrdersPaginated: () => ({
    ...hookState,
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
    push: mockPush,
  }),
}));

describe('UnpaidOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    hookState.orders = mockOrders;
    hookState.error = null;
    hookState.hasMore = false;
    hookState.isInitialLoading = false;
    hookState.isRefreshing = false;
    hookState.isFetchingMore = false;
    hookState.isRevalidating = false;
    hookState.isUsingCachedData = true;
  });

  test('renders order list', () => {
    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Vitamin C')).toBeTruthy();
  });

  test('shows empty state when no orders', () => {
    hookState.orders = [];
    hookState.isUsingCachedData = false;

    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Belum Ada Pesanan')).toBeTruthy();
    expect(
      screen.getByText('Pesanan yang masih bisa dibayar akan muncul di sini. Yuk, mulai belanja!'),
    ).toBeTruthy();
  });

  test('shows active unpaid helper copy above the list', () => {
    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Masih Bisa Dibayar')).toBeTruthy();
    expect(
      screen.getByText('Hanya pesanan yang masih bisa dibayar ditampilkan di sini.'),
    ).toBeTruthy();
  });

  test('navigates shop now CTA to /home from the empty state', () => {
    hookState.orders = [];
    hookState.isUsingCachedData = false;

    render(<UnpaidOrdersScreen />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  test('shows loading state', () => {
    hookState.orders = [];
    hookState.hasMore = true;
    hookState.isInitialLoading = true;
    hookState.isUsingCachedData = false;

    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Memuat pesanan...')).toBeTruthy();
  });

  test('shows error state', () => {
    hookState.orders = [];
    hookState.error = 'Gagal memuat data';
    hookState.isUsingCachedData = false;

    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
  });

  test('retries from the error state', () => {
    hookState.orders = [];
    hookState.error = 'Gagal memuat data';
    hookState.isUsingCachedData = false;

    render(<UnpaidOrdersScreen />);

    expect(screen.getByText('Gagal Memuat Pesanan')).toBeTruthy();
    expect(screen.getByText('Gagal memuat data')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  test('routes to the order detail screen when a visible unpaid order is pressed', () => {
    render(<UnpaidOrdersScreen />);

    fireEvent.press(screen.getByText('Paracetamol'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'order-1' },
    });
  });

  test('wires refresh and pagination on the rendered list', () => {
    hookState.isRefreshing = true;
    hookState.hasMore = true;

    render(<UnpaidOrdersScreen />);

    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.refreshControl.props.refreshing).toBe(true);
    list.props.refreshControl.props.onRefresh();
    list.props.onEndReached();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  test('refreshes cached unpaid orders on mount', async () => {
    render(<UnpaidOrdersScreen />);

    await waitFor(() => {
      expect(mockRefreshIfNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
