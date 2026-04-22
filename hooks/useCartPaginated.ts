'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { DEFAULT_CART_ITEM_WEIGHT_GRAMS } from '@/constants/cart.constants';
import {
  getCartItemWithProduct,
  getCartWithItems,
  subscribeToCartChanges,
} from '@/services/cart.service';
import type {
  CartItemWithProduct,
  CartRealtimeChange,
  CartRealtimeConnectionState,
  CartSnapshot,
} from '@/types/cart';
import { buildCartSnapshot, EMPTY_CART_SNAPSHOT } from '@/utils/cart';
import { State } from '@/utils/store';

export interface UseCartPaginatedReturn {
  cartId: string | null;
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  realtimeState: CartRealtimeConnectionState;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

export interface UseCartPaginatedParams {
  userId?: string;
}

function hasMeaningfulCartItemChange(
  currentItem: CartItemWithProduct,
  nextItem: CartItemWithProduct,
): boolean {
  return !(
    currentItem.quantity === nextItem.quantity &&
    currentItem.product.name === nextItem.product.name &&
    currentItem.product.price === nextItem.product.price &&
    currentItem.product.stock === nextItem.product.stock &&
    currentItem.product.weight === nextItem.product.weight &&
    currentItem.images[0]?.url === nextItem.images[0]?.url
  );
}

function upsertCartItem(
  currentItems: CartItemWithProduct[],
  nextItem: CartItemWithProduct,
): CartItemWithProduct[] {
  const existingIndex = currentItems.findIndex(item => item.id === nextItem.id);

  if (existingIndex === -1) {
    return [nextItem, ...currentItems];
  }

  if (!hasMeaningfulCartItemChange(currentItems[existingIndex], nextItem)) {
    return currentItems;
  }

  const nextItems = [...currentItems];
  nextItems[existingIndex] = nextItem;
  return nextItems;
}

function applyRealtimeDelete(
  currentItems: CartItemWithProduct[],
  deletedItemId: string,
): CartItemWithProduct[] {
  const nextItems = currentItems.filter(item => item.id !== deletedItemId);
  return nextItems.length === currentItems.length ? currentItems : nextItems;
}

function applyRealtimeQuantityUpdate(
  currentItems: CartItemWithProduct[],
  updatedItemId: string,
  quantity: number,
): { items: CartItemWithProduct[]; found: boolean } {
  let found = false;

  const nextItems = currentItems.map(item => {
    if (item.id !== updatedItemId) {
      return item;
    }

    found = true;

    if (item.quantity === quantity) {
      return item;
    }

    return {
      ...item,
      quantity,
    };
  });

  return { items: nextItems, found };
}

function resetRealtimeTrackingState(
  subscriptionCleanupRef: React.MutableRefObject<(() => void) | null>,
  subscribedCartIdRef: React.MutableRefObject<string | null>,
  hasConnectedOnceRef: React.MutableRefObject<boolean>,
  needsReconnectSyncRef: React.MutableRefObject<boolean>,
  pendingRealtimeItemFetchesRef: React.MutableRefObject<Set<string>>,
) {
  subscriptionCleanupRef.current?.();
  subscriptionCleanupRef.current = null;
  subscribedCartIdRef.current = null;
  hasConnectedOnceRef.current = false;
  needsReconnectSyncRef.current = false;
  pendingRealtimeItemFetchesRef.current.clear();
}

export function useCartPaginated({ userId }: UseCartPaginatedParams): UseCartPaginatedReturn {
  const cartClearedAt = useSelector((state: State) => state.app.cartClearedAt);
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeState, setRealtimeState] = useState<CartRealtimeConnectionState>('disconnected');

  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const subscriptionCleanupRef = useRef<(() => void) | null>(null);
  const subscribedCartIdRef = useRef<string | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const needsReconnectSyncRef = useRef(false);
  const pendingRealtimeItemFetchesRef = useRef(new Set<string>());
  const refreshRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(async () => {});
  const lastHandledCartClearedAtRef = useRef<number | null>(null);

  const snapshot = useMemo(() => buildCartSnapshot(items, DEFAULT_CART_ITEM_WEIGHT_GRAMS), [items]);

  useEffect(() => {
    const pendingRealtimeItemFetches = pendingRealtimeItemFetchesRef.current;

    return () => {
      isMountedRef.current = false;
      fetchAbortControllerRef.current?.abort();
      fetchAbortControllerRef.current = null;
      pendingRealtimeItemFetches.clear();
    };
  }, []);

  const upsertFetchedCartItem = useCallback((nextItem: CartItemWithProduct) => {
    setItems(currentItems => upsertCartItem(currentItems, nextItem));
  }, []);

  const syncRealtimeItem = useCallback(
    async (cartItemId: string) => {
      const normalizedCartItemId = cartItemId.trim();

      if (!normalizedCartItemId) {
        return;
      }

      if (pendingRealtimeItemFetchesRef.current.has(normalizedCartItemId)) {
        return;
      }

      pendingRealtimeItemFetchesRef.current.add(normalizedCartItemId);

      try {
        const { data, error: fetchError } = await getCartItemWithProduct(normalizedCartItemId);

        if (!isMountedRef.current) {
          return;
        }

        if (fetchError || !data) {
          void refreshRef.current({ silent: true });
          return;
        }

        upsertFetchedCartItem(data);
      } finally {
        pendingRealtimeItemFetchesRef.current.delete(normalizedCartItemId);
      }
    },
    [upsertFetchedCartItem],
  );

  const applyRealtimeChange = useCallback(
    (change: CartRealtimeChange) => {
      setItems(currentItems => {
        if (change.type === 'INSERT') {
          const insertedItem = change.new;

          if (!insertedItem) {
            return currentItems;
          }

          if (currentItems.some(item => item.id === insertedItem.id)) {
            return currentItems;
          }

          void syncRealtimeItem(insertedItem.id);
          return currentItems;
        }

        if (change.type === 'DELETE') {
          const deletedItem = change.old ?? change.new;

          if (!deletedItem) {
            return currentItems;
          }

          return applyRealtimeDelete(currentItems, deletedItem.id);
        }

        const updatedItem = change.new;

        if (!updatedItem) {
          return currentItems;
        }

        const { items: nextItems, found } = applyRealtimeQuantityUpdate(
          currentItems,
          updatedItem.id,
          updatedItem.quantity,
        );

        if (!found) {
          void syncRealtimeItem(updatedItem.id);
          return currentItems;
        }

        return nextItems;
      });
    },
    [syncRealtimeItem],
  );

  const fetchCart = useCallback(
    async (mode: 'initial' | 'refresh', silent: boolean = false): Promise<void> => {
      if (!userId) {
        fetchAbortControllerRef.current?.abort();
        fetchAbortControllerRef.current = null;
        if (isMountedRef.current) {
          setCartId(null);
          setItems([]);
          setError(null);
          setIsLoading(false);
          setIsRefreshing(false);
          setRealtimeState('disconnected');
        }
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      fetchAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      fetchAbortControllerRef.current = abortController;

      if (mode === 'initial') {
        setIsLoading(true);
      } else if (!silent) {
        setIsRefreshing(true);
      }

      if (!silent) {
        setError(null);
      }

      try {
        const { data, error: fetchError } = await getCartWithItems(userId, abortController.signal);

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (fetchError || !data) {
          throw fetchError ?? new Error('Gagal memuat keranjang.');
        }

        setCartId(data.cartId);
        setItems(data.items);
      } catch (err) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (!silent) {
          setError(err instanceof Error ? err.message : 'Gagal memuat keranjang.');
        }
      } finally {
        if (fetchAbortControllerRef.current === abortController) {
          fetchAbortControllerRef.current = null;
        }

        if (isMountedRef.current && activeRequestIdRef.current === requestId) {
          if (mode === 'initial') {
            setIsLoading(false);
          } else if (!silent) {
            setIsRefreshing(false);
          }
        }
      }
    },
    [userId],
  );

  const refresh = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      await fetchCart('refresh', options?.silent);
    },
    [fetchCart],
  );

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!userId || !cartClearedAt) {
      return;
    }

    if (lastHandledCartClearedAtRef.current === cartClearedAt) {
      return;
    }

    lastHandledCartClearedAtRef.current = cartClearedAt;
    setItems([]);
    setError(null);
    void refreshRef.current({ silent: true });
  }, [cartClearedAt, userId]);

  useEffect(() => {
    if (!userId) {
      fetchAbortControllerRef.current?.abort();
      fetchAbortControllerRef.current = null;
      activeRequestIdRef.current += 1;
      setCartId(null);
      setItems([]);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setRealtimeState('disconnected');
      resetRealtimeTrackingState(
        subscriptionCleanupRef,
        subscribedCartIdRef,
        hasConnectedOnceRef,
        needsReconnectSyncRef,
        pendingRealtimeItemFetchesRef,
      );
      return;
    }

    void fetchCart('initial');
  }, [fetchCart, userId]);

  useEffect(() => {
    if (!cartId) {
      resetRealtimeTrackingState(
        subscriptionCleanupRef,
        subscribedCartIdRef,
        hasConnectedOnceRef,
        needsReconnectSyncRef,
        pendingRealtimeItemFetchesRef,
      );
      setRealtimeState('disconnected');
      return;
    }

    if (subscribedCartIdRef.current === cartId && subscriptionCleanupRef.current) {
      return;
    }

    const pendingRealtimeItemFetches = pendingRealtimeItemFetchesRef.current;

    subscriptionCleanupRef.current?.();
    subscriptionCleanupRef.current = subscribeToCartChanges(
      cartId,
      applyRealtimeChange,
      nextState => {
        setRealtimeState(currentState => {
          if (currentState === nextState) {
            return currentState;
          }

          if (
            hasConnectedOnceRef.current &&
            currentState === 'connected' &&
            (nextState === 'reconnecting' || nextState === 'disconnected')
          ) {
            needsReconnectSyncRef.current = true;
          }

          if (nextState === 'connected') {
            const shouldSyncAfterReconnect =
              hasConnectedOnceRef.current && needsReconnectSyncRef.current;
            hasConnectedOnceRef.current = true;
            needsReconnectSyncRef.current = false;

            if (shouldSyncAfterReconnect) {
              void refreshRef.current({ silent: true });
            }
          }

          return nextState;
        });
      },
    );
    subscribedCartIdRef.current = cartId;

    return () => {
      if (subscribedCartIdRef.current === cartId) {
        subscriptionCleanupRef.current?.();
        subscriptionCleanupRef.current = null;
        subscribedCartIdRef.current = null;
        hasConnectedOnceRef.current = false;
        needsReconnectSyncRef.current = false;
        pendingRealtimeItemFetches.clear();
      }
    };
  }, [applyRealtimeChange, cartId]);

  return {
    cartId,
    items,
    snapshot: items.length === 0 ? EMPTY_CART_SNAPSHOT : snapshot,
    error,
    isLoading,
    isRefreshing,
    realtimeState,
    refresh,
  };
}

export default useCartPaginated;
