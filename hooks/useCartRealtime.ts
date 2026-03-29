import { useEffect, useRef, useState } from 'react';
import { subscribeToCartChanges } from '@/services/cart.service';

interface CartRealtimeState {
  isConnected: boolean;
  lastUpdate: number | null;
  pendingUpdate: boolean;
}

interface UseCartRealtimeReturn extends CartRealtimeState {
  triggerRefresh: () => void;
}

export function useCartRealtime(
  cartId: string | null,
  onCartChange: () => void,
): UseCartRealtimeReturn {
  const [state, setState] = useState<CartRealtimeState>({
    isConnected: false,
    lastUpdate: null,
    pendingUpdate: false,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!cartId) {
      return;
    }

    setState(prev => ({ ...prev, isConnected: true }));

    unsubscribeRef.current = subscribeToCartChanges(cartId, ({ type, itemId }) => {
      if (__DEV__) {
        console.log(`[CartRealtime] ${type} event for item ${itemId}`);
      }

      setState(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        pendingUpdate: true,
      }));

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onCartChange();
        setState(prev => ({ ...prev, pendingUpdate: false }));
      }, 300);
    });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setState({
        isConnected: false,
        lastUpdate: null,
        pendingUpdate: false,
      });
    };
  }, [cartId, onCartChange]);

  const triggerRefresh = () => {
    onCartChange();
    setState(prev => ({ ...prev, lastUpdate: Date.now(), pendingUpdate: false }));
  };

  return {
    ...state,
    triggerRefresh,
  };
}
