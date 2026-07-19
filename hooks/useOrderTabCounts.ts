import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getOrderTabCounts, ORDERS_CACHE_TTL_MS, type OrderTabCounts } from '@/services';
import { runDedupedRequest } from '@/utils/requestDeduplication';

const EMPTY_COUNTS: OrderTabCounts = {
  unpaid: 0,
  packing: 0,
  shipped: 0,
  completed: 0,
  cancelled: 0,
};

interface OrderTabCountsCacheEntry {
  counts: OrderTabCounts;
  fetchedAt: number;
}

interface OrderTabCountsState {
  counts: OrderTabCounts;
  isLoading: boolean;
  error: string | null;
}

export interface UseOrderTabCountsReturn extends OrderTabCountsState {
  refresh: () => Promise<void>;
}

const countsCache = new Map<string, OrderTabCountsCacheEntry>();

export function clearOrderTabCountsCache(): void {
  countsCache.clear();
}

export function invalidateOrderTabCountsCache(userId: string): void {
  countsCache.delete(userId);
}

function isFresh(entry: OrderTabCountsCacheEntry | undefined): boolean {
  return Boolean(entry && Date.now() - entry.fetchedAt < ORDERS_CACHE_TTL_MS);
}

function createInitialState(userId?: string): OrderTabCountsState {
  const cachedEntry = userId ? countsCache.get(userId) : undefined;

  return {
    counts: cachedEntry?.counts ?? EMPTY_COUNTS,
    isLoading: Boolean(userId && !cachedEntry),
    error: null,
  };
}

async function fetchOrderTabCounts(userId: string): Promise<{
  counts: OrderTabCounts | null;
  error: string | null;
}> {
  const result = await getOrderTabCounts(userId);

  if (__DEV__ && result.error) {
    console.warn('[useOrderTabCounts] Failed to load order tab counts:', result.error.message);
  }

  return {
    counts: result.error ? null : result.data,
    error: result.error?.message ?? null,
  };
}

function getRequestKey(userId: string): string {
  return `orders:tab-counts:${userId}`;
}

export function useOrderTabCounts(userId?: string): UseOrderTabCountsReturn {
  const [state, setState] = useState<OrderTabCountsState>(() => createInitialState(userId));
  const activeRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(Boolean(userId && countsCache.get(userId)));
  const previousUserIdRef = useRef(userId);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (previousUserIdRef.current === userId) {
      return;
    }

    previousUserIdRef.current = userId;
    activeRequestIdRef.current += 1;
    hasLoadedOnceRef.current = Boolean(userId && countsCache.get(userId));
    setState(createInitialState(userId));
  }, [userId]);

  const loadCounts = useCallback(
    async (reason: 'initial' | 'focus' | 'manual'): Promise<void> => {
      if (!userId) {
        setState(createInitialState());
        return;
      }

      const cachedEntry = countsCache.get(userId);
      const shouldUseFreshCache = reason !== 'manual' && isFresh(cachedEntry);

      if (shouldUseFreshCache && cachedEntry) {
        hasLoadedOnceRef.current = true;
        setState({
          counts: cachedEntry.counts,
          isLoading: false,
          error: null,
        });
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      const shouldPreserveContent = Boolean(cachedEntry || hasLoadedOnceRef.current);

      if (reason === 'manual') {
        setState(prev => ({
          ...prev,
          isLoading: !shouldPreserveContent,
          error: null,
        }));
      }

      try {
        const result = await runDedupedRequest(getRequestKey(userId), () =>
          fetchOrderTabCounts(userId),
        );

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        setState(() => {
          const nextCounts = result.counts ?? EMPTY_COUNTS;

          if (result.counts) {
            countsCache.set(userId, {
              counts: nextCounts,
              fetchedAt: Date.now(),
            });
            hasLoadedOnceRef.current = true;
          }

          return {
            counts: nextCounts,
            isLoading: false,
            error: result.error,
          };
        });
      } catch (error) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat jumlah pesanan.';

        if (__DEV__) {
          console.warn('[useOrderTabCounts] Failed to load order tab counts:', error);
        }

        setState({
          counts: EMPTY_COUNTS,
          isLoading: false,
          error: message,
        });
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      void loadCounts(hasLoadedOnceRef.current ? 'focus' : 'initial');
    }, [loadCounts, userId]),
  );

  const refresh = useCallback(() => loadCounts('manual'), [loadCounts]);

  return {
    counts: state.isLoading || state.error ? EMPTY_COUNTS : state.counts,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
}

export default useOrderTabCounts;
