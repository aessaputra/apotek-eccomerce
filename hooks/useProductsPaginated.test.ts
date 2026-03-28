import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import type { UnknownAction } from '@reduxjs/toolkit';
import appReducer, { appActions } from '@/slices/app.slice';
import {
  type GetProductsOptimizedParams,
  type ProductListItem,
  type ProductListResult,
} from '@/services/home.service';
import { clearDedupedRequests } from '@/utils/requestDeduplication';

const PRODUCTS_PAGE_SIZE = 24;
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

type AppSliceState = ReturnType<typeof appReducer>;
type TestRootState = { app: AppSliceState };

let mockRootState: TestRootState;

const mockDispatch = jest.fn((action: UnknownAction) => {
  mockRootState = {
    app: appReducer(mockRootState.app, action),
  };

  return action;
});

const mockGetProductsOptimized = jest.fn() as jest.MockedFunction<
  (categoryId: string, params?: GetProductsOptimizedParams) => Promise<ProductListResult>
>;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: TestRootState) => unknown) => selector(mockRootState),
}));

jest.mock('@/services', () => ({
  __esModule: true,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_CACHE_TTL_MS,
  getProductsOptimized: mockGetProductsOptimized,
}));

const { useProductsPaginated } = require('./useProductsPaginated');

function createProduct(index: number): ProductListItem {
  return {
    id: `product-${index}`,
    name: `Product ${index}`,
    price: 10000 + index,
    category_id: 'category-1',
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    images: [{ url: `https://cdn.example.com/${index}.jpg`, sort_order: 0 }],
  };
}

function createProducts(count: number, startIndex = 0): ProductListItem[] {
  return Array.from({ length: count }, (_, index) => createProduct(startIndex + index));
}

function createMetrics(
  overrides: Partial<{
    fetchedAt: number;
    hasMore: boolean;
    payloadBytes: number;
    durationMs: number;
  }> = {},
) {
  return {
    durationMs: overrides.durationMs ?? 90,
    payloadBytes: overrides.payloadBytes ?? 4096,
    fetchedAt: overrides.fetchedAt ?? Date.now(),
    offset: 0,
    limit: PRODUCTS_PAGE_SIZE,
    hasMore: overrides.hasMore ?? true,
  };
}

describe('useProductsPaginated', () => {
  beforeEach(() => {
    clearDedupedRequests();
    mockRootState = { app: appReducer(undefined, { type: 'TEST_INIT' }) };
    mockDispatch.mockClear();
    mockGetProductsOptimized.mockReset();
  });

  test('uses fresh cached products without refetching', async () => {
    const cachedProducts = createProducts(24);

    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertProductsCachePage({
          categoryId: 'category-1',
          items: cachedProducts,
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now(),
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    const { result, rerender } = renderHook(() => useProductsPaginated('category-1'));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    expect(mockGetProductsOptimized).not.toHaveBeenCalled();
    expect(result.current.products).toHaveLength(24);
  });

  test('revalidates stale cached products and replaces the cache', async () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertProductsCachePage({
          categoryId: 'category-1',
          items: createProducts(24),
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now() - PRODUCTS_CACHE_TTL_MS - 1000,
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    mockGetProductsOptimized.mockResolvedValue({
      data: createProducts(24, 100),
      error: null,
      metrics: createMetrics({ fetchedAt: Date.now(), payloadBytes: 1024 }),
    });

    const { result, rerender } = renderHook(() => useProductsPaginated('category-1'));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    expect(mockGetProductsOptimized).toHaveBeenCalledTimes(1);
    expect(mockRootState.app.productsCache['category-1']?.items[0]?.id).toBe('product-100');
  });

  test('dedupes duplicate loadMore calls and appends the next page', async () => {
    mockGetProductsOptimized
      .mockResolvedValueOnce({
        data: createProducts(24),
        error: null,
        metrics: createMetrics({ hasMore: true, payloadBytes: 2000 }),
      })
      .mockResolvedValueOnce({
        data: createProducts(24, 24),
        error: null,
        metrics: createMetrics({ hasMore: true, payloadBytes: 1900 }),
      });

    const { result, rerender } = renderHook(() => useProductsPaginated('category-1'));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    await act(async () => {
      await Promise.all([result.current.loadMore(), result.current.loadMore()]);
    });
    rerender({});

    expect(mockGetProductsOptimized).toHaveBeenCalledTimes(2);
    expect(mockRootState.app.productsCache['category-1']?.items).toHaveLength(48);
    expect(mockRootState.app.productsCache['category-1']?.items[0]?.id).toBe('product-47');
  });

  test('refresh invalidates cached products and replaces them with the newest page', async () => {
    mockRootState = {
      app: appReducer(
        mockRootState.app,
        appActions.upsertProductsCachePage({
          categoryId: 'category-1',
          items: createProducts(24),
          offset: 0,
          hasMore: true,
          fetchedAt: Date.now(),
          payloadBytes: 2048,
          durationMs: 90,
          replace: true,
        }),
      ),
    };

    mockGetProductsOptimized.mockResolvedValue({
      data: createProducts(24, 200),
      error: null,
      metrics: createMetrics({ fetchedAt: Date.now(), hasMore: false, payloadBytes: 1200 }),
    });

    const { result, rerender } = renderHook(() => useProductsPaginated('category-1'));

    await act(async () => {
      await result.current.refresh();
    });
    rerender({});

    expect(mockRootState.app.productsCache['category-1']?.items[0]?.id).toBe('product-200');
    expect(result.current.hasMore).toBe(false);
  });

  test('does not request another page when the last full page reports hasMore false', async () => {
    mockGetProductsOptimized.mockResolvedValue({
      data: createProducts(24),
      error: null,
      metrics: createMetrics({ hasMore: false, payloadBytes: 1800 }),
    });

    const { result, rerender } = renderHook(() => useProductsPaginated('category-1'));

    await act(async () => {
      await result.current.refreshIfNeeded();
    });
    rerender({});

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetProductsOptimized).toHaveBeenCalledTimes(1);
    expect(result.current.hasMore).toBe(false);
  });
});
