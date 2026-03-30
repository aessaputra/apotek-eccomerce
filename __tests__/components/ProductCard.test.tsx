import { test, expect, jest } from '@jest/globals';
import { fireEvent, render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import ProductCard, { ProductCardSkeleton } from '@/components/elements/ProductCard/ProductCard';
import type { ProductWithImages } from '@/services/home.service';

jest.mock('@/services/home.service', () => ({
  formatPrice: (price: number) => `Rp ${price.toLocaleString('id-ID')}`,
  getPrimaryImageUrl: (product: { images?: { url: string }[] }) => product.images?.[0]?.url ?? null,
}));

const mockProduct: ProductWithImages = {
  id: '1',
  name: 'Test Product',
  slug: 'test-product',
  price: 50000,
  weight: 250,
  stock: 10,
  is_active: true,
  category_id: 'cat1',
  images: [{ url: 'https://example.com/image.jpg', sort_order: 0 }],
  description: 'Test description',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('<ProductCard />', () => {
  test('renders correctly with product data', async () => {
    render(
      <ProductCard
        item={mockProduct}
        width={150}
        iconColor="$primary"
        onPress={() => {}}
        onAddToCart={() => {}}
      />,
    );

    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(
      <ProductCard
        item={mockProduct}
        width={150}
        iconColor="$primary"
        onPress={() => {}}
        onAddToCart={() => {}}
      />,
    );

    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  test('calls onPress when card pressed', async () => {
    const onPress = jest.fn();
    render(
      <ProductCard
        item={mockProduct}
        width={150}
        iconColor="$primary"
        onPress={onPress}
        onAddToCart={() => {}}
      />,
    );

    fireEvent.press(screen.getByText('Test Product'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('calls onAddToCart when add button pressed', async () => {
    const onAddToCart = jest.fn();
    render(
      <ProductCard
        item={mockProduct}
        width={150}
        iconColor="$primary"
        onPress={() => {}}
        onAddToCart={onAddToCart}
      />,
    );

    const addButton = screen.getByLabelText(/Add Test Product to cart/i);
    fireEvent(addButton, 'press', { stopPropagation: jest.fn() });

    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });
});

describe('<ProductCardSkeleton />', () => {
  test('renders skeleton cards', async () => {
    render(<ProductCardSkeleton width={150} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(<ProductCardSkeleton width={150} />);

    expect(screen.toJSON()).toBeTruthy();
  });
});
