import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import AllProducts from '@/scenes/AllProducts/AllProducts';
import type { UseAllProductsPaginatedReturn } from '@/hooks';

const mockPush = jest.fn();
const mockToastShow = jest.fn();
const mockAddProductToCart =
  jest.fn<
    (userId: string, productId: string, quantity: number) => Promise<{ error: Error | null }>
  >();
const mockUseAllProductsPaginated = jest.fn<() => UseAllProductsPaginatedReturn>();
let mockUser: { id: string; full_name: string; avatar_url: string | null; email: string } | null = {
  id: 'u1',
  full_name: 'Test',
  avatar_url: null,
  email: 'test@test.com',
};

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({
    show: mockToastShow,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

jest.mock('@/hooks', () => ({
  useAllProductsPaginated: () => mockUseAllProductsPaginated(),
}));

jest.mock('@/services', () => ({
  addProductToCart: (userId: string, productId: string, quantity: number) =>
    mockAddProductToCart(userId, productId, quantity),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: mockUser,
  }),
}));

jest.mock('@/components/elements/ProductCard', () => {
  const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({ item, onAddToCart }: { item: { name: string }; onAddToCart: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onAddToCart}>
        <Text>{item.name}</Text>
      </Pressable>
    ),
  };
});

function createAllProductsData(): UseAllProductsPaginatedReturn {
  return {
    products: [
      {
        id: 'product-1',
        name: 'Paracetamol',
        price: 10000,
        category_id: 'cat-1',
        created_at: '2026-04-06T00:00:00Z',
        images: [],
      },
    ],
    error: null,
    hasMore: false,
    isInitialLoading: false,
    isRefreshing: false,
    isFetchingMore: false,
    isRevalidating: false,
    refresh: jest.fn(async () => {}),
    refreshIfNeeded: jest.fn(async () => {}),
    loadMore: jest.fn(async () => {}),
    metrics: {
      lastFetchDurationMs: 0,
      lastPayloadBytes: 0,
      cacheAgeMs: null,
    },
  };
}

describe('<AllProducts />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToastShow.mockClear();
    mockAddProductToCart.mockReset();
    mockAddProductToCart.mockImplementation(async () => ({ error: null }));
    mockUser = {
      id: 'u1',
      full_name: 'Test',
      avatar_url: null,
      email: 'test@test.com',
    };
    mockUseAllProductsPaginated.mockReset();
    mockUseAllProductsPaginated.mockReturnValue(createAllProductsData());
  });

  it('renders product list', () => {
    render(<AllProducts />);

    expect(screen.getByText('Paracetamol')).toBeTruthy();
  });

  it('renders loading state when loading and no products', () => {
    mockUseAllProductsPaginated.mockReturnValue({
      ...createAllProductsData(),
      isInitialLoading: true,
      products: [],
    });

    render(<AllProducts />);

    expect(screen.getByText('Loading products...')).toBeTruthy();
  });

  it('renders empty state when no products', () => {
    mockUseAllProductsPaginated.mockReturnValue({
      ...createAllProductsData(),
      products: [],
      error: null,
      isInitialLoading: false,
    });

    render(<AllProducts />);

    expect(screen.getByText('Tidak ada produk')).toBeTruthy();
    expect(screen.getByText('Belum ada produk aktif tersedia.')).toBeTruthy();
  });

  it('shows a toast after adding a product to the cart', async () => {
    render(<AllProducts />);

    fireEvent.press(screen.getByText('Paracetamol'));

    await waitFor(() => {
      expect(mockAddProductToCart).toHaveBeenCalledWith('u1', 'product-1', 1);
      expect(mockToastShow).toHaveBeenCalledWith('Produk ditambahkan ke keranjang.', {
        message: undefined,
        type: 'background',
      });
    });
  });

  it('shows a toast when add-to-cart fails', async () => {
    mockAddProductToCart.mockImplementation(async () => ({
      error: new Error('Stok produk tidak cukup.'),
    }));

    render(<AllProducts />);

    fireEvent.press(screen.getByText('Paracetamol'));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        'Stok produk belum cukup. Periksa jumlah atau pilih produk lain.',
        { type: 'foreground' },
      );
    });
  });

  it('shows a login toast before adding products for guests', () => {
    mockUser = null;

    render(<AllProducts />);

    fireEvent.press(screen.getByText('Paracetamol'));

    expect(mockAddProductToCart).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Silakan masuk untuk menambahkan produk ke keranjang.',
      { message: 'Masuk diperlukan agar keranjang Anda tersimpan.', type: 'foreground' },
    );
  });
});
