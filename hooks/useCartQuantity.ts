'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateCartItemQuantity } from '@/services/cart.service';
import type { CartItemWithProduct, CartSnapshot } from '@/types/cart';
import { buildCartSnapshot } from '@/utils/cart';

interface OptimisticQuantityEntry {
  quantity: number;
  mutationId: number;
}

interface UseCartQuantityParams {
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  onError?: (message: string) => void;
}

interface UseCartQuantityReturn {
  items: CartItemWithProduct[];
  snapshot: CartSnapshot;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
}

const DEFAULT_ITEM_WEIGHT_GRAMS = 200;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useCartQuantity({
  items,
  snapshot,
  onError,
}: UseCartQuantityParams): UseCartQuantityReturn {
  const mutationCounterRef = useRef(0);
  const latestMutationByItemRef = useRef(new Map<string, number>());
  const [optimisticQuantities, setOptimisticQuantities] = useState<
    Record<string, OptimisticQuantityEntry>
  >({});

  useEffect(() => {
    setOptimisticQuantities(currentEntries => {
      let hasChanges = false;
      const nextEntries = { ...currentEntries };
      const baseQuantities = new Map(items.map(item => [item.id, item.quantity]));

      Object.entries(currentEntries).forEach(([itemId, entry]) => {
        const serverQuantity = baseQuantities.get(itemId);

        if (serverQuantity === undefined || serverQuantity === entry.quantity) {
          delete nextEntries[itemId];
          hasChanges = true;
        }
      });

      return hasChanges ? nextEntries : currentEntries;
    });
  }, [items]);

  const optimisticItems = useMemo(() => {
    return items.map(item => {
      const optimisticEntry = optimisticQuantities[item.id];

      if (!optimisticEntry) {
        return item;
      }

      return {
        ...item,
        quantity: optimisticEntry.quantity,
      };
    });
  }, [items, optimisticQuantities]);

  const optimisticSnapshot = useMemo(() => {
    if (Object.keys(optimisticQuantities).length === 0) {
      return snapshot;
    }

    return buildCartSnapshot(optimisticItems, DEFAULT_ITEM_WEIGHT_GRAMS);
  }, [optimisticItems, optimisticQuantities, snapshot]);

  const updateQuantity = useCallback(
    (cartItemId: string, newQuantity: number) => {
      const mutationId = mutationCounterRef.current + 1;
      mutationCounterRef.current = mutationId;
      latestMutationByItemRef.current.set(cartItemId, mutationId);

      setOptimisticQuantities(currentEntries => ({
        ...currentEntries,
        [cartItemId]: {
          quantity: newQuantity,
          mutationId,
        },
      }));

      void updateCartItemQuantity(cartItemId, newQuantity)
        .then(({ error }) => {
          if (!error) {
            return;
          }

          if (isAbortError(error)) {
            return;
          }

          if (latestMutationByItemRef.current.get(cartItemId) !== mutationId) {
            return;
          }

          setOptimisticQuantities(currentEntries => {
            if (
              !currentEntries[cartItemId] ||
              currentEntries[cartItemId]?.mutationId !== mutationId
            ) {
              return currentEntries;
            }

            const nextEntries = { ...currentEntries };
            delete nextEntries[cartItemId];
            return nextEntries;
          });

          onError?.(error.message);
        })
        .catch(error => {
          if (isAbortError(error)) {
            return;
          }

          if (latestMutationByItemRef.current.get(cartItemId) !== mutationId) {
            return;
          }

          setOptimisticQuantities(currentEntries => {
            if (
              !currentEntries[cartItemId] ||
              currentEntries[cartItemId]?.mutationId !== mutationId
            ) {
              return currentEntries;
            }

            const nextEntries = { ...currentEntries };
            delete nextEntries[cartItemId];
            return nextEntries;
          });

          onError?.(error instanceof Error ? error.message : 'Gagal memperbarui keranjang.');
        });
    },
    [onError],
  );

  return {
    items: optimisticItems,
    snapshot: optimisticSnapshot,
    updateQuantity,
  };
}

export default useCartQuantity;
