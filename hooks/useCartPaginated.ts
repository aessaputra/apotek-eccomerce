import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, State } from '@/utils/store';
import { appActions } from '@/slices/app.slice';
import { cancelDedupedRequests, runDedupedRequest } from '@/utils/requestDeduplication';
import { getCartItemsOptimized, getOrCreateCart } from '@/services/cart.service';
import { CART_CACHE_TTL_MS, CART_PAGE_SIZE } from '@/constants/cart.constants';
import type { CartItemWithProduct, CartListItem, CartSnapshot } from '@/types/cart';

export interface UseCartPaginatedReturn {
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  error: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  isRevalidating: boolean;
  isUsingCachedData: boolean;
  refresh: () => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  loadMore: () => Promise<void>;
  metrics: {
    lastFetchDurationMs: number;
    lastPayloadBytes: number;
    cacheAgeMs: number | null;
  };
}

interface FetchCartPageOptions {
  offset: number;
  replace: boolean;
  reason: 'initial' | 'refresh' | 'load-more' | 'revalidate';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isFresh(lastFetchedAt: number | null): boolean {
  return typeof lastFetchedAt === 'number' && Date.now() - lastFetchedAt < CART_CACHE_TTL_MS;
}

function getCartRequestKey(userId: string, offset: number, limit: number): string {
  return `cart:${userId}:${offset}:${limit}`;
}

function getCartRequestPrefix(userId: string): string {
  return `cart:${userId}:`;
}

function toCacheItems(items: CartListItem[]): CartItemWithProduct[] {
  return items.map(item => ({
    id: item.id,
    cart_id: '',
    product_id: item.product_id,
    quantity: item.quantity,
    created_at: item.created_at,
    product: {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      stock: item.product.stock,
      weight: item.product.weight,
      slug: item.product.slug,
      is_active: item.product.is_active,
    },
    images: item.images.map((image, index) => ({
      id: image.id,
      url: image.url,
      sort_order: index,
    })),
  }));
}

export function useCartPaginated(userId?: string): UseCartPaginatedReturn {
  const dispatch = useDispatch<Dispatch>();
  const cartCache = useSelector((state: State) => state.app.cartCache);
  const cacheEntry = userId ? cartCache[userId] : undefined;

  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const activeRequestIdRef = useRef(0);

  const items = cacheEntry?.items ?? [];
  const snapshot = cacheEntry?.snapshot ?? {
    itemCount: 0,
    estimatedWeightGrams: 0,
    packageValue: 0,
  };
  const hasMore = cacheEntry?.hasMore ?? false;
  const cacheIsFresh = isFresh(cacheEntry?.lastFetchedAt ?? null);

  useEffect(() => {
    setIsInitialLoading(Boolean(userId));
    setIsRefreshing(false);
    setIsFetchingMore(false);
    setIsRevalidating(false);
    setLocalError(null);
  }, [userId]);

  const fetchCartPage = useCallback(
    async ({ offset, replace, reason }: FetchCartPageOptions): Promise<void> => {
      if (!userId) {
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      const requestKey = getCartRequestKey(userId, offset, CART_PAGE_SIZE);

      if (reason === 'initial') {
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

      if (replace) {
        cancelDedupedRequests(getCartRequestPrefix(userId));
      }

      dispatch(
        appActions.setCartCacheStatus({
          userId,
          status: replace ? 'refreshing' : 'loading',
          error: null,
        }),
      );

      setLocalError(null);

      try {
        const { data: cart, error: cartError } = await getOrCreateCart(userId);
        if (cartError || !cart) {
          throw cartError ?? new Error('Unable to initialize cart.');
        }

        const result = await runDedupedRequest(
          requestKey,
          signal => getCartItemsOptimized(cart.id, { offset, limit: CART_PAGE_SIZE, signal }),
          { policy: replace ? 'replace' : 'dedupe' },
        );

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        if (result.error) {
          throw result.error;
        }

        if (result.data && result.metrics) {
          dispatch(
            appActions.upsertCartCachePage({
              userId,
              items: toCacheItems(result.data.items),
              snapshot: result.data.snapshot,
              hasMore: result.metrics.hasMore,
              offset,
              fetchedAt: result.metrics.fetchedAt,
              payloadBytes: result.metrics.payloadBytes,
              durationMs: result.metrics.durationMs,
              replace,
            }),
          );
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (activeRequestIdRef.current !== requestId) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Gagal memuat keranjang.';
        dispatch(appActions.setCartCacheStatus({ userId, status: 'error', error: message }));
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
        }
      }
    },
    [dispatch, userId],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      return;
    }

    dispatch(appActions.invalidateCartCache(userId));
    dispatch(
      appActions.setCartCacheMetadata({
        userId,
        metadata: { lastInvalidatedAt: Date.now() },
      }),
    );
    await fetchCartPage({ offset: 0, replace: true, reason: 'refresh' });
  }, [dispatch, fetchCartPage, userId]);

  const refreshIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIsInitialLoading(false);
      return;
    }

    if (items.length === 0) {
      await fetchCartPage({ offset: 0, replace: true, reason: 'initial' });
      return;
    }

    setIsInitialLoading(false);

    if (!cacheIsFresh) {
      await fetchCartPage({ offset: 0, replace: true, reason: 'revalidate' });
    }
  }, [cacheIsFresh, fetchCartPage, items.length, userId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !userId ||
      !hasMore ||
      isFetchingMore ||
      isInitialLoading ||
      isRefreshing ||
      isRevalidating
    ) {
      return;
    }

    await fetchCartPage({ offset: items.length, replace: false, reason: 'load-more' });
  }, [
    fetchCartPage,
    hasMore,
    isFetchingMore,
    isInitialLoading,
    isRefreshing,
    isRevalidating,
    items.length,
    userId,
  ]);

  const metrics = useMemo(
    () => ({
      lastFetchDurationMs: cacheEntry?.queryDurationMs ?? 0,
      lastPayloadBytes: cacheEntry?.payloadBytes ?? 0,
      cacheAgeMs:
        typeof cacheEntry?.lastFetchedAt === 'number'
          ? Date.now() - cacheEntry.lastFetchedAt
          : null,
    }),
    [cacheEntry?.lastFetchedAt, cacheEntry?.payloadBytes, cacheEntry?.queryDurationMs],
  );

  const isLoading = isInitialLoading && items.length === 0;
  const isUsingCachedData = items.length > 0 && !cacheIsFresh;
  const error = localError ?? cacheEntry?.error ?? null;

  return {
    items,
    snapshot,
    error,
    hasMore,
    isLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    isUsingCachedData,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  };
}

export default useCartPaginated;
