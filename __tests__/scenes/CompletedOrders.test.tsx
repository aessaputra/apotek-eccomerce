import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import CompletedOrders from '@/scenes/orders/CompletedOrders';

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

describe('<CompletedOrders />', () => {
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

  test('queries delivered orders for the completed tab', () => {
    render(<CompletedOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      orderStatuses: ['delivered'],
      cacheKey: 'completed',
    });
  });

  test('renders the completed empty state copy', () => {
    render(<CompletedOrders />);

    expect(screen.getByText('Pesanan yang sudah selesai akan muncul di sini.')).not.toBeNull();
  });
});
