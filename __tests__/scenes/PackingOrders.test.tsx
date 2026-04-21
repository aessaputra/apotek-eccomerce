import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
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

  test('queries the packing customer bucket for the packing tab', () => {
    render(<PackingOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'packing',
      cacheKey: 'packing',
    });
  });

  test('renders the existing packing empty state copy', () => {
    render(<PackingOrders />);

    expect(
      screen.getByText('Pesanan yang sedang diproses atau siap dikirim akan muncul di sini.'),
    ).not.toBeNull();
  });

  test('navigates shop now CTA to /home', () => {
    render(<PackingOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
