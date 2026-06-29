import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { OrderTabCounts, PastPurchaseProduct } from '@/services/order.service';
import { clearDedupedRequests } from '@/utils/requestDeduplication';

const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

const mockGetOrderTabCounts = jest.fn() as jest.MockedFunction<
  (userId: string) => Promise<{ data: OrderTabCounts | null; error: Error | null }>
>;
const mockGetPastPurchasedProducts = jest.fn() as jest.MockedFunction<
  (userId: string) => Promise<{ data: PastPurchaseProduct[]; error: Error | null }>
>;

let mockLatestFocusCallback: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockLatestFocusCallback = callback;
  },
}));

jest.mock('@/services', () => ({
  __esModule: true,
  ORDERS_CACHE_TTL_MS,
  getOrderTabCounts: mockGetOrderTabCounts,
  getPastPurchasedProducts: mockGetPastPurchasedProducts,
}));

const {
  clearOrdersLandingDataCache,
  useOrdersLandingData,
} = require('@/hooks/useOrdersLandingData');

function createCounts(): OrderTabCounts {
  return {
    unpaid: 1,
    packing: 2,
    shipped: 3,
    completed: 4,
    cancelled: 5,
  };
}

function createPastProduct(): PastPurchaseProduct {
  return {
    id: 'product-1',
    name: 'Vitamin C',
    slug: 'vitamin-c',
    price: 25000,
    imageUrl: null,
  };
}

describe('useOrdersLandingData', () => {
  beforeEach(() => {
    clearDedupedRequests();
    clearOrdersLandingDataCache();
    mockLatestFocusCallback = null;
    mockGetOrderTabCounts.mockReset();
    mockGetPastPurchasedProducts.mockReset();
  });

  it('dedupes repeated focus loads while the landing request is still in flight', async () => {
    const counts = createCounts();
    const products = [createPastProduct()];
    let resolveCounts:
      | ((value: { data: OrderTabCounts | null; error: Error | null }) => void)
      | null = null;
    let resolveProducts:
      | ((value: { data: PastPurchaseProduct[]; error: Error | null }) => void)
      | null = null;

    mockGetOrderTabCounts.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCounts = resolve;
        }),
    );
    mockGetPastPurchasedProducts.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveProducts = resolve;
        }),
    );

    const { result } = renderHook(() => useOrdersLandingData('user-1'));

    act(() => {
      mockLatestFocusCallback?.();
      mockLatestFocusCallback?.();
      mockLatestFocusCallback?.();
    });

    expect(mockGetOrderTabCounts).toHaveBeenCalledTimes(1);
    expect(mockGetPastPurchasedProducts).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCounts?.({ data: counts, error: null });
      resolveProducts?.({ data: products, error: null });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.counts).toEqual(counts);
      expect(result.current.pastProducts).toEqual(products);
    });
  });
});
