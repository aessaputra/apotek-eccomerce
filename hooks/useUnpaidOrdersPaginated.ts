import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import {
  isBackendExpired,
  UNPAID_ORDER_STATUSES,
  UNPAID_PAYMENT_STATUSES,
  type OrderListItem,
} from '@/services';
import {
  usePaginatedOrderList,
  type OrderListCacheState,
  type PaginatedOrderListMetrics,
} from './usePaginatedOrderList';

export interface UnpaidOrdersPerformanceSnapshot extends PaginatedOrderListMetrics {}

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

const EMPTY_CACHE: OrderListCacheState = {
  items: [],
  hasMore: true,
  lastFetchedAt: null,
  payloadBytes: 0,
  queryDurationMs: 0,
  error: null,
};

export function useUnpaidOrdersPaginated(userId?: string): UseUnpaidOrdersPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const cacheEntry = useSelector((state: State) =>
    userId ? state.app.unpaidOrdersCache[userId] : undefined,
  );

  const cacheState = cacheEntry ?? EMPTY_CACHE;
  const visibleOrders = useMemo(
    () => cacheState.items.filter(order => !isBackendExpired(order.expired_at)),
    [cacheState.items],
  );

  const setStatus = useCallback(
    (status: 'loading' | 'refreshing' | 'error', error: string | null) => {
      if (!userId) {
        return;
      }

      dispatch(appActions.setUnpaidOrdersCacheStatus({ userId, status, error }));
    },
    [dispatch, userId],
  );

  const upsertPage = useCallback(
    (payload: {
      items: OrderListItem[];
      offset: number;
      hasMore: boolean;
      fetchedAt: number;
      payloadBytes: number;
      durationMs: number;
      replace: boolean;
    }) => {
      if (!userId) {
        return;
      }

      dispatch(
        appActions.upsertUnpaidOrdersCachePage({
          userId,
          items: payload.items,
          offset: payload.offset,
          hasMore: payload.hasMore,
          fetchedAt: payload.fetchedAt,
          payloadBytes: payload.payloadBytes,
          durationMs: payload.durationMs,
          replace: payload.replace,
        }),
      );
    },
    [dispatch, userId],
  );

  const invalidateCache = useCallback(() => {
    if (userId) {
      dispatch(appActions.invalidateUnpaidOrdersCache(userId));
    }
  }, [dispatch, userId]);

  const fetchParams = useMemo(
    () => ({
      orderStatuses: [...UNPAID_ORDER_STATUSES],
      paymentStatuses: [...UNPAID_PAYMENT_STATUSES],
      excludeExpiredPending: true,
    }),
    [],
  );

  const controller = usePaginatedOrderList({
    userId,
    cacheState,
    visibleItems: visibleOrders,
    requestNamespace: 'unpaidOrders',
    fetchParams,
    setStatus,
    upsertPage,
    invalidateCache,
  });

  return useMemo(
    () => ({
      orders: visibleOrders,
      ...controller,
    }),
    [controller, visibleOrders],
  );
}

export default useUnpaidOrdersPaginated;
