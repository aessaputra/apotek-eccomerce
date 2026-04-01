import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import {
  getOrdersOptimized,
  ORDERS_CACHE_TTL_MS,
  ORDERS_PAGE_SIZE,
  type OrderListItem,
} from '@/services';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < ORDERS_CACHE_TTL_MS;
}

function getOrdersRequestKey(userId: string, offset: number, limit: number): string {
  return `orders:${userId}:${offset}:${limit}`;
}

function getOrdersRequestPrefix(userId: string): string {
  return `orders:${userId}:`;
}

export interface OrdersPerformanceSnapshot {
  lastFetchDurationMs: number;
  lastPayloadBytes: number;
  cacheAgeMs: number | null;
}

export interface UseOrdersPaginatedReturn {
  orders: OrderListItem[];
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
  metrics: OrdersPerformanceSnapshot;
}

interface FetchOrdersPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'revalidate' | 'load-more';
}

export function useOrdersPaginated(userId?: string): UseOrdersPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const ordersCache = useSelector((state: State) => state.app.ordersCache);
  const cacheEntry = userId ? ordersCache[userId] : undefined;

  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const latestMetricsRef = useRef({ lastFetchDurationMs: 0, lastPayloadBytes: 0 });
  const activeRequestIdRef = useRef(0);

  const orders = cacheEntry?.items ?? [];
  const hasMore = cacheEntry?.hasMore ?? true;
  const cacheIsFresh = isFresh(cacheEntry?.lastFetchedAt ?? null);

  useEffect(() => {
    setIsInitialLoading(Boolean(userId));
    setIsRefreshing(false);
    setIsFetchingMore(false);
    setIsRevalidating(false);
    setLocalError(null);
  }, [userId]);

  const fetchOrdersPage = useCallback(
    async ({ offset, replace, reason }: FetchOrdersPageOptions): Promise<void> => {
      if (!userId) {
        setIsInitialLoading(false);
        return;
      }

      const requestKey = getOrdersRequestKey(userId, offset, ORDERS_PAGE_SIZE);
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (replace) {
        cancelDedupedRequests(getOrdersRequestPrefix(userId));
      }

      if (reason === 'initial' && orders.length === 0) {
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
        appActions.setOrdersCacheStatus({
          userId,
          status: reason === 'refresh' ? 'refreshing' : 'loading',
          error: null,
        }),
      );

      setLocalError(null);

      try {
        const result = await runDedupedRequest(
          requestKey,
          signal =>
            getOrdersOptimized(userId, {
              offset,
              limit: ORDERS_PAGE_SIZE,
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
          appActions.upsertOrdersCachePage({
            userId,
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

        const message = error instanceof Error ? error.message : 'Gagal memuat pesanan.';

        dispatch(
          appActions.setOrdersCacheStatus({
            userId,
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

          if (reason !== 'initial' && orders.length === 0) {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [dispatch, orders.length, userId],
  );

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    if (orders.length === 0) {
      await fetchOrdersPage({ offset: 0, replace: true, reason: 'initial' });
      return;
    }

    setIsInitialLoading(false);

    if (!cacheIsFresh) {
      await fetchOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
    }
  }, [cacheIsFresh, fetchOrdersPage, orders.length, userId]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    dispatch(appActions.invalidateOrdersCache(userId));
    await fetchOrdersPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [dispatch, fetchOrdersPage, userId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !userId ||
      orders.length === 0 ||
      !hasMore ||
      isInitialLoading ||
      isRefreshing ||
      isFetchingMore ||
      isRevalidating
    ) {
      return;
    }

    await fetchOrdersPage({ offset: orders.length, replace: false, reason: 'load-more' });
  }, [
    fetchOrdersPage,
    hasMore,
    isFetchingMore,
    isInitialLoading,
    isRefreshing,
    isRevalidating,
    orders.length,
    userId,
  ]);

  const metrics = useMemo<OrdersPerformanceSnapshot>(() => {
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
    orders,
    error: localError ?? cacheEntry?.error ?? null,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    isUsingCachedData: orders.length > 0,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  };
}

export default useOrdersPaginated;
