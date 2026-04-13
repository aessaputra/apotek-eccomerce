import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import OrderHistory from '@/scenes/profile/OrderHistory';

const mockPush = jest.fn();
const mockUseOrderHistoryPaginated = jest.fn();
const mockOrderCardProps = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useOrderHistoryPaginated', () => ({
  useOrderHistoryPaginated: (...args: unknown[]) => mockUseOrderHistoryPaginated(...args),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/components/elements/OrderCard', () => ({
  OrderCard: (props: unknown) => {
    mockOrderCardProps(props);
    return null;
  },
}));

describe('<OrderHistory />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseOrderHistoryPaginated.mockReset();
    mockOrderCardProps.mockClear();
    mockUseOrderHistoryPaginated.mockReturnValue({
      orders: [],
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      loadMore: jest.fn(),
    });
  });

  test('renders the existing empty state copy', () => {
    render(<OrderHistory />);

    expect(
      screen.getByText('Riwayat pesanan yang kadaluarsa atau dibatalkan akan muncul di sini.'),
    ).not.toBeNull();
  });

  test('passes elevated={false} to OrderCard for flat/no-shadow rendering', () => {
    mockUseOrderHistoryPaginated.mockReturnValue({
      orders: [
        {
          id: 'order-1',
          status: 'cancelled',
          payment_status: 'cancel',
          gross_amount: 10000,
          total_amount: 10000,
          created_at: '2024-01-01T00:00:00Z',
          order_items: [{ id: 'item-1', products: { name: 'Test Product' } }],
        },
      ],
      error: null,
      hasMore: false,
      isInitialLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      refresh: jest.fn(),
      loadMore: jest.fn(),
    });

    render(<OrderHistory />);

    expect(mockOrderCardProps).toHaveBeenCalled();
    const lastCall = mockOrderCardProps.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveProperty('elevated', false);
  });
});
