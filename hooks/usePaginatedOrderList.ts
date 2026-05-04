import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getOrdersOptimized,
  ORDERS_CACHE_TTL_MS,
  ORDERS_PAGE_SIZE,
  type GetUserOrdersParams,
  type OrderListItem,
} from '@/services';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';

export interface OrderListCacheState {
  items: OrderListItem[];
  hasMore: boolean;
  lastFetchedAt: number | null;
  payloadBytes: number;
  queryDurationMs: number;
  error: string | null;
}

export interface PaginatedOrderListMetrics {
  lastFetchDurationMs: number;
  lastPayloadBytes: number;
  cacheAgeMs: number | null;
}

export interface UsePaginatedOrderListResult {
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
  metrics: PaginatedOrderListMetrics;
}

interface UsePaginatedOrderListOptions {
  userId?: string;
  cacheState: OrderListCacheState;
  visibleItems?: OrderListItem[];
  requestNamespace: string;
  fetchParams?: Omit<GetUserOrdersParams, 'offset' | 'limit' | 'signal'>;
  setStatus: (status: 'loading' | 'refreshing' | 'error', error: string | null) => void;
  upsertPage: (payload: {
    items: OrderListItem[];
    offset: number;
    hasMore: boolean;
    fetchedAt: number;
    payloadBytes: number;
    durationMs: number;
    replace: boolean;
  }) => void;
  invalidateCache?: () => void;
  resetCache?: () => void;
  enableFocusRevalidation?: boolean;
}

interface FetchOrdersPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'revalidate' | 'load-more';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < ORDERS_CACHE_TTL_MS;
}

function getRequestKey(namespace: string, userId: string, offset: number, limit: number): string {
  return `${namespace}:${userId}:${offset}:${limit}`;
}

function getRequestPrefix(namespace: string, userId: string): string {
  return `${namespace}:${userId}:`;
}

export function usePaginatedOrderList({
  userId,
  cacheState,
  visibleItems,
  requestNamespace,
  fetchParams,
  setStatus,
  upsertPage,
  invalidateCache,
  resetCache,
  enableFocusRevalidation = true,
}: UsePaginatedOrderListOptions): UsePaginatedOrderListResult {
  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const latestMetricsRef = useRef({ lastFetchDurationMs: 0, lastPayloadBytes: 0 });
  const activeRequestIdRef = useRef(0);
  const visibleItemsCountRef = useRef(0);
  const sourceItemsCountRef = useRef(0);
  const hasInitialLoadCompletedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const items = visibleItems ?? cacheState.items;
  const hasMore = cacheState.hasMore;
  const cacheIsFresh = isFresh(cacheState.lastFetchedAt);

  visibleItemsCountRef.current = items.length;
  sourceItemsCountRef.current = cacheState.items.length;

  useEffect(() => {
    setIsInitialLoading(Boolean(userId));
    setIsRefreshing(false);
    setIsFetchingMore(false);
    setIsRevalidating(false);
    setLocalError(null);

    if (!userId) {
      resetCache?.();
    }
  }, [resetCache, userId]);

  const fetchOrdersPage = useCallback(
    async ({ offset, replace, reason }: FetchOrdersPageOptions): Promise<void> => {
      if (!userId) {
        setIsInitialLoading(false);
        return;
      }

      const requestKey = getRequestKey(requestNamespace, userId, offset, ORDERS_PAGE_SIZE);
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (replace) {
        cancelDedupedRequests(getRequestPrefix(requestNamespace, userId));
      }

      if (reason === 'initial' && visibleItemsCountRef.current === 0) {
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

      setStatus(reason === 'refresh' ? 'refreshing' : 'loading', null);
      setLocalError(null);

      try {
        const result = await runDedupedRequest(
          requestKey,
          signal =>
            getOrdersOptimized(userId, {
              offset,
              limit: ORDERS_PAGE_SIZE,
              signal,
              ...fetchParams,
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

        upsertPage({
          items: result.data,
          offset,
          hasMore: result.metrics.hasMore,
          fetchedAt: result.metrics.fetchedAt,
          payloadBytes: result.metrics.payloadBytes,
          durationMs: result.metrics.durationMs,
          replace,
        });

        lastLoadTimeRef.current = Date.now();
        if (reason === 'initial') {
          hasInitialLoadCompletedRef.current = true;
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat pesanan.';
        setStatus('error', message);
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

          if (reason !== 'initial' && visibleItemsCountRef.current === 0) {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [fetchParams, requestNamespace, setStatus, upsertPage, userId],
  );

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    if (visibleItemsCountRef.current === 0) {
      await fetchOrdersPage({ offset: 0, replace: true, reason: 'initial' });
      return;
    }

    setIsInitialLoading(false);

    if (!cacheIsFresh) {
      await fetchOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
    }
  }, [cacheIsFresh, fetchOrdersPage, userId]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    invalidateCache?.();
    await fetchOrdersPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [fetchOrdersPage, invalidateCache, userId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !userId ||
      sourceItemsCountRef.current === 0 ||
      !hasMore ||
      isInitialLoading ||
      isRefreshing ||
      isFetchingMore ||
      isRevalidating
    ) {
      return;
    }

    await fetchOrdersPage({
      offset: sourceItemsCountRef.current,
      replace: false,
      reason: 'load-more',
    });
  }, [
    fetchOrdersPage,
    hasMore,
    isFetchingMore,
    isInitialLoading,
    isRefreshing,
    isRevalidating,
    userId,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!enableFocusRevalidation) {
        return;
      }

      if (userId && hasInitialLoadCompletedRef.current) {
        const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
        if (timeSinceLoad > 2000) {
          void fetchOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
        }
      }
    }, [enableFocusRevalidation, fetchOrdersPage, userId]),
  );

  const metrics = useMemo<PaginatedOrderListMetrics>(() => {
    return {
      lastFetchDurationMs:
        cacheState.queryDurationMs ?? latestMetricsRef.current.lastFetchDurationMs,
      lastPayloadBytes: cacheState.payloadBytes ?? latestMetricsRef.current.lastPayloadBytes,
      cacheAgeMs:
        typeof cacheState.lastFetchedAt === 'number' ? Date.now() - cacheState.lastFetchedAt : null,
    };
  }, [cacheState.lastFetchedAt, cacheState.payloadBytes, cacheState.queryDurationMs]);

  return {
    error: localError ?? cacheState.error ?? null,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    isUsingCachedData: items.length > 0,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  };
}

export default usePaginatedOrderList;
