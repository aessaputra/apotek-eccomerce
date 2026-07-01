import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  renderWithDarkTheme,
  screen,
  waitFor,
} from '@/test-utils/renderWithTheme';
import ProductDetails from '@/scenes/product-details/ProductDetails';

jest.setTimeout(15000);

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockGetProductDetailsById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAddProductToCart = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockToastShow = jest.fn();

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
}));

jest.mock('@/services/cart.service', () => ({
  addProductToCart: (...args: unknown[]) => mockAddProductToCart(...args),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({
    show: mockToastShow,
  }),
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
    mockToastShow.mockClear();
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

  it('shows error state when product fetch throws', async () => {
    mockGetProductDetailsById.mockRejectedValue(new Error('Network error'));

    render(<ProductDetails />);

    expect(await screen.findByText('Gagal memuat detail produk. Silakan coba lagi.')).toBeTruthy();
  });

  it('shows a toast and stays on the product detail scene after adding to cart', async () => {
    mockAddProductToCart.mockResolvedValue({ error: null });

    render(<ProductDetails />);

    expect(await screen.findByText('Tambah Keranjang')).toBeTruthy();

    fireEvent.press(screen.getByText('Tambah Keranjang'));
    fireEvent.press(await screen.findByLabelText('Konfirmasi tambah ke keranjang'));

    await waitFor(() => {
      expect(mockAddProductToCart).toHaveBeenCalledWith('user-1', 'product-1', 1);
    });

    expect(mockToastShow).toHaveBeenCalledWith('Produk ditambahkan ke keranjang.', {
      message: 'Paracetamol 500mg sudah ada di keranjang.',
      type: 'background',
    });
    expect(screen.queryByText('Produk berhasil ditambahkan')).toBeNull();
    expect(screen.queryByText('Produk berhasil ditambahkan ke keranjang (1 item).')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows a foreground toast and does not open the success dialog when adding to cart fails', async () => {
    mockAddProductToCart.mockResolvedValue({
      error: new Error('Gagal menambahkan produk ke keranjang.'),
    });

    render(<ProductDetails />);

    expect(await screen.findByText('Tambah Keranjang')).toBeTruthy();

    fireEvent.press(screen.getByText('Tambah Keranjang'));
    fireEvent.press(await screen.findByLabelText('Konfirmasi tambah ke keranjang'));

    await waitFor(() => {
      expect(mockAddProductToCart).toHaveBeenCalledWith('user-1', 'product-1', 1);
    });

    expect(mockToastShow).toHaveBeenCalledWith(
      'Produk belum masuk keranjang. Coba lagi sebentar lagi.',
      {
        type: 'foreground',
      },
    );
    expect(screen.queryByText('Produk berhasil ditambahkan')).toBeNull();
    expect(screen.queryByText('Produk berhasil ditambahkan ke keranjang (1 item).')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('labels the favorite button with its action and selected state', async () => {
    render(<ProductDetails />);

    const favoriteButton = await screen.findByLabelText('Tambah ke favorit');
    expect(favoriteButton.props.accessibilityRole).toBe('button');
    expect(favoriteButton.props.accessibilityState?.selected).toBe(false);
  });

  it('announces sheet header as a header for accessibility', async () => {
    render(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText('Tambah Keranjang')).not.toBeNull();
    });

    fireEvent.press(screen.getByText('Tambah Keranjang'));

    const sheetHeader = await screen.findByText('Tambah ke Keranjang');
    expect(sheetHeader.props.accessibilityRole).toBe('header');
  });

  it('shows stock errors through a foreground toast', async () => {
    mockAddProductToCart.mockResolvedValue({
      error: new Error('Stok habis.'),
    });

    render(<ProductDetails />);

    await waitFor(() => {
      expect(screen.getByText('Tambah Keranjang')).not.toBeNull();
    });

    fireEvent.press(screen.getByText('Tambah Keranjang'));
    fireEvent.press(await screen.findByLabelText('Konfirmasi tambah ke keranjang'));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        'Stok produk belum cukup. Periksa jumlah atau pilih produk lain.',
        { type: 'foreground' },
      );
    });
    expect(screen.queryByText('Stok habis.')).toBeNull();
  });
});
