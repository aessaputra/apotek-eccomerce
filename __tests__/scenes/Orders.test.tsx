import React from 'react';
import { act, render, waitFor } from '@/test-utils/renderWithTheme';
import Orders from '@/scenes/orders/Orders';

const mockPush = jest.fn();
const mockGetOrderTabCounts = jest.fn();
const mockGetPastPurchasedProducts = jest.fn();
const mockAddProductToCart = jest.fn();
const mockOrderStatusTabs = jest.fn(() => null);
const mockUseAppSlice = jest.fn();

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
  BuyAgainCarousel: () => null,
}));

describe('<Orders />', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetOrderTabCounts.mockReset();
    mockGetPastPurchasedProducts.mockReset();
    mockAddProductToCart.mockReset();
    mockOrderStatusTabs.mockClear();
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
      const lastCall = mockOrderStatusTabs.mock.calls.at(-1)?.[0] as {
        counts: { unpaid: number; packing: number; shipped: number; completed: number };
      };

      expect(lastCall.counts).toEqual({
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

    const lastCall = mockOrderStatusTabs.mock.calls.at(-1)?.[0] as {
      onTabChange: (tab: 'unpaid' | 'packing' | 'shipped' | 'completed') => void;
    };

    act(() => {
      lastCall.onTabChange('completed');
    });

    expect(markCompletedOrdersTabViewed).toHaveBeenCalledWith('user-1');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'app/markCompletedOrdersTabViewed',
      payload: 'user-1',
    });
    expect(mockPush).toHaveBeenCalledWith('/orders/completed');
  });
});
