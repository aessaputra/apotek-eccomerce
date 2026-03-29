'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCartWithItems, subscribeToCartChanges } from '@/services/cart.service';
import type {
  CartItemWithProduct,
  CartRealtimeChange,
  CartRealtimeConnectionState,
  CartSnapshot,
} from '@/types/cart';

const EMPTY_SNAPSHOT: CartSnapshot = {
  itemCount: 0,
  estimatedWeightGrams: 0,
  packageValue: 0,
};

function buildSnapshot(items: CartItemWithProduct[]): CartSnapshot {
  return items.reduce(
    (nextSnapshot, item) => {
      nextSnapshot.itemCount += item.quantity;
      nextSnapshot.estimatedWeightGrams += item.quantity * item.product.weight;
      nextSnapshot.packageValue += item.quantity * item.product.price;
      return nextSnapshot;
    },
    {
      itemCount: 0,
      estimatedWeightGrams: 0,
      packageValue: 0,
    },
  );
}

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
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeState, setRealtimeState] = useState<CartRealtimeConnectionState>('disconnected');

  const isMountedRef = useRef(true);
  const subscriptionCleanupRef = useRef<(() => void) | null>(null);
  const subscribedCartIdRef = useRef<string | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const refreshRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(async () => {});

  const snapshot = useMemo(() => buildSnapshot(items), [items]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
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

      if (mode === 'initial') {
        setIsLoading(true);
      } else if (!silent) {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const { data, error: fetchError } = await getCartWithItems(userId);

        if (!isMountedRef.current) {
          return;
        }

        if (fetchError || !data) {
          throw fetchError ?? new Error('Gagal memuat keranjang.');
        }

        setCartId(data.cartId);
        setItems(data.items);
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Gagal memuat keranjang.');
      } finally {
        if (isMountedRef.current) {
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
    if (!userId) {
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
    snapshot: items.length === 0 ? EMPTY_SNAPSHOT : snapshot,
    error,
    isLoading,
    isRefreshing,
    realtimeState,
    refresh,
  };
}

export default useCartPaginated;
