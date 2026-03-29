import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, waitFor } from '@/test-utils/renderWithTheme';
import ProductDetails from './ProductDetails';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockGetProductDetailsById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAddProductToCart = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  useLocalSearchParams: () => ({
    id: 'product-1',
  }),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/services/home.service', () => ({
  formatPrice: (value: number) => `Rp ${value}`,
  getPrimaryImageUrl: () => null,
  getProductDetailsById: (...args: unknown[]) => mockGetProductDetailsById(...args),
  addProductToCart: (...args: unknown[]) => mockAddProductToCart(...args),
}));

jest.mock('@/components/elements/QuantitySelector', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: () => <Text>Quantity Selector</Text>,
  };
});

jest.mock('@/components/elements/ProductImageGallery', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: () => <Text>Product Image Gallery</Text>,
  };
});

describe('<ProductDetails />', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockAddProductToCart.mockClear();
    mockGetProductDetailsById.mockReset();
    mockGetProductDetailsById.mockResolvedValue({
      id: 'product-1',
      name: 'Paracetamol 500mg',
      category_name: 'Pain Relief',
      category_logo_url: 'https://cdn.example.com/categories/pain-relief.png',
      description: 'Relieves mild to moderate pain.',
      price: 12000,
      stock: 8,
      images: [],
    });
  });

  it('renders the category logo badge in light mode', async () => {
    render(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-category-logo')).not.toBeNull();
      expect(screen.getByText('Pain Relief')).not.toBeNull();
    });

    const badge = screen.getByTestId('product-category-badge');
    const logo = screen.getByTestId('product-category-logo');
    const label = screen.getByTestId('product-category-label');

    expect(badge).not.toBeNull();
    expect(logo.props.source).toEqual({
      uri: 'https://cdn.example.com/categories/pain-relief.png',
    });
    expect(label.props.children).toBe('Pain Relief');
  });

  it('renders the category logo badge in dark mode', async () => {
    renderWithDarkTheme(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-category-logo')).not.toBeNull();
      expect(screen.getByText('Pain Relief')).not.toBeNull();
    });

    const badge = screen.getByTestId('product-category-badge');
    const logo = screen.getByTestId('product-category-logo');
    const label = screen.getByTestId('product-category-label');

    expect(badge).not.toBeNull();
    expect(logo.props.source).toEqual({
      uri: 'https://cdn.example.com/categories/pain-relief.png',
    });
    expect(label.props.children).toBe('Pain Relief');
  });

  it('falls back to the default category icon when no logo is available', async () => {
    mockGetProductDetailsById.mockResolvedValue({
      id: 'product-1',
      name: 'Paracetamol 500mg',
      category_name: 'Pain Relief',
      category_logo_url: null,
      description: 'Relieves mild to moderate pain.',
      price: 12000,
      stock: 8,
      images: [],
    });

    render(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByTestId('product-category-fallback')).not.toBeNull();
      expect(screen.getByText('Pain Relief')).not.toBeNull();
    });

    expect(screen.queryByTestId('product-category-logo')).toBeNull();
    expect(screen.getByTestId('product-category-label').props.children).toBe('Pain Relief');
  });
});
