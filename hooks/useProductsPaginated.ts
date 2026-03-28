import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import {
  getProductsOptimized,
  PRODUCTS_CACHE_TTL_MS,
  PRODUCTS_PAGE_SIZE,
  type ProductListItem,
} from '@/services';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < PRODUCTS_CACHE_TTL_MS;
}

function getProductsRequestKey(categoryId: string, offset: number, limit: number): string {
  return `products:${categoryId}:${offset}:${limit}`;
}

function getProductsRequestPrefix(categoryId: string): string {
  return `products:${categoryId}:`;
}

export interface ProductsPerformanceSnapshot {
  lastFetchDurationMs: number;
  lastPayloadBytes: number;
  cacheAgeMs: number | null;
}

export interface UseProductsPaginatedReturn {
  products: ProductListItem[];
  error: string | null;
  hasMore: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  isRevalidating: boolean;
  isUsingCachedData: boolean;
  refresh: () => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  loadMore: () => Promise<void>;
  metrics: ProductsPerformanceSnapshot;
}

interface FetchProductsPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'revalidate' | 'load-more';
}

export function useProductsPaginated(categoryId?: string): UseProductsPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const productsCache = useSelector((state: State) => state.app.productsCache);
  const cacheEntry = categoryId ? productsCache[categoryId] : undefined;

  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(categoryId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const latestMetricsRef = useRef({ lastFetchDurationMs: 0, lastPayloadBytes: 0 });
  const activeRequestIdRef = useRef(0);

  const products = cacheEntry?.items ?? [];
  const hasMore = cacheEntry?.hasMore ?? true;
  const cacheIsFresh = isFresh(cacheEntry?.lastFetchedAt ?? null);

  useEffect(() => {
    setIsInitialLoading(Boolean(categoryId));
    setIsRefreshing(false);
    setIsFetchingMore(false);
    setIsRevalidating(false);
    setLocalError(null);
  }, [categoryId]);

  const fetchProductsPage = useCallback(
    async ({ offset, replace, reason }: FetchProductsPageOptions): Promise<void> => {
      if (!categoryId) {
        setIsInitialLoading(false);
        return;
      }

      const requestKey = getProductsRequestKey(categoryId, offset, PRODUCTS_PAGE_SIZE);
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (replace) {
        cancelDedupedRequests(getProductsRequestPrefix(categoryId));
        setIsRefreshing(false);
        setIsFetchingMore(false);
        setIsRevalidating(false);
      }

      if (reason === 'initial' && products.length === 0) {
        setIsInitialLoading(true);
      }

      if (reason === 'refresh') {
        setIsRefreshing(true);
      }

      if (reason === 'load-more') {
        setIsFetchingMore(true);
      }

      if (reason === 'revalidate') {
        setIsRevalidating(true);
      }

      dispatch(
        appActions.setProductsCacheStatus({
          categoryId,
          status: reason === 'refresh' ? 'refreshing' : 'loading',
          error: null,
        }),
      );

      setLocalError(null);

      try {
        const result = await runDedupedRequest(
          requestKey,
          signal =>
            getProductsOptimized(categoryId, {
              offset,
              limit: PRODUCTS_PAGE_SIZE,
              signal,
            }),
          { policy: replace ? 'replace' : 'dedupe' },
        );

        if (result.error) {
          throw result.error;
        }

        if (!result.data || !result.metrics) {
          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        latestMetricsRef.current = {
          lastFetchDurationMs: result.metrics.durationMs,
          lastPayloadBytes: result.metrics.payloadBytes,
        };

        dispatch(
          appActions.upsertProductsCachePage({
            categoryId,
            items: result.data,
            offset,
            hasMore: result.metrics.hasMore,
            fetchedAt: result.metrics.fetchedAt,
            payloadBytes: result.metrics.payloadBytes,
            durationMs: result.metrics.durationMs,
            replace,
          }),
        );
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load products.';

        dispatch(
          appActions.setProductsCacheStatus({
            categoryId,
            status: 'error',
            error: message,
          }),
        );
        setLocalError(message);
      } finally {
        if (activeRequestIdRef.current === requestId) {
          if (reason === 'initial') {
            setIsInitialLoading(false);
          }

          if (reason === 'refresh') {
            setIsRefreshing(false);
          }

          if (reason === 'load-more') {
            setIsFetchingMore(false);
          }

          if (reason === 'revalidate') {
            setIsRevalidating(false);
          }

          if (reason !== 'initial' && products.length === 0) {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [categoryId, dispatch, products.length],
  );

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!categoryId) {
      setIsInitialLoading(false);
      return;
    }

    if (products.length === 0) {
      await fetchProductsPage({ offset: 0, replace: true, reason: 'initial' });
      return;
    }

    setIsInitialLoading(false);

    if (!cacheIsFresh) {
      await fetchProductsPage({ offset: 0, replace: true, reason: 'revalidate' });
    }
  }, [cacheIsFresh, categoryId, fetchProductsPage, products.length]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!categoryId) {
      setIsInitialLoading(false);
      return;
    }

    dispatch(appActions.invalidateProductsCache(categoryId));
    await fetchProductsPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [categoryId, dispatch, fetchProductsPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !categoryId ||
      products.length === 0 ||
      !hasMore ||
      isInitialLoading ||
      isRefreshing ||
      isFetchingMore ||
      isRevalidating
    ) {
      return;
    }

    await fetchProductsPage({ offset: products.length, replace: false, reason: 'load-more' });
  }, [
    categoryId,
    fetchProductsPage,
    hasMore,
    isFetchingMore,
    isInitialLoading,
    isRefreshing,
    isRevalidating,
    products.length,
  ]);

  const metrics = useMemo<ProductsPerformanceSnapshot>(() => {
    return {
      lastFetchDurationMs:
        cacheEntry?.queryDurationMs ?? latestMetricsRef.current.lastFetchDurationMs,
      lastPayloadBytes: cacheEntry?.payloadBytes ?? latestMetricsRef.current.lastPayloadBytes,
      cacheAgeMs:
        typeof cacheEntry?.lastFetchedAt === 'number'
          ? Date.now() - cacheEntry.lastFetchedAt
          : null,
    };
  }, [cacheEntry?.lastFetchedAt, cacheEntry?.payloadBytes, cacheEntry?.queryDurationMs]);

  return {
    products,
    error: localError ?? cacheEntry?.error ?? null,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    isUsingCachedData: products.length > 0,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  };
}

export default useProductsPaginated;
