import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
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

  test('queries the shipped customer bucket for the shipped tab', () => {
    render(<ShippedOrders />);

    expect(mockUseOrdersByStatusPaginated).toHaveBeenCalledWith({
      userId: 'user-1',
      customerOrderBucket: 'shipped',
      cacheKey: 'shipped',
    });
  });

  test('renders the shipped empty state copy', () => {
    render(<ShippedOrders />);

    expect(
      screen.getByText(
        'Pesanan yang sedang dikirim atau menunggu konfirmasi penerimaan akan muncul di sini.',
      ),
    ).not.toBeNull();
  });

  test('navigates shop now CTA to /home', () => {
    render(<ShippedOrders />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(mockPush).toHaveBeenCalledWith('/home');
  });
});
