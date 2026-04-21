import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import type { OrderListItem } from '@/services';
import {
  usePaginatedOrderList,
  type PaginatedOrderListMetrics,
  type OrderListCacheState,
} from './usePaginatedOrderList';

export interface OrdersPerformanceSnapshot extends PaginatedOrderListMetrics {}

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

const EMPTY_CACHE: OrderListCacheState = {
  items: [],
  hasMore: true,
  lastFetchedAt: null,
  payloadBytes: 0,
  queryDurationMs: 0,
  error: null,
};

export function useOrdersPaginated(userId?: string): UseOrdersPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const cacheEntry = useSelector((state: State) =>
    userId ? state.app.ordersCache[userId] : undefined,
  );

  const cacheState = cacheEntry ?? EMPTY_CACHE;
  const setStatus = useCallback(
    (status: 'loading' | 'refreshing' | 'error', error: string | null) => {
      if (!userId) {
        return;
      }

      dispatch(appActions.setOrdersCacheStatus({ userId, status, error }));
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
        appActions.upsertOrdersCachePage({
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
      dispatch(appActions.invalidateOrdersCache(userId));
    }
  }, [dispatch, userId]);

  const controller = usePaginatedOrderList({
    userId,
    cacheState,
    requestNamespace: 'orders',
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

export default useOrdersPaginated;
