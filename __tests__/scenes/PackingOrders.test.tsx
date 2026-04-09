import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import PackingOrders from '@/scenes/orders/PackingOrders';

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

describe('<PackingOrders />', () => {
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

  test('queries paid, processing, and awaiting_shipment orders for the packing tab', () => {
    render(<PackingOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      orderStatuses: ['paid', 'processing', 'awaiting_shipment'],
      cacheKey: 'packing',
    });
  });

  test('renders the existing packing empty state copy', () => {
    render(<PackingOrders />);

    expect(screen.getByText('Pesanan yang sedang dikemas akan muncul di sini.')).not.toBeNull();
  });
});
