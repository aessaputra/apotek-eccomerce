import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as ReactNative from 'react-native';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import Home from '@/scenes/home/Home';
import type { UseHomeDataReturn } from '@/hooks';

type AddToCartResult = Promise<{ error: Error | null }>;

const mockPush = jest.fn();
const mockUseHomeData = jest.fn<() => UseHomeDataReturn>();
const mockUseWindowDimensions = jest.fn(() => ({
  width: 390,
  height: 844,
  scale: 1,
  fontScale: 1,
}));
const mockAddProductToCart = jest.fn<
  (userId: string, productId: string, quantity: number) => AddToCartResult
>(async () => ({ error: null }));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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
  useHomeData: () => mockUseHomeData(),
  useCartPaginated: () => ({ snapshot: { itemCount: 0, items: [] } }),
}));

jest.mock('@/services', () => ({
  addProductToCart: (userId: string, productId: string, quantity: number) =>
    mockAddProductToCart(userId, productId, quantity),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: {
      id: 'user-1',
      full_name: 'John Doe',
      avatar_url: null,
      email: 'john@example.com',
    },
  }),
}));

jest.mock('@/components/elements/CategoryItem', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({ category }: { category: { name: string } }) => <Text>{category.name}</Text>,
    CategorySkeleton: ({ count }: { count?: number }) => (
      <Text>Category Skeleton {count ?? 8}</Text>
    ),
  };
});

jest.mock('@/components/elements/ProductCard', () => {
  const { Button, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    default: ({ item, onAddToCart }: { item: { name: string }; onAddToCart?: () => void }) => (
      <View>
        <Text>{item.name}</Text>
        <Button title={`Add ${item.name}`} onPress={onAddToCart} />
      </View>
    ),
    ProductCardSkeleton: ({ count }: { count?: number }) => (
      <Text>Product Skeleton {count ?? 3}</Text>
    ),
  };
});

function createHomeData(): UseHomeDataReturn {
  return {
    banners: {
      home_banner_top: {
        id: 'banner-top',
        placementKey: 'home_banner_top',
        intent: 'informational',
        title: 'Top banner title',
        body: 'Top banner body',
        mediaPath: null,
        mediaUrl: null,
        ctaKind: 'route',
        cta: { label: 'Open orders', route: 'home/all-products' },
        isActive: true,
        createdAt: '2026-04-03T00:00:00Z',
        updatedAt: '2026-04-03T00:00:00Z',
      },
      home_banner_bottom: {
        id: 'banner-bottom',
        placementKey: 'home_banner_bottom',
        intent: 'branding',
        title: 'Bottom banner title',
        body: null,
        mediaPath: null,
        mediaUrl: null,
        ctaKind: 'none',
        cta: null,
        isActive: true,
        createdAt: '2026-04-03T00:00:00Z',
        updatedAt: '2026-04-03T00:00:00Z',
      },
    },
    categories: [{ id: 'cat-1', name: 'Vitamin', slug: 'vitamin', logo_url: null, created_at: '' }],
    products: [
      {
        id: 'product-1',
        name: 'Product 1',
        slug: 'product-1',
        description: null,
        price: 10000,
        stock: 10,
        weight: 100,
        category_id: 'cat-1',
        is_active: true,
        created_at: '',
        updated_at: '',
        images: [],
      },
    ],
    isLoadingBanners: false,
    isLoadingCategories: false,
    isLoadingProducts: false,
    isRefreshing: false,
    bannerError: null,
    error: null,
    refresh: jest.fn(async () => {}),
  };
}

describe('<Home />', () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, 'useWindowDimensions').mockImplementation(mockUseWindowDimensions);
    mockPush.mockClear();
    mockUseHomeData.mockReset();
    mockUseHomeData.mockReturnValue(createHomeData());
    mockAddProductToCart.mockClear();
    mockUseWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    });
    mockAddProductToCart.mockResolvedValue({ error: null });
  });

  it('renders top and bottom banner placements from hook data', () => {
    render(<Home />);

    expect(screen.getByText('Top banner title')).toBeTruthy();
    expect(screen.getByText('Bottom banner title')).toBeTruthy();
  });

  it('routes CTA presses through the allowlist route map', () => {
    render(<Home />);

    fireEvent.press(screen.getByText('Open orders'));

    expect(mockPush).toHaveBeenCalledWith('/home/all-products');
  });

  it('renders banner skeletons while banner data is initially loading', () => {
    mockUseHomeData.mockReturnValue({
      ...createHomeData(),
      banners: { home_banner_top: null, home_banner_bottom: null },
      isLoadingBanners: true,
    });

    render(<Home />);

    expect(screen.getAllByTestId('home-banner-skeleton')).toHaveLength(2);
  });

  it('renders category and product skeletons with viewport-aligned counts while loading', () => {
    mockUseHomeData.mockReturnValue({
      ...createHomeData(),
      categories: [],
      products: [],
      isLoadingCategories: true,
      isLoadingProducts: true,
    });

    render(<Home />);

    expect(screen.getByText('Category Skeleton 2')).toBeTruthy();
    expect(screen.getByText('Product Skeleton 2')).toBeTruthy();
  });

  it('shows a success dialog after a product is added to cart successfully', async () => {
    render(<Home />);

    fireEvent.press(screen.getByText('Add Product 1'));

    expect(mockAddProductToCart).toHaveBeenCalledWith('user-1', 'product-1', 1);
    expect(await screen.findByText('Produk berhasil ditambahkan')).toBeTruthy();
    expect(screen.getByText('Product 1 berhasil ditambahkan ke keranjang')).toBeTruthy();
  });

  it('does not show the success dialog when adding to cart fails', async () => {
    mockAddProductToCart.mockResolvedValue({ error: new Error('cart failed') });

    render(<Home />);

    fireEvent.press(screen.getByText('Add Product 1'));

    expect(mockAddProductToCart).toHaveBeenCalledWith('user-1', 'product-1', 1);
    expect(screen.queryByText('Produk berhasil ditambahkan')).toBeNull();
    expect(screen.queryByText('Product 1 berhasil ditambahkan ke keranjang')).toBeNull();
  });

  it('renders a retryable core error state when home content fails to load', () => {
    const refresh = jest.fn(async () => {});
    mockUseHomeData.mockReturnValue({
      ...createHomeData(),
      categories: [],
      products: [],
      error: 'Failed to load latest products. Please try again.',
      refresh,
    });

    render(<Home />);

    expect(screen.getByText('Konten utama belum berhasil dimuat')).toBeTruthy();
    expect(screen.getByText('Failed to load latest products. Please try again.')).toBeTruthy();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalled();
  });

  it('shows a non-blocking banner warning when only banners fail', () => {
    mockUseHomeData.mockReturnValue({
      ...createHomeData(),
      bannerError: 'banner failed',
    });

    render(<Home />);

    expect(
      screen.getByText('Banner promo belum berhasil dimuat. Konten utama tetap tersedia.'),
    ).toBeTruthy();
  });
});
