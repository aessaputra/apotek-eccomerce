import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HISTORY_PAYMENT_STATUSES, type OrderListItem } from '@/services';
import { usePaginatedOrderList, type OrderListCacheState } from './usePaginatedOrderList';

export interface UseOrderHistoryPaginatedReturn {
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
}

const EMPTY_CACHE: OrderListCacheState = {
  items: [],
  hasMore: true,
  lastFetchedAt: null,
  payloadBytes: 0,
  queryDurationMs: 0,
  error: null,
};

export function useOrderHistoryPaginated(userId?: string): UseOrderHistoryPaginatedReturn {
  const [cacheState, setCacheState] = useState<OrderListCacheState>(EMPTY_CACHE);
  const refreshIfNeededRef = useRef<() => Promise<void>>(async () => undefined);

  const setStatus = useCallback(
    (_status: 'loading' | 'refreshing' | 'error', error: string | null) => {
      setCacheState(prev => ({
        ...prev,
        error,
      }));
    },
    [],
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
      setCacheState(prev => {
        const items =
          payload.replace || payload.offset === 0
            ? payload.items
            : [...prev.items, ...payload.items];

        const mergedById = new Map(items.map(item => [item.id, item]));
        const sortedItems = Array.from(mergedById.values()).sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
        );

        return {
          items: sortedItems,
          hasMore: payload.hasMore,
          lastFetchedAt: payload.fetchedAt,
          payloadBytes: payload.payloadBytes,
          queryDurationMs: payload.durationMs,
          error: null,
        };
      });
    },
    [],
  );

  const invalidateCache = useCallback(() => {
    setCacheState(prev => ({ ...prev, lastFetchedAt: null, error: null }));
  }, []);

  const resetCache = useCallback(() => {
    setCacheState(EMPTY_CACHE);
  }, []);

  const controller = usePaginatedOrderList({
    userId,
    cacheState,
    requestNamespace: 'orderHistory',
    fetchParams: {
      paymentStatuses: [...HISTORY_PAYMENT_STATUSES],
      includeExpiredPendingInHistory: true,
    },
    setStatus,
    upsertPage,
    invalidateCache,
    resetCache,
  });

  useEffect(() => {
    refreshIfNeededRef.current = controller.refreshIfNeeded;
  }, [controller.refreshIfNeeded]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void refreshIfNeededRef.current();
  }, [userId]);

  return useMemo(
    () => ({
      orders: cacheState.items,
      ...controller,
    }),
    [cacheState.items, controller],
  );
}

export default useOrderHistoryPaginated;
