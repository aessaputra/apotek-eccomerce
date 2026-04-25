import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import { BuyAgainCarousel } from '@/components/elements/BuyAgainCarousel';
import type { PastPurchaseProduct } from '@/services/order.service';

jest.mock('@/services/home.service', () => ({
  formatPrice: (price: number) => `Rp ${price.toLocaleString('id-ID')}`,
}));

function createPastProduct(overrides: Partial<PastPurchaseProduct> = {}): PastPurchaseProduct {
  return {
    id: 'product-1',
    name: 'Vitamin C',
    slug: 'vitamin-c',
    imageUrl: null,
    price: 25000,
    ...overrides,
  };
}

describe('<BuyAgainCarousel />', () => {
  test('renders nothing when there are no products', () => {
    render(<BuyAgainCarousel products={[]} onProductPress={() => {}} onAddToCart={() => {}} />);

    expect(screen.queryByText('Beli Lagi')).toBeNull();
  });

  test('renders product cards with prices', () => {
    render(
      <BuyAgainCarousel
        products={[
          createPastProduct(),
          createPastProduct({ id: 'product-2', name: 'Paracetamol', price: 12000 }),
        ]}
        onProductPress={() => {}}
        onAddToCart={() => {}}
      />,
    );

    expect(screen.getByText('Beli Lagi')).toBeTruthy();
    expect(screen.getByText('Vitamin C')).toBeTruthy();
    expect(screen.getByText('Rp 25.000')).toBeTruthy();
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Rp 12.000')).toBeTruthy();
  });

  test('delegates product and add-to-cart presses', () => {
    const product = createPastProduct();
    const onProductPress = jest.fn<(product: PastPurchaseProduct) => void>();
    const onAddToCart = jest.fn<(product: PastPurchaseProduct) => void>();

    render(
      <BuyAgainCarousel
        products={[product]}
        onProductPress={onProductPress}
        onAddToCart={onAddToCart}
      />,
    );

    fireEvent.press(screen.getByLabelText('Beli lagi Vitamin C'));
    fireEvent(screen.getByLabelText('Tambah Vitamin C ke keranjang'), 'press', {
      stopPropagation: jest.fn(),
    });

    expect(onProductPress).toHaveBeenCalledWith(product);
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });
});
