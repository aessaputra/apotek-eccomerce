import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from 'expo-router';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import {
  getOrdersOptimized,
  ORDERS_CACHE_TTL_MS,
  ORDERS_PAGE_SIZE,
  UNPAID_ORDER_STATUSES,
  UNPAID_PAYMENT_STATUSES,
  type OrderListItem,
} from '@/services';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < ORDERS_CACHE_TTL_MS;
}

function getUnpaidOrdersRequestKey(userId: string, offset: number, limit: number): string {
  return `unpaidOrders:${userId}:${offset}:${limit}`;
}

function getUnpaidOrdersRequestPrefix(userId: string): string {
  return `unpaidOrders:${userId}:`;
}

export interface UnpaidOrdersPerformanceSnapshot {
  lastFetchDurationMs: number;
  lastPayloadBytes: number;
  cacheAgeMs: number | null;
}

export interface UseUnpaidOrdersPaginatedReturn {
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
  metrics: UnpaidOrdersPerformanceSnapshot;
}

interface FetchUnpaidOrdersPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'revalidate' | 'load-more';
}

export function useUnpaidOrdersPaginated(userId?: string): UseUnpaidOrdersPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const unpaidOrdersCache = useSelector((state: State) => state.app.unpaidOrdersCache);
  const cacheEntry = userId ? unpaidOrdersCache[userId] : undefined;

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

  if (__DEV__) {
    console.log('[useUnpaidOrdersPaginated] render', {
      userId: userId ?? null,
      ordersCount: orders.length,
      cacheStatus: cacheEntry?.status ?? null,
      cacheError: cacheEntry?.error ?? null,
      hasMore,
      isInitialLoading,
      isRefreshing,
      isFetchingMore,
      isRevalidating,
    });
  }

  useEffect(() => {
    if (__DEV__) {
      console.log('[useUnpaidOrdersPaginated] reset state for user', {
        userId: userId ?? null,
      });
    }

    setIsInitialLoading(Boolean(userId));
    setIsRefreshing(false);
    setIsFetchingMore(false);
    setIsRevalidating(false);
    setLocalError(null);
  }, [userId]);

  const fetchUnpaidOrdersPage = useCallback(
    async ({ offset, replace, reason }: FetchUnpaidOrdersPageOptions): Promise<void> => {
      if (!userId) {
        if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] skip fetch without userId', {
            offset,
            replace,
            reason,
          });
        }

        setIsInitialLoading(false);
        return;
      }

      const requestKey = getUnpaidOrdersRequestKey(userId, offset, ORDERS_PAGE_SIZE);
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      if (__DEV__) {
        console.log('[useUnpaidOrdersPaginated] fetch start', {
          userId,
          requestId,
          requestKey,
          offset,
          replace,
          reason,
          ordersCount: ordersLengthRef.current,
        });
      }

      if (replace) {
        if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] cancelling deduped requests', {
            prefix: getUnpaidOrdersRequestPrefix(userId),
          });
        }

        cancelDedupedRequests(getUnpaidOrdersRequestPrefix(userId));
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
        appActions.setUnpaidOrdersCacheStatus({
          userId,
          status: reason === 'refresh' ? 'refreshing' : 'loading',
          error: null,
        }),
      );

      setLocalError(null);

      try {
        if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] awaiting runDedupedRequest', {
            requestId,
            requestKey,
            policy: replace ? 'replace' : 'dedupe',
          });
        }

        const result = await runDedupedRequest(
          requestKey,
          signal =>
            getOrdersOptimized(userId, {
              offset,
              limit: ORDERS_PAGE_SIZE,
              signal,
              orderStatuses: [...UNPAID_ORDER_STATUSES],
              paymentStatuses: [...UNPAID_PAYMENT_STATUSES],
            }),
          { policy: replace ? 'replace' : 'dedupe' },
        );

        if (result.error) {
          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] fetch returned result.error', {
              requestId,
              message: result.error.message,
            });
          }

          throw result.error;
        }

        if (!result.data || !result.metrics) {
          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] fetch returned empty result payload', {
              requestId,
              hasData: Boolean(result.data),
              hasMetrics: Boolean(result.metrics),
            });
          }

          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] ignoring stale success result', {
              requestId,
              activeRequestId: activeRequestIdRef.current,
            });
          }

          return;
        }

        if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] fetch success', {
            requestId,
            receivedCount: result.data.length,
            hasMore: result.metrics.hasMore,
            durationMs: result.metrics.durationMs,
          });
        }

        latestMetricsRef.current = {
          lastFetchDurationMs: result.metrics.durationMs,
          lastPayloadBytes: result.metrics.payloadBytes,
        };

        dispatch(
          appActions.upsertUnpaidOrdersCachePage({
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
          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] fetch aborted', {
              requestId,
            });
          }

          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] ignoring stale error result', {
              requestId,
              activeRequestId: activeRequestIdRef.current,
            });
          }

          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat pesanan.';

        if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] fetch error', {
            requestId,
            message,
            error,
          });
        }

        dispatch(
          appActions.setUnpaidOrdersCacheStatus({
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

          if (__DEV__) {
            console.log('[useUnpaidOrdersPaginated] fetch finalize', {
              requestId,
              reason,
              ordersCountAtFinalize: ordersLengthRef.current,
              isLatestRequest: true,
            });
          }
        } else if (__DEV__) {
          console.log('[useUnpaidOrdersPaginated] fetch finalize skipped for stale request', {
            requestId,
            activeRequestId: activeRequestIdRef.current,
          });
        }
      }
    },
    [dispatch, userId],
  );

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    if (ordersLengthRef.current === 0) {
      await fetchUnpaidOrdersPage({ offset: 0, replace: true, reason: 'initial' });
      return;
    }

    setIsInitialLoading(false);

    if (!cacheIsFresh) {
      await fetchUnpaidOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
    }
  }, [cacheIsFresh, fetchUnpaidOrdersPage, userId]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      if (__DEV__) {
        console.log('[useUnpaidOrdersPaginated] refresh skipped without userId');
      }

      setIsInitialLoading(false);
      return;
    }

    if (__DEV__) {
      console.log('[useUnpaidOrdersPaginated] refresh called', {
        userId,
        ordersCount: ordersLengthRef.current,
      });
    }

    dispatch(appActions.invalidateUnpaidOrdersCache(userId));
    await fetchUnpaidOrdersPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [dispatch, fetchUnpaidOrdersPage, userId]);

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

    await fetchUnpaidOrdersPage({
      offset: ordersLengthRef.current,
      replace: false,
      reason: 'load-more',
    });
  }, [
    fetchUnpaidOrdersPage,
    hasMore,
    isFetchingMore,
    isInitialLoading,
    isRefreshing,
    isRevalidating,
    userId,
  ]);

  const metrics = useMemo<UnpaidOrdersPerformanceSnapshot>(() => {
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

  useFocusEffect(
    useCallback(() => {
      if (userId && hasInitialLoadCompletedRef.current) {
        const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
        if (timeSinceLoad > 2000) {
          void fetchUnpaidOrdersPage({ offset: 0, replace: true, reason: 'revalidate' });
        }
      }
    }, [userId, fetchUnpaidOrdersPage]),
  );

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

export default useUnpaidOrdersPaginated;
