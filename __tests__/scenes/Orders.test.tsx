import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Orders from '@/scenes/orders/Orders';
import type { PastPurchaseProduct } from '@/services';
import { TAB_BAR_HEIGHT } from '@/constants/ui';

const mockPush = jest.fn();
const mockGetOrderTabCounts = jest.fn();
const mockGetPastPurchasedProducts = jest.fn();
const mockAddProductToCart = jest.fn();
const mockOrderStatusTabs = jest.fn();
const mockBuyAgainCarousel = jest.fn();
const mockUseAppSlice = jest.fn();
const mockSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');

    React.useEffect(() => {
      callback();
    }, [callback]);
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

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => mockSafeAreaInsets,
  };
});

describe('<Orders />', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetOrderTabCounts.mockReset();
    mockGetPastPurchasedProducts.mockReset();
    mockAddProductToCart.mockReset();
    mockOrderStatusTabs.mockClear();
    mockBuyAgainCarousel.mockClear();
    mockUseAppSlice.mockReset();
    mockSafeAreaInsets.top = 0;
    mockSafeAreaInsets.right = 0;
    mockSafeAreaInsets.bottom = 0;
    mockSafeAreaInsets.left = 0;

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

  const getFlattenedContentContainerStyle = () => {
    const scrollView = screen.getByTestId('orders-scroll-view');

    return StyleSheet.flatten(scrollView.props.contentContainerStyle);
  };

  test('keeps only the completed badge hidden after the completed tab was viewed', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: { 'user-1': true },
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      const lastCall = mockOrderStatusTabs.mock.calls.at(-1)?.[0];
      if (!lastCall) {
        throw new Error('OrderStatusTabs was not called');
      }

      const orderStatusTabsProps = lastCall as {
        counts: { unpaid: number; packing: number; shipped: number; completed: number };
      };

      expect(orderStatusTabsProps.counts).toEqual({
        unpaid: 2,
        packing: 3,
        shipped: 4,
        completed: 0,
      });
    });
  });

  test('marks completed tab as viewed before navigating to it', async () => {
    const dispatch = jest.fn();
    const markCompletedOrdersTabViewed = jest.fn((userId: string) => ({
      type: 'app/markCompletedOrdersTabViewed',
      payload: userId,
    }));

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch,
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed,
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const lastCall = mockOrderStatusTabs.mock.calls.at(-1)?.[0];
    if (!lastCall) {
      throw new Error('OrderStatusTabs was not called');
    }

    const orderStatusTabsProps = lastCall as {
      onTabChange: (tab: 'unpaid' | 'packing' | 'shipped' | 'completed') => void;
    };

    act(() => {
      orderStatusTabsProps.onTabChange('completed');
    });

    expect(markCompletedOrdersTabViewed).toHaveBeenCalledWith('user-1');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'app/markCompletedOrdersTabViewed',
      payload: 'user-1',
    });
    expect(mockPush).toHaveBeenCalledWith('/orders/completed');
  });

  test('shows a success dialog after buy again adds a product to cart', async () => {
    const product: PastPurchaseProduct = {
      id: 'product-1',
      name: 'Vitamin C',
      slug: 'vitamin-c',
      imageUrl: null,
      price: 25000,
    };

    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [product],
      error: null,
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockBuyAgainCarousel).toHaveBeenCalled();
    });

    const lastCall = mockBuyAgainCarousel.mock.calls.at(-1)?.[0];
    if (!lastCall) {
      throw new Error('BuyAgainCarousel was not called');
    }

    const buyAgainCarouselProps = lastCall as {
      onAddToCart: (product: PastPurchaseProduct) => Promise<void>;
    };

    await act(async () => {
      await buyAgainCarouselProps.onAddToCart(product);
    });

    await waitFor(() => {
      expect(screen.getByText('Vitamin C berhasil ditambahkan ke keranjang')).toBeTruthy();
    });
  });

  test('navigates buy again product presses to product details with the product id', async () => {
    const product: PastPurchaseProduct = {
      id: 'product-1',
      name: 'Vitamin C',
      slug: 'vitamin-c',
      imageUrl: null,
      price: 25000,
    };

    mockGetPastPurchasedProducts.mockResolvedValue({
      data: [product],
      error: null,
    });

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockBuyAgainCarousel).toHaveBeenCalled();
    });

    const lastCall = mockBuyAgainCarousel.mock.calls.at(-1)?.[0];
    if (!lastCall) {
      throw new Error('BuyAgainCarousel was not called');
    }

    const buyAgainCarouselProps = lastCall as {
      onProductPress: (product: PastPurchaseProduct) => void;
    };

    act(() => {
      buyAgainCarouselProps.onProductPress(product);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/product-details',
      params: { id: 'product-1', name: 'Vitamin C' },
    });
  });

  test('adds bottom spacing so Pesanan content clears the tab bar', async () => {
    mockSafeAreaInsets.bottom = 24;

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    expect(getFlattenedContentContainerStyle()).toEqual(
      expect.objectContaining({
        paddingTop: 16,
        paddingBottom: TAB_BAR_HEIGHT + 24 + 16,
        flexGrow: 1,
      }),
    );
  });

  test('renders Pesanan content inside the vertical scroll container', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockOrderStatusTabs).toHaveBeenCalled();
    });

    const scrollView = screen.getByTestId('orders-scroll-view');

    expect(scrollView).toBeTruthy();
  });

  test('loads Pantau Pesanan and Beli Lagi data once on initial entry', async () => {
    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      expect(mockGetOrderTabCounts).toHaveBeenCalledTimes(1);
      expect(mockGetPastPurchasedProducts).toHaveBeenCalledTimes(1);
    });

    expect(mockGetOrderTabCounts).toHaveBeenCalledWith('user-1');
    expect(mockGetPastPurchasedProducts).toHaveBeenCalledWith('user-1', 2);
  });

  test('shows Beli Lagi loading state before past products finish loading', async () => {
    let resolvePastProducts:
      | ((value: { data: PastPurchaseProduct[]; error: null }) => void)
      | null = null;

    mockGetPastPurchasedProducts.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvePastProducts = resolve;
        }),
    );

    mockUseAppSlice.mockReturnValue({
      user: { id: 'user-1' },
      dispatch: jest.fn(),
      completedOrdersTabViewedByUser: {},
      markCompletedOrdersTabViewed: jest.fn((userId: string) => ({
        type: 'app/markCompletedOrdersTabViewed',
        payload: userId,
      })),
    });

    render(<Orders />);

    await waitFor(() => {
      const lastCall = mockBuyAgainCarousel.mock.calls.at(-1)?.[0] as
        | { isLoading?: boolean }
        | undefined;

      expect(lastCall?.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePastProducts?.({ data: [], error: null });
    });

    await waitFor(() => {
      const lastCall = mockBuyAgainCarousel.mock.calls.at(-1)?.[0] as
        | { isLoading?: boolean }
        | undefined;

      expect(lastCall?.isLoading).toBe(false);
    });
  });
});
