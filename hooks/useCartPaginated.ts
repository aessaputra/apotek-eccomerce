'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getCartWithItems, subscribeToCartChanges } from '@/services/cart.service';
import type {
  CartItemWithProduct,
  CartRealtimeChange,
  CartRealtimeConnectionState,
  CartSnapshot,
} from '@/types/cart';
import { buildCartSnapshot, EMPTY_CART_SNAPSHOT } from '@/utils/cart';
import { State } from '@/utils/store';

const DEFAULT_ITEM_WEIGHT_GRAMS = 200;

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
  const refreshRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(async () => {});
  const lastHandledCartClearedAtRef = useRef<number | null>(null);

  const snapshot = useMemo(() => buildCartSnapshot(items, DEFAULT_ITEM_WEIGHT_GRAMS), [items]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      fetchAbortControllerRef.current?.abort();
      fetchAbortControllerRef.current = null;
    };
  }, []);

  const applyRealtimeChange = useCallback((change: CartRealtimeChange) => {
    setItems(currentItems => {
      if (change.type === 'INSERT') {
        const insertedItem = change.new;

        if (!insertedItem) {
          return currentItems;
        }

        if (currentItems.some(item => item.id === insertedItem.id)) {
          return currentItems;
        }

        void refreshRef.current({ silent: true });
        return currentItems;
      }

      if (change.type === 'DELETE') {
        const deletedItem = change.old ?? change.new;

        if (!deletedItem) {
          return currentItems;
        }

        const nextItems = currentItems.filter(item => item.id !== deletedItem.id);
        return nextItems.length === currentItems.length ? currentItems : nextItems;
      }

      const updatedItem = change.new;

      if (!updatedItem) {
        return currentItems;
      }

      let found = false;
      const nextItems = currentItems.map(item => {
        if (item.id !== updatedItem.id) {
          return item;
        }

        found = true;
        return {
          ...item,
          quantity: updatedItem.quantity,
        };
      });

      if (!found) {
        void refreshRef.current({ silent: true });
        return currentItems;
      }

      return nextItems;
    });
  }, []);

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
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
      subscribedCartIdRef.current = null;
      hasConnectedOnceRef.current = false;
      return;
    }

    void fetchCart('initial');
  }, [fetchCart, userId]);

  useEffect(() => {
    if (!cartId) {
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
      subscribedCartIdRef.current = null;
      hasConnectedOnceRef.current = false;
      setRealtimeState('disconnected');
      return;
    }

    if (subscribedCartIdRef.current === cartId && subscriptionCleanupRef.current) {
      return;
    }

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
            nextState === 'connected' &&
            hasConnectedOnceRef.current &&
            (currentState === 'reconnecting' || currentState === 'disconnected')
          ) {
            void refreshRef.current({ silent: true });
          }

          if (nextState === 'connected') {
            hasConnectedOnceRef.current = true;
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
