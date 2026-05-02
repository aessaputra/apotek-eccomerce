import React from 'react';
import { ScrollView } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import OrdersDefault, { AllOrders as AllOrdersExport } from '@/scenes/orders';
import AllOrdersScene from '@/scenes/orders/AllOrders';
import type { UseOrdersLandingDataReturn } from '@/hooks/useOrdersLandingData';
import type { PastPurchaseProduct } from '@/services';

const mockPush = jest.fn();
const mockAddProductToCart = jest.fn();
const mockOrderStatusTabs = jest.fn();
const mockBuyAgainCarousel = jest.fn();
const mockUseOrdersLandingData = jest.fn<UseOrdersLandingDataReturn, [string | undefined]>();
const mockUseAppSlice = jest.fn();

type OrderStatusTabsProps = {
  counts: {
    unpaid: number;
    packing: number;
    shipped: number;
    completed: number;
    cancelled: number;
  };
  onTabChange: (tab: 'all' | 'unpaid' | 'packing' | 'shipped' | 'completed' | 'cancelled') => void;
};

type BuyAgainCarouselProps = {
  products: PastPurchaseProduct[];
  isLoading?: boolean;
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

jest.mock('@/scenes/orders/AllOrders', () => {
  const MockAllOrders = () => null;

  return {
    __esModule: true,
    default: MockAllOrders,
    AllOrders: MockAllOrders,
  };
});

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
  addProductToCart: (...args: unknown[]) => mockAddProductToCart(...args),
}));

jest.mock('@/hooks/useOrdersLandingData', () => ({
  useOrdersLandingData: (userId: string | undefined) => mockUseOrdersLandingData(userId),
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
    mockAddProductToCart.mockReset();
    mockOrderStatusTabs.mockClear();
    mockBuyAgainCarousel.mockClear();
    mockUseOrdersLandingData.mockReset();
    mockUseAppSlice.mockReset();

    mockUseOrdersLandingData.mockReturnValue({
      counts: {
        unpaid: 2,
        packing: 3,
        shipped: 4,
        completed: 1,
        cancelled: 5,
      },
      error: null,
      pastProducts: [],
      isLoadingCounts: false,
      isLoadingPastProducts: false,
      isRefreshing: false,
      refresh: jest.fn(() => Promise.resolve()),
    });
    mockAddProductToCart.mockResolvedValue({ error: null });
  });

  test('keeps landing content as the default scene export and all orders as a named export', () => {
    expect(OrdersDefault).not.toBe(AllOrdersScene);
    expect(AllOrdersExport).toBe(AllOrdersScene);
  });

  test('passes the legacy landing hook counts directly to the order tabs', () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

    const orderStatusTabsProps = getLatestOrderStatusTabsProps();

    expect(orderStatusTabsProps.counts).toEqual({
      unpaid: 2,
      packing: 3,
      shipped: 4,
      completed: 1,
      cancelled: 5,
    });
  });

  test('renders landing content inside a vertical scroll container', () => {
    mockUseOrdersLandingData.mockReturnValue({
      counts: { unpaid: 0, packing: 0, shipped: 0, completed: 0, cancelled: 0 },
      pastProducts: [],
      isLoadingCounts: true,
      isLoadingPastProducts: true,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    const { UNSAFE_getByType } = render(<OrdersDefault />);

    const scrollView = UNSAFE_getByType(ScrollView);

    expect(scrollView.props.style).toEqual({ flex: 1 });
    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingTop: 16,
      paddingBottom: 24,
      flexGrow: 1,
    });
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);

    const buyAgainCarouselProps = getLatestBuyAgainCarouselProps();
    expect(buyAgainCarouselProps.isLoading).toBe(true);
  });

  test('navigates to the completed tab without mutating local badge state', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const orderStatusTabsProps = getLatestOrderStatusTabsProps();

    act(() => {
      orderStatusTabsProps.onTabChange('completed');
    });

    expect(mockPush).toHaveBeenCalledWith('/orders/completed');
  });

  test('navigates to all orders when the all tab is selected from the landing scene', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const orderStatusTabsProps = getLatestOrderStatusTabsProps();

    act(() => {
      orderStatusTabsProps.onTabChange('all');
    });

    expect(mockPush).toHaveBeenCalledWith('/orders/all');
  });

  test('navigates to the cancelled tab when selected from order tabs', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const orderStatusTabsProps = getLatestOrderStatusTabsProps();

    act(() => {
      orderStatusTabsProps.onTabChange('cancelled');
    });

    expect(mockPush).toHaveBeenCalledWith('/orders/cancelled');
  });

  test('passes only the first two past products to the buy again carousel', async () => {
    const firstProduct = createPastProduct({ id: 'product-1', name: 'Vitamin C' });
    const secondProduct = createPastProduct({ id: 'product-2', name: 'Paracetamol' });
    const thirdProduct = createPastProduct({ id: 'product-3', name: 'Obat Batuk' });

    mockUseOrdersLandingData.mockReturnValue({
      counts: { unpaid: 0, packing: 0, shipped: 0, completed: 0, cancelled: 0 },
      pastProducts: [firstProduct, secondProduct, thirdProduct],
      isLoadingCounts: false,
      isLoadingPastProducts: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

    const buyAgainCarouselProps = getLatestBuyAgainCarouselProps();

    expect(buyAgainCarouselProps.products).toEqual([firstProduct, secondProduct]);
  });

  test('shows a success dialog after buy again adds a product to cart', async () => {
    const product = createPastProduct();

    mockUseOrdersLandingData.mockReturnValue({
      counts: { unpaid: 0, packing: 0, shipped: 0, completed: 0, cancelled: 0 },
      pastProducts: [product],
      isLoadingCounts: false,
      isLoadingPastProducts: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

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

    mockUseOrdersLandingData.mockReturnValue({
      counts: { unpaid: 0, packing: 0, shipped: 0, completed: 0, cancelled: 0 },
      pastProducts: [product],
      isLoadingCounts: false,
      isLoadingPastProducts: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
    });

    render(<OrdersDefault />);

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
