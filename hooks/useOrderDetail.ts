import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from 'expo-router';
import { confirmOrderReceived, getOrderById, type OrderWithItems } from '@/services/order.service';
import { appActions } from '@/slices/app.slice';
import type { Dispatch } from '@/utils/store';
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
  isConfirming: boolean;
  confirmReceived: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useOrderDetail(orderId?: string): UseOrderDetailReturn {
  const dispatch = useDispatch<Dispatch>();
  const [state, setState] = useState<UseOrderDetailState>({
    order: null,
    status: orderId ? 'loading' : 'idle',
    error: null,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasInitialLoadCompletedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

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

        lastLoadTimeRef.current = Date.now();

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
        const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
        if (timeSinceLoad > 2000) {
          void fetchOrder('refresh');
        }
      }
    }, [orderId, fetchOrder]),
  );

  const isLoading = state.status === 'loading';
  const isRefreshing = state.status === 'refreshing';

  const confirmReceived = useCallback(async (): Promise<boolean> => {
    if (!orderId || isConfirming) {
      return false;
    }

    setIsConfirming(true);

    try {
      const { error } = await confirmOrderReceived(orderId);

      if (error) {
        const classifiedError = classifyError(error);
        const errorMessage = translateErrorMessage(classifiedError);

        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));

        return false;
      }

      const userId = state.order?.user_id;
      if (userId) {
        dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey: 'shipped', userId }));
        dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey: 'completed', userId }));
      }

      await fetchOrder('refresh');
      return true;
    } catch (err) {
      const classifiedError = classifyError(err);
      const errorMessage = translateErrorMessage(classifiedError);

      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      return false;
    } finally {
      setIsConfirming(false);
    }
  }, [dispatch, fetchOrder, isConfirming, orderId, state.order?.user_id]);

  return {
    ...state,
    isLoading,
    isRefreshing,
    isConfirming,
    confirmReceived,
    refresh: () => fetchOrder('refresh'),
  };
}

export default useOrderDetail;
