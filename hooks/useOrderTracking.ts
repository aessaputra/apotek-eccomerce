import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicOrderTracking } from '@/services';
import type { TrackingResult } from '@/types/shipping';
import { classifyError, translateErrorMessage } from '@/utils/error';

export type OrderTrackingStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';

export interface UseOrderTrackingState {
  tracking: TrackingResult | null;
  status: OrderTrackingStatus;
  error: string | null;
}

export interface UseOrderTrackingReturn extends UseOrderTrackingState {
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useOrderTracking(orderId?: string, enabled = true): UseOrderTrackingReturn {
  const [state, setState] = useState<UseOrderTrackingState>({
    tracking: null,
    status: enabled && orderId ? 'loading' : 'idle',
    error: null,
  });
  const activeRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    setState({
      tracking: null,
      status: enabled && orderId ? 'loading' : 'idle',
      error: null,
    });
  }, [enabled, orderId]);

  const fetchTracking = useCallback(
    async (reason: 'initial' | 'refresh' = 'initial') => {
      if (!enabled || !orderId) {
        activeRequestIdRef.current += 1;
        setState({ tracking: null, status: 'idle', error: null });
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
        const { data, error } = await getPublicOrderTracking(orderId);

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (error) {
          const classifiedError = classifyError(error);
          setState(prev => ({
            tracking: isRefresh ? prev.tracking : null,
            status: 'error',
            error: translateErrorMessage(classifiedError),
          }));
          return;
        }

        setState({
          tracking: data,
          status: 'success',
          error: null,
        });
      } catch (error) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        const classifiedError = classifyError(error);
        setState({
          tracking: null,
          status: 'error',
          error: translateErrorMessage(classifiedError),
        });
      }
    },
    [enabled, orderId],
  );

  useEffect(() => {
    if (enabled && orderId) {
      void fetchTracking('initial');
    }
  }, [enabled, orderId, fetchTracking]);

  return {
    ...state,
    isLoading: state.status === 'loading',
    isRefreshing: state.status === 'refreshing',
    refresh: () => fetchTracking('refresh'),
  };
}

export default useOrderTracking;
