import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getOrdersOptimized, ORDERS_PAGE_SIZE, type OrderListItem } from '@/services';
import { classifyError } from '@/utils/error';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export interface UseOrderHistoryPaginatedReturn {
  orders: OrderListItem[];
  error: string | null;
  hasMore: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useOrderHistoryPaginated(userId?: string): UseOrderHistoryPaginatedReturn {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(
    async (offset: number, replace: boolean) => {
      if (!userId) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const result = await getOrdersOptimized(userId, {
          offset,
          limit: ORDERS_PAGE_SIZE,
          signal: abortControllerRef.current.signal,
          paymentStatuses: ['expire', 'cancel'],
        });

        if (result.error) {
          throw result.error;
        }

        const newOrders = result.data ?? [];
        if (replace) {
          setOrders(newOrders);
        } else {
          setOrders(prev => [...prev, ...newOrders]);
        }
        setHasMore(result.metrics?.hasMore ?? false);
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;

        const classifiedError = classifyError(err);
        setError(classifiedError.message || 'Gagal memuat riwayat pesanan');
      }
    },
    [userId],
  );

  const loadMore = useCallback(async () => {
    if (!userId || isFetchingMore || !hasMore) return;

    setIsFetchingMore(true);
    await fetchOrders(orders.length, false);
    setIsFetchingMore(false);
  }, [fetchOrders, hasMore, isFetchingMore, orders.length, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    await fetchOrders(0, true);
    setIsRefreshing(false);
  }, [fetchOrders, userId]);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setError(null);
      setHasMore(true);
      return;
    }

    setIsInitialLoading(true);
    fetchOrders(0, true).finally(() => {
      setIsInitialLoading(false);
    });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchOrders, userId]);

  return useMemo(
    () => ({
      orders,
      error,
      hasMore,
      isInitialLoading,
      isRefreshing,
      isFetchingMore,
      refresh,
      loadMore,
    }),
    [orders, error, hasMore, isInitialLoading, isRefreshing, isFetchingMore, refresh, loadMore],
  );
}
