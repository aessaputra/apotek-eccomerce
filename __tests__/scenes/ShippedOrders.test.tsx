import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import ShippedOrders from '@/scenes/orders/ShippedOrders';

const mockPush = jest.fn();
const mockUseOrdersByStatusPaginated = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useOrdersByStatusPaginated', () => ({
  useOrdersByStatusPaginated: (...args: unknown[]) => mockUseOrdersByStatusPaginated(...args),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/components/elements/OrderCard', () => ({
  OrderCard: () => null,
}));

describe('<ShippedOrders />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseOrdersByStatusPaginated.mockReset();
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
    });
  });

  test('queries shipped and in_transit orders for the shipped tab', () => {
    render(<ShippedOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      orderStatuses: ['shipped', 'in_transit'],
      cacheKey: 'shipped',
    });
  });

  test('renders the shipped empty state copy', () => {
    render(<ShippedOrders />);

    expect(
      screen.getByText('Pesanan yang sudah diserahkan ke kurir akan muncul di sini.'),
    ).not.toBeNull();
  });
});
