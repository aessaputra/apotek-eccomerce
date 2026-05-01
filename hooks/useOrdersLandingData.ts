import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getOrderTabCounts,
  getPastPurchasedProducts,
  ORDERS_CACHE_TTL_MS,
  type OrderTabCounts,
  type PastPurchaseProduct,
} from '@/services';
import { runDedupedRequest } from '@/utils/requestDeduplication';

const EMPTY_COUNTS: OrderTabCounts = {
  unpaid: 0,
  packing: 0,
  shipped: 0,
  completed: 0,
};

interface OrdersLandingCacheEntry {
  counts: OrderTabCounts;
  pastProducts: PastPurchaseProduct[];
  fetchedAt: number;
}

interface OrdersLandingDataState {
  counts: OrderTabCounts;
  pastProducts: PastPurchaseProduct[];
  isLoadingCounts: boolean;
  isLoadingPastProducts: boolean;
  isRefreshing: boolean;
  error: string | null;
}

export interface UseOrdersLandingDataReturn extends OrdersLandingDataState {
  refresh: () => Promise<void>;
}

interface OrdersLandingFetchResult {
  counts: OrderTabCounts | null;
  pastProducts: PastPurchaseProduct[] | null;
  error: string | null;
}

const landingCache = new Map<string, OrdersLandingCacheEntry>();

export function clearOrdersLandingDataCache(): void {
  landingCache.clear();
}

function isFresh(entry: OrdersLandingCacheEntry | undefined): boolean {
  return Boolean(entry && Date.now() - entry.fetchedAt < ORDERS_CACHE_TTL_MS);
}

function createInitialState(userId?: string): OrdersLandingDataState {
  const cachedEntry = userId ? landingCache.get(userId) : undefined;

  return {
    counts: cachedEntry?.counts ?? EMPTY_COUNTS,
    pastProducts: cachedEntry?.pastProducts ?? [],
    isLoadingCounts: Boolean(userId && !cachedEntry),
    isLoadingPastProducts: Boolean(userId && !cachedEntry),
    isRefreshing: false,
    error: null,
  };
}

async function fetchOrdersLandingData(userId: string): Promise<OrdersLandingFetchResult> {
  const [countsResult, productsResult] = await Promise.all([
    getOrderTabCounts(userId),
    getPastPurchasedProducts(userId),
  ]);

  if (__DEV__) {
    if (countsResult.error) {
      console.warn(
        '[useOrdersLandingData] Failed to load order tab counts:',
        countsResult.error.message,
      );
    }

    if (productsResult.error) {
      console.warn(
        '[useOrdersLandingData] Failed to load past purchased products:',
        productsResult.error.message,
      );
    }
  }

  return {
    counts: countsResult.error ? null : countsResult.data,
    pastProducts: productsResult.error ? null : productsResult.data,
    error: countsResult.error?.message ?? productsResult.error?.message ?? null,
  };
}

function getRequestKey(userId: string): string {
  return `orders:landing:${userId}`;
}

export function useOrdersLandingData(userId?: string): UseOrdersLandingDataReturn {
  const [state, setState] = useState<OrdersLandingDataState>(() => createInitialState(userId));
  const activeRequestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(Boolean(userId && landingCache.get(userId)));
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
    hasLoadedOnceRef.current = Boolean(userId && landingCache.get(userId));
    setState(createInitialState(userId));
  }, [userId]);

  const loadLandingData = useCallback(
    async (reason: 'initial' | 'focus' | 'manual'): Promise<void> => {
      if (!userId) {
        setState(createInitialState());
        return;
      }

      const cachedEntry = landingCache.get(userId);
      const shouldUseFreshCache = reason !== 'manual' && isFresh(cachedEntry);

      if (shouldUseFreshCache && cachedEntry) {
        hasLoadedOnceRef.current = true;
        setState({
          counts: cachedEntry.counts,
          pastProducts: cachedEntry.pastProducts,
          isLoadingCounts: false,
          isLoadingPastProducts: false,
          isRefreshing: false,
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
          isLoadingCounts: !shouldPreserveContent,
          isLoadingPastProducts: !shouldPreserveContent,
          isRefreshing: shouldPreserveContent,
          error: null,
        }));
      }

      try {
        const result = await runDedupedRequest(getRequestKey(userId), () =>
          fetchOrdersLandingData(userId),
        );

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        setState(prev => {
          const nextCounts = result.counts ?? prev.counts;
          const nextProducts = result.pastProducts ?? prev.pastProducts;

          if (result.counts || result.pastProducts) {
            landingCache.set(userId, {
              counts: nextCounts,
              pastProducts: nextProducts,
              fetchedAt: Date.now(),
            });
            hasLoadedOnceRef.current = true;
          }

          return {
            counts: nextCounts,
            pastProducts: nextProducts,
            isLoadingCounts: false,
            isLoadingPastProducts: false,
            isRefreshing: false,
            error: result.error,
          };
        });
      } catch (error) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat ringkasan pesanan.';

        if (__DEV__) {
          console.warn('[useOrdersLandingData] Failed to load orders landing data:', error);
        }

        setState(prev => ({
          ...prev,
          isLoadingCounts: false,
          isLoadingPastProducts: false,
          isRefreshing: false,
          error: message,
        }));
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      void loadLandingData(hasLoadedOnceRef.current ? 'focus' : 'initial');
    }, [loadLandingData, userId]),
  );

  const refresh = useCallback(() => loadLandingData('manual'), [loadLandingData]);

  return {
    ...state,
    refresh,
  };
}

export default useOrdersLandingData;
