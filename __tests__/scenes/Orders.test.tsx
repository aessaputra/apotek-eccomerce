import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Orders from '@/scenes/orders/Orders';
import type { PastPurchaseProduct } from '@/services';

const mockPush = jest.fn();
const mockGetOrderTabCounts = jest.fn();
const mockGetPastPurchasedProducts = jest.fn();
const mockAddProductToCart = jest.fn();
const mockOrderStatusTabs = jest.fn();
const mockBuyAgainCarousel = jest.fn();
const mockUseAppSlice = jest.fn();

type OrderStatusTabsProps = {
  counts: { unpaid: number; packing: number; shipped: number; completed: number };
  onTabChange: (tab: 'unpaid' | 'packing' | 'shipped' | 'completed') => void;
};

type BuyAgainCarouselProps = {
  products: PastPurchaseProduct[];
  onProductPress: (product: PastPurchaseProduct) => void;
  onAddToCart: (product: PastPurchaseProduct) => Promise<void>;
};

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

function getLatestOrderStatusTabsProps() {
  const props = mockOrderStatusTabs.mock.calls.at(-1)?.[0];
  if (!props) {
    throw new Error('OrderStatusTabs was not called');
  }

  return props as OrderStatusTabsProps;
}

function getLatestBuyAgainCarouselProps() {
  const props = mockBuyAgainCarousel.mock.calls.at(-1)?.[0];
  if (!props) {
    throw new Error('BuyAgainCarousel was not called');
  }

  return props as BuyAgainCarouselProps;
}

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
  useFocusEffect: (callback: () => void) => {
    callback();
  },
}));

jest.mock('@/services', () => ({
  getOrderTabCounts: (...args: unknown[]) => mockGetOrderTabCounts(...args),
  getPastPurchasedProducts: (...args: unknown[]) => mockGetPastPurchasedProducts(...args),
  addProductToCart: (...args: unknown[]) => mockAddProductToCart(...args),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => mockUseAppSlice(),
}));

jest.mock('@/components/elements/OrderStatusTabs', () => ({
  OrderStatusTabs: (props: unknown) => mockOrderStatusTabs(props),
}));

jest.mock('@/components/elements/OrdersHeroCard', () => ({
  OrdersHeroCard: () => null,
}));

jest.mock('@/components/elements/BuyAgainCarousel', () => ({
  BuyAgainCarousel: (props: unknown) => mockBuyAgainCarousel(props),
}));

describe('<Orders />', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetOrderTabCounts.mockReset();
    mockGetPastPurchasedProducts.mockReset();
    mockAddProductToCart.mockReset();
    mockOrderStatusTabs.mockClear();
    mockBuyAgainCarousel.mockClear();
    mockUseAppSlice.mockReset();

    mockGetOrderTabCounts.mockResolvedValue({
      data: {
        unpaid: 2,
        packing: 3,
        shipped: 4,
        completed: 1,
      },
      error: null,
    });
    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [],
      error: null,
    });
    mockAddProductToCart.mockResolvedValue({ error: null });
  });

  test('passes the fetched counts directly to the order tabs', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<Orders />);

    await waitFor(() => {
      const orderStatusTabsProps = getLatestOrderStatusTabsProps();

      expect(orderStatusTabsProps.counts).toEqual({
        unpaid: 2,
        packing: 3,
        shipped: 4,
        completed: 1,
      });
    });
  });

  test('navigates to the completed tab without mutating local badge state', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const orderStatusTabsProps = getLatestOrderStatusTabsProps();

    act(() => {
      orderStatusTabsProps.onTabChange('completed');
    });

    expect(mockPush).toHaveBeenCalledWith('/orders/completed');
  });

  test('passes only the first two past products to the buy again carousel', async () => {
    const firstProduct = createPastProduct({ id: 'product-1', name: 'Vitamin C' });
    const secondProduct = createPastProduct({ id: 'product-2', name: 'Paracetamol' });
    const thirdProduct = createPastProduct({ id: 'product-3', name: 'Obat Batuk' });

    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [firstProduct, secondProduct, thirdProduct],
      error: null,
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<Orders />);

    await waitFor(() => {
      const buyAgainCarouselProps = getLatestBuyAgainCarouselProps();

      expect(buyAgainCarouselProps.products).toEqual([firstProduct, secondProduct]);
    });
  });

  test('shows a success dialog after buy again adds a product to cart', async () => {
    const product = createPastProduct();

    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [product],
      error: null,
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockBuyAgainCarousel).toHaveBeenCalled();
    });

    const buyAgainCarouselProps = getLatestBuyAgainCarouselProps();

    await act(async () => {
      await buyAgainCarouselProps.onAddToCart(product);
    });

    await waitFor(() => {
      expect(screen.getByText('Vitamin C berhasil ditambahkan ke keranjang')).toBeTruthy();
    });

    expect(mockAddProductToCart).toHaveBeenCalledWith('user-1', 'product-1', 1);

    fireEvent.press(screen.getByText('OK'));

    await waitFor(() => {
      expect(screen.queryByText('Vitamin C berhasil ditambahkan ke keranjang')).toBeNull();
    });
  });

  test('navigates buy again product presses to product details with the product id', async () => {
    const product = createPastProduct();

    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [product],
      error: null,
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockBuyAgainCarousel).toHaveBeenCalled();
    });

    const buyAgainCarouselProps = getLatestBuyAgainCarouselProps();

    act(() => {
      buyAgainCarouselProps.onProductPress(product);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/product-details',
      params: { id: 'product-1', name: 'Vitamin C' },
    });
  });
});
