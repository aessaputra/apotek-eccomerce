import { beforeEach, test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import { useCartPaginated } from '@/hooks';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon/HeaderCartIcon';
import type { UseCartPaginatedReturn } from '@/hooks/useCartPaginated';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks', () => ({
  useCartPaginated: jest.fn(() => ({
    cartId: 'cart-1',
    items: [],
    snapshot: { itemCount: 0, estimatedWeightGrams: 0, packageValue: 0 },
    error: null,
    isLoading: false,
    isRefreshing: false,
    realtimeState: 'connected',
    refresh: jest.fn(),
  })),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { id: 'user-1' } }),
}));

const mockedUseCartPaginated = jest.mocked(useCartPaginated);

function createCartHookReturn(itemCount: number): UseCartPaginatedReturn {
  return {
    cartId: 'cart-1',
    items: [],
    snapshot: { itemCount, estimatedWeightGrams: 0, packageValue: 0 },
    error: null,
    isLoading: false,
    isRefreshing: false,
    realtimeState: 'connected',
    refresh: jest.fn<UseCartPaginatedReturn['refresh']>(),
  };
}

describe('<HeaderCartIcon />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockedUseCartPaginated.mockReturnValue(createCartHookReturn(0));
  });

  test('navigates to cart when pressed', async () => {
    render(<HeaderCartIcon />);

    fireEvent.press(screen.getByLabelText('Keranjang'));
    expect(mockPush).toHaveBeenCalledWith('/cart');
  });

  test('renders in dark theme and header-right mode', async () => {
    renderWithDarkTheme(<HeaderCartIcon forHeaderRight />);
    expect(screen.getByLabelText('Keranjang')).not.toBeNull();
  });

  test('renders the cart item count badge in dark theme and header-right mode', async () => {
    mockedUseCartPaginated.mockReturnValue(createCartHookReturn(7));

    renderWithDarkTheme(<HeaderCartIcon forHeaderRight />);

    expect(screen.getByLabelText('Keranjang')).not.toBeNull();
    expect(screen.getByText('7')).not.toBeNull();
  });

  test('shows the cart item count badge', async () => {
    mockedUseCartPaginated.mockReturnValue(createCartHookReturn(5));

    render(<HeaderCartIcon />);

    expect(screen.getByText('5')).not.toBeNull();
  });

  test('caps the cart item count badge at 99+', async () => {
    mockedUseCartPaginated.mockReturnValue(createCartHookReturn(120));

    render(<HeaderCartIcon />);

    expect(screen.getByText('99+')).not.toBeNull();
  });
});
