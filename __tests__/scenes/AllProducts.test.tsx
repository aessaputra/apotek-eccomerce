import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import AllProducts from '@/scenes/AllProducts/AllProducts';
import type { UseAllProductsPaginatedReturn } from '@/hooks';

const mockPush = jest.fn();
const mockUseAllProductsPaginated = jest.fn<() => UseAllProductsPaginatedReturn>();

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

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: {
      id: 'u1',
      full_name: 'Test',
      avatar_url: null,
      email: 'test@test.com',
    },
  }),
}));

jest.mock('@/components/elements/ProductCard', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({ item }: { item: { name: string } }) => <Text>{item.name}</Text>,
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
});
