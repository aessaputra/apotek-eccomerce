import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import type { GetUserOrdersParams, OrderListItem } from '@/services';
import {
  usePaginatedOrderList,
  type OrderListCacheState,
  type PaginatedOrderListMetrics,
} from './usePaginatedOrderList';

export interface OrdersByStatusPerformanceSnapshot extends PaginatedOrderListMetrics {}

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

export interface OrdersByStatusParams {
  userId?: string;
  orderStatuses?: string[];
  paymentStatuses?: GetUserOrdersParams['paymentStatuses'];
  customerOrderBucket?: GetUserOrdersParams['customerOrderBucket'];
  cacheKey: 'packing' | 'shipped' | 'completed';
}

const EMPTY_CACHE: OrderListCacheState = {
  items: [],
  hasMore: true,
  lastFetchedAt: null,
  payloadBytes: 0,
  queryDurationMs: 0,
  error: null,
};

export function useOrdersByStatusPaginated({
  userId,
  orderStatuses,
  paymentStatuses,
  customerOrderBucket,
  cacheKey,
}: OrdersByStatusParams): UseOrdersByStatusPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const cacheEntry = useSelector((state: State) =>
    userId ? state.app.ordersByStatusCache[cacheKey][userId] : undefined,
  );

  const cacheState = cacheEntry ?? EMPTY_CACHE;
  const setStatus = useCallback(
    (status: 'loading' | 'refreshing' | 'error', error: string | null) => {
      if (!userId) {
        return;
      }

      dispatch(appActions.setOrdersByStatusCacheStatus({ cacheKey, userId, status, error }));
    },
    [cacheKey, dispatch, userId],
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
        appActions.upsertOrdersByStatusCachePage({
          cacheKey,
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
    [cacheKey, dispatch, userId],
  );

  const invalidateCache = useCallback(() => {
    if (userId) {
      dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey, userId }));
    }
  }, [cacheKey, dispatch, userId]);

  const stableOrderStatuses = useMemo(
    () => (orderStatuses ? [...orderStatuses] : undefined),
    [orderStatuses?.join('|')],
  );
  const stablePaymentStatuses = useMemo(
    () => (paymentStatuses ? [...paymentStatuses] : undefined),
    [paymentStatuses?.join('|')],
  );

  const fetchParams = useMemo(
    () => ({
      orderStatuses: stableOrderStatuses,
      paymentStatuses: stablePaymentStatuses,
      customerOrderBucket,
    }),
    [customerOrderBucket, stableOrderStatuses, stablePaymentStatuses],
  );

  const controller = usePaginatedOrderList({
    userId,
    cacheState,
    requestNamespace: `orders:${cacheKey}`,
    fetchParams,
    setStatus,
    upsertPage,
    invalidateCache,
  });

  return useMemo(
    () => ({
      orders: cacheState.items,
      ...controller,
    }),
    [cacheState.items, controller],
  );
}

export default useOrdersByStatusPaginated;
