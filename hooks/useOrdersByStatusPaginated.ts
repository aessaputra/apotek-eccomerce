import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from 'expo-router';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import {
  getOrdersOptimized,
  ORDERS_CACHE_TTL_MS,
  ORDERS_PAGE_SIZE,
  type OrderListItem,
  type GetUserOrdersParams,
} from '@/services';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < ORDERS_CACHE_TTL_MS;
}

function getOrdersRequestKey(
  userId: string,
  offset: number,
  limit: number,
  status: string,
): string {
  return `orders:${status}:${userId}:${offset}:${limit}`;
}

function getOrdersRequestPrefix(userId: string, status: string): string {
  return `orders:${status}:${userId}:`;
}

export interface OrdersByStatusPerformanceSnapshot {
  lastFetchDurationMs: number;
  lastPayloadBytes: number;
  cacheAgeMs: number | null;
}

export interface UseOrdersByStatusPaginatedReturn {
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
  metrics: OrdersByStatusPerformanceSnapshot;
}

interface FetchOrdersPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'revalidate' | 'load-more';
}

export interface OrdersByStatusParams {
  userId?: string;
  orderStatuses?: string[];
  paymentStatuses?: ('pending' | 'settlement' | 'deny' | 'expire' | 'cancel' | 'authorize')[];
  cacheKey: 'packing' | 'shipped' | 'completed';
}

export function useOrdersByStatusPaginated({
  userId,
  orderStatuses,
  paymentStatuses,
  cacheKey,
}: OrdersByStatusParams): UseOrdersByStatusPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const ordersCache = useSelector((state: State) => state.app.ordersByStatusCache[cacheKey]);
  const cacheEntry = userId ? ordersCache?.[userId] : undefined;

  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const latestMetricsRef = useRef({ lastFetchDurationMs: 0, lastPayloadBytes: 0 });
  const activeRequestIdRef = useRef(0);
  const ordersLengthRef = useRef(0);
  const hasInitialLoadCompletedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const orders = cacheEntry?.items ?? [];
  ordersLengthRef.current = orders.length;
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

      const requestKey = getOrdersRequestKey(userId, offset, ORDERS_PAGE_SIZE, cacheKey);
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (replace) {
        cancelDedupedRequests(getOrdersRequestPrefix(userId, cacheKey));
      }

      if (reason === 'initial' && ordersLengthRef.current === 0) {
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
        appActions.setOrdersByStatusCacheStatus({
          cacheKey,
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
              orderStatuses,
              paymentStatuses,
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
          appActions.upsertOrdersByStatusCachePage({
            cacheKey,
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

        dispatch(
          appActions.setOrdersByStatusCacheStatus({
            cacheKey,
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

          if (reason !== 'initial' && ordersLengthRef.current === 0) {
            setIsInitialLoading(false);
          }
        }
      }
    },
    [cacheKey, dispatch, orderStatuses, paymentStatuses, userId],
  );

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    if (ordersLengthRef.current === 0) {
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

    dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey, userId }));
    await fetchOrdersPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [cacheKey, dispatch, fetchOrdersPage, userId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !userId ||
      ordersLengthRef.current === 0 ||
      !hasMore ||
      isInitialLoading ||
      isRefreshing ||
      isFetchingMore ||
      isRevalidating
    ) {
      return;
    }

    await fetchOrdersPage({
      offset: ordersLengthRef.current,
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
      if (userId && hasInitialLoadCompletedRef.current) {
        const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
        if (timeSinceLoad > 2000) {
          void fetchOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
        }
      }
    }, [userId, fetchOrdersPage]),
  );

  const metrics = useMemo<OrdersByStatusPerformanceSnapshot>(() => {
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

export default useOrdersByStatusPaginated;
