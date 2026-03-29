import { useCallback, useEffect, useRef, useState } from 'react';
import { getCartWithItems } from '@/services/cart.service';
import type { CartItemWithProduct, CartSnapshot } from '@/types/cart';

const EMPTY_SNAPSHOT: CartSnapshot = {
  itemCount: 0,
  estimatedWeightGrams: 0,
  packageValue: 0,
};

export interface UseCartPaginatedReturn {
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

export interface UseCartPaginatedParams {
  userId?: string;
}

export function useCartPaginated({ userId }: UseCartPaginatedParams): UseCartPaginatedReturn {
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [snapshot, setSnapshot] = useState<CartSnapshot>(EMPTY_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCart = useCallback(
    async (mode: 'initial' | 'refresh', silent: boolean = false): Promise<void> => {
      if (!userId) {
        if (isMountedRef.current) {
          setItems([]);
          setSnapshot(EMPTY_SNAPSHOT);
          setError(null);
          setIsLoading(false);
          setIsRefreshing(false);
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

        setItems(data.items);
        setSnapshot(data.snapshot);
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
    if (!userId) {
      setItems([]);
      setSnapshot(EMPTY_SNAPSHOT);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    void fetchCart('initial');
  }, [fetchCart, userId]);

  return {
    items,
    snapshot,
    error,
    isLoading,
    isRefreshing,
    refresh,
  };
}

export default useCartPaginated;
