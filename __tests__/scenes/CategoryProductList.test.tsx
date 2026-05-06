import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import CategoryProductList from '@/scenes/category-product-list/CategoryProductList';
import type { UseProductsPaginatedReturn } from '@/hooks';

const mockPush = jest.fn();
const mockToastShow = jest.fn();
const mockAddProductToCart =
  jest.fn<
    (userId: string, productId: string, quantity: number) => Promise<{ error: Error | null }>
  >();
const mockUseProductsPaginated = jest.fn<(categoryId?: string) => UseProductsPaginatedReturn>();
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
  useLocalSearchParams: () => ({
    categoryId: 'cat-1',
    categoryName: 'Obat Demam',
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
  useProductsPaginated: (categoryId?: string) => mockUseProductsPaginated(categoryId),
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

function createCategoryProductsData(): UseProductsPaginatedReturn {
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
    isUsingCachedData: false,
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

describe('<CategoryProductList />', () => {
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
    mockUseProductsPaginated.mockReset();
    mockUseProductsPaginated.mockReturnValue(createCategoryProductsData());
  });

  it('loads products for the selected category', () => {
    render(<CategoryProductList />);

    expect(mockUseProductsPaginated).toHaveBeenCalledWith('cat-1');
    expect(screen.getByText('Paracetamol')).toBeTruthy();
  });

  it('shows a toast instead of inline feedback after adding a product to the cart', async () => {
    render(<CategoryProductList />);

    fireEvent.press(screen.getByText('Paracetamol'));

    await waitFor(() => {
      expect(mockAddProductToCart).toHaveBeenCalledWith('u1', 'product-1', 1);
      expect(mockToastShow).toHaveBeenCalledWith('Produk ditambahkan ke keranjang.', {
        message: undefined,
        type: 'background',
      });
    });
    expect(screen.queryByText('Produk ditambahkan ke keranjang.')).toBeNull();
  });

  it('shows a calm fallback toast when add-to-cart fails', async () => {
    mockAddProductToCart.mockImplementation(async () => ({
      error: new Error('Supabase row-level security failed'),
    }));

    render(<CategoryProductList />);

    fireEvent.press(screen.getByText('Paracetamol'));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        'Produk belum masuk keranjang. Coba lagi sebentar lagi.',
        { type: 'foreground' },
      );
    });
    expect(screen.queryByText('Supabase row-level security failed')).toBeNull();
  });

  it('shows a login toast before adding products for guests', () => {
    mockUser = null;

    render(<CategoryProductList />);

    fireEvent.press(screen.getByText('Paracetamol'));

    expect(mockAddProductToCart).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      'Silakan masuk untuk menambahkan produk ke keranjang.',
      { message: 'Masuk diperlukan agar keranjang Anda tersimpan.', type: 'foreground' },
    );
  });
});
