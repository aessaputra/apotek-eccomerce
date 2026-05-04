import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { OrderTabCounts } from '@/services/order.service';
import { clearDedupedRequests } from '@/utils/requestDeduplication';

const ORDERS_CACHE_TTL_MS = 5 * 60 * 1000;

const mockGetOrderTabCounts = jest.fn() as jest.MockedFunction<
  (userId: string) => Promise<{ data: OrderTabCounts | null; error: Error | null }>
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
}));

const { clearOrderTabCountsCache, useOrderTabCounts } = require('@/hooks/useOrderTabCounts');

function createCounts(): OrderTabCounts {
  return {
    unpaid: 1,
    packing: 2,
    shipped: 3,
    completed: 4,
    cancelled: 5,
  };
}

describe('useOrderTabCounts', () => {
  beforeEach(() => {
    clearDedupedRequests();
    clearOrderTabCountsCache();
    mockLatestFocusCallback = null;
    mockGetOrderTabCounts.mockReset();
  });

  it('returns zero counts while loading and resolves the service counts on focus', async () => {
    const counts = createCounts();

    mockGetOrderTabCounts.mockResolvedValue({ data: counts, error: null });

    const { result } = renderHook(() => useOrderTabCounts('user-1'));

    expect(result.current.counts).toEqual({
      unpaid: 0,
      packing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      mockLatestFocusCallback?.();
    });

    await waitFor(() => {
      expect(result.current.counts).toEqual(counts);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockGetOrderTabCounts).toHaveBeenCalledWith('user-1');
  });

  it('falls back to zero counts and surfaces the error message when loading fails', async () => {
    mockGetOrderTabCounts.mockResolvedValue({
      data: null,
      error: new Error('failed to load counts'),
    });

    const { result } = renderHook(() => useOrderTabCounts('user-1'));

    act(() => {
      mockLatestFocusCallback?.();
    });

    await waitFor(() => {
      expect(result.current.counts).toEqual({
        unpaid: 0,
        packing: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('failed to load counts');
    });
  });
});
