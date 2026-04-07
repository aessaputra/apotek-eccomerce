import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getOrderById, type OrderWithItems } from '@/services/order.service';
import { classifyError, translateErrorMessage } from '@/utils/error';

export type OrderDetailStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'not-found'
  | 'error';

export interface UseOrderDetailState {
  order: OrderWithItems | null;
  status: OrderDetailStatus;
  error: string | null;
}

export interface UseOrderDetailReturn extends UseOrderDetailState {
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useOrderDetail(orderId?: string): UseOrderDetailReturn {
  const [state, setState] = useState<UseOrderDetailState>({
    order: null,
    status: orderId ? 'loading' : 'idle',
    error: null,
  });

  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasInitialLoadCompletedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    setState({
      order: null,
      status: orderId ? 'loading' : 'idle',
      error: null,
    });
    hasInitialLoadCompletedRef.current = false;
  }, [orderId]);

  const fetchOrder = useCallback(
    async (reason: 'initial' | 'refresh' = 'initial') => {
      if (!orderId) {
        setState(prev => ({ ...prev, status: 'idle' }));
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      const isRefresh = reason === 'refresh';
      setState(prev => ({
        ...prev,
        status: isRefresh ? 'refreshing' : 'loading',
        error: isRefresh ? prev.error : null,
      }));

      try {
        const { data, error } = await getOrderById(orderId);

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (error) {
          const classifiedError = classifyError(error);
          const errorMessage = translateErrorMessage(classifiedError);

          if (__DEV__) {
            console.warn('[useOrderDetail] fetch error:', { orderId, error: errorMessage });
          }

          setState(prev => ({
            ...prev,
            order: isRefresh ? prev.order : null,
            status: 'error',
            error: errorMessage,
          }));
          return;
        }

        if (!data) {
          setState(prev => ({
            ...prev,
            order: null,
            status: 'not-found',
            error: null,
          }));
          return;
        }

        if (__DEV__) {
          console.log('[useOrderDetail] fetch success:', {
            orderId,
            orderNumber: data.midtrans_order_id ?? data.id,
            itemCount: data.order_items?.length ?? 0,
          });
        }

        setState({
          order: data,
          status: 'success',
          error: null,
        });

        if (reason === 'initial') {
          hasInitialLoadCompletedRef.current = true;
        }
      } catch (err) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        const classifiedError = classifyError(err);
        const errorMessage = translateErrorMessage(classifiedError);

        if (__DEV__) {
          console.warn('[useOrderDetail] unexpected error:', err);
        }

        setState(prev => ({
          ...prev,
          order: isRefresh ? prev.order : null,
          status: 'error',
          error: errorMessage,
        }));
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (orderId) {
      void fetchOrder('initial');
    }
  }, [orderId, fetchOrder]);

  useFocusEffect(
    useCallback(() => {
      if (orderId && hasInitialLoadCompletedRef.current) {
        void fetchOrder('refresh');
      }
    }, [orderId, fetchOrder]),
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, status: prev.order ? 'success' : 'idle' }));
  }, []);

  const isLoading = state.status === 'loading';
  const isRefreshing = state.status === 'refreshing';

  return {
    ...state,
    isLoading,
    isRefreshing,
    refresh: () => fetchOrder('refresh'),
    clearError,
  };
}

export default useOrderDetail;
