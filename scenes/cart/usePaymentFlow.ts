import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { appActions } from '@/slices';
import { getOrderPaymentStatus, pollOrderPaymentStatus } from '@/services/checkout.service';
import { DataPersistKeys } from '@/hooks/useDataPersist';
import { invalidateOrderTabCountsCache } from '@/hooks/useOrderTabCounts';
import type { PaymentResult } from '@/types/payment';
import {
  isPollingTimeoutError,
  ORDERS_ROUTE,
  PAYMENT_SUCCESS_STATUSES,
  PAYMENT_FAILED_STATUSES,
  translateCheckoutError,
} from './payment.utils';

interface PaymentFlowRouter {
  replace: (route: string) => void;
}

interface PaymentFlowDispatch {
  (action: unknown): void;
}

interface UsePaymentFlowParams {
  resolvedOrderId: string;
  userId?: string;
  dispatch: PaymentFlowDispatch;
  markCartRefreshRequested: (timestamp: number) => unknown;
  router: PaymentFlowRouter;
  removePersistData: (key: DataPersistKeys) => Promise<boolean>;
}

const ORDER_STATUS_CACHE_KEYS_TO_INVALIDATE = [
  'packing',
  'shipped',
  'completed',
  'cancelled',
] as const;

function invalidateOrderCaches(dispatch: PaymentFlowDispatch, userId?: string) {
  if (!userId) {
    return;
  }

  dispatch(appActions.invalidateUnpaidOrdersCache(userId));
  ORDER_STATUS_CACHE_KEYS_TO_INVALIDATE.forEach(cacheKey => {
    dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey, userId }));
  });

  invalidateOrderTabCountsCache(userId);
}

export function usePaymentFlow({
  resolvedOrderId,
  userId,
  dispatch,
  markCartRefreshRequested,
  router,
  removePersistData,
}: UsePaymentFlowParams) {
  const [isPolling, setIsPolling] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult['status'] | null>(null);
  const [postPaymentState, setPostPaymentState] = useState<
    'idle' | 'verifying' | 'closing' | 'timeout'
  >('idle');
  const [postPaymentMessage, setPostPaymentMessage] = useState<string | null>(null);
  const [confirmCloseDialogOpen, setConfirmCloseDialogOpen] = useState(false);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const finalizeOnceRef = useRef(false);

  const finalizePaymentFlow = useCallback(
    async (reason: PaymentResult['status']) => {
      if (finalizeOnceRef.current) {
        return;
      }

      finalizeOnceRef.current = true;
      setPaymentResult(reason);
      setConfirmCloseDialogOpen(false);
      setWebviewLoading(false);
      setPaymentError(null);
      setPostPaymentState('verifying');
      setPostPaymentMessage(null);

      if (!resolvedOrderId) {
        await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
        router.replace(ORDERS_ROUTE);
        return;
      }

      setIsPolling(true);
      const { data, error } = await pollOrderPaymentStatus(resolvedOrderId, 12, 2000);
      setIsPolling(false);

      const paymentStatus = data?.payment_status ?? '';
      const terminalFailedStates = ['deny', 'cancel', 'expire', 'failure'];

      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);

      if (!error && PAYMENT_SUCCESS_STATUSES.includes(paymentStatus)) {
        invalidateOrderCaches(dispatch, userId);
        dispatch(markCartRefreshRequested(Date.now()));
        router.replace(`/payment-success?orderId=${resolvedOrderId}`);
        return;
      }

      if (error) {
        invalidateOrderCaches(dispatch, userId);
        setPostPaymentState('timeout');

        if (isPollingTimeoutError(error.message)) {
          setPostPaymentMessage('Pembayaran sedang diproses. Cek status di halaman Pesanan.');
          return;
        }

        setPostPaymentMessage(
          translateCheckoutError(
            error.message,
            'Status pembayaran belum dapat dipastikan. Silakan cek halaman pesanan.',
          ),
        );
        return;
      }

      if (terminalFailedStates.includes(paymentStatus)) {
        setPaymentError('Pembayaran terdeteksi gagal atau dibatalkan. Silakan ulangi pembayaran.');
        invalidateOrderCaches(dispatch, userId);
        router.replace(ORDERS_ROUTE);
        return;
      }

      setPostPaymentState('timeout');
      setPostPaymentMessage('Pembayaran sedang diproses. Cek status di halaman Pesanan.');
    },
    [dispatch, markCartRefreshRequested, removePersistData, resolvedOrderId, router, userId],
  );

  const handleUserClose = useCallback(async () => {
    if (finalizeOnceRef.current) {
      return;
    }

    finalizeOnceRef.current = true;
    setConfirmCloseDialogOpen(false);
    setWebviewLoading(false);
    setPaymentError(null);
    setPostPaymentState('closing');
    setPostPaymentMessage(null);

    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);

    if (!resolvedOrderId) {
      router.replace(ORDERS_ROUTE);
      return;
    }

    const { data, error } = await getOrderPaymentStatus(resolvedOrderId);
    const paymentStatus = data?.payment_status ?? '';

    if (!error && PAYMENT_SUCCESS_STATUSES.includes(paymentStatus)) {
      invalidateOrderCaches(dispatch, userId);
      dispatch(markCartRefreshRequested(Date.now()));
      router.replace(`/payment-success?orderId=${resolvedOrderId}`);
      return;
    }

    invalidateOrderCaches(dispatch, userId);
    router.replace(ORDERS_ROUTE);
  }, [dispatch, markCartRefreshRequested, removePersistData, resolvedOrderId, router, userId]);

  useEffect(() => {
    if (!resolvedOrderId || postPaymentState !== 'idle' || isPolling) {
      return;
    }

    const intervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from('order_read_model')
        .select('payment_status')
        .eq('id', resolvedOrderId)
        .single();

      if (!error && data) {
        const newPaymentStatus = data.payment_status ?? '';
        const terminalStates = [...PAYMENT_SUCCESS_STATUSES, ...PAYMENT_FAILED_STATUSES];

        if (terminalStates.includes(newPaymentStatus)) {
          void finalizePaymentFlow('pending');
        }
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [resolvedOrderId, finalizePaymentFlow, postPaymentState, isPolling]);

  return {
    confirmCloseDialogOpen,
    finalizePaymentFlow,
    handleUserClose,
    isPolling,
    paymentError,
    paymentResult,
    postPaymentMessage,
    postPaymentState,
    setConfirmCloseDialogOpen,
    setPaymentError,
    setWebviewLoading,
    shouldHidePaymentChrome:
      postPaymentState !== 'idle' || isPolling || paymentResult === 'success',
    webviewLoading,
  };
}
