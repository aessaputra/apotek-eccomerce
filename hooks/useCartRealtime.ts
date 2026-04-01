import { useEffect, useRef, useState } from 'react';
import { subscribeToCartChanges } from '@/services/cart.service';
import type { CartRealtimeConnectionState } from '@/types/cart';

interface CartRealtimeState {
  isConnected: boolean;
  lastUpdate: number | null;
  pendingUpdate: boolean;
  connectionState: CartRealtimeConnectionState;
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
    connectionState: 'disconnected',
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!cartId) {
      return;
    }

    unsubscribeRef.current = subscribeToCartChanges(
      cartId,
      change => {
        const itemId = change.new?.id ?? change.old?.id ?? 'unknown';

        if (__DEV__) {
          console.log(`[CartRealtime] ${change.type} event for item ${itemId}`);
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
      },
      nextState => {
        setState(prev => ({
          ...prev,
          connectionState: nextState,
          isConnected: nextState === 'connected',
        }));
      },
    );

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
        connectionState: 'disconnected',
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
