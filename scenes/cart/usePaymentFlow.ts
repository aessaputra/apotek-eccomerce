import { useCallback, useRef, useState } from 'react';
import { appActions } from '@/slices';
import { pollOrderPaymentStatus } from '@/services/checkout.service';
import { DataPersistKeys } from '@/hooks/useDataPersist';
import type { PaymentResult } from '@/types/payment';
import {
  isPollingTimeoutError,
  ORDERS_ROUTE,
  PAYMENT_SUCCESS_STATUSES,
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
  markCartCleared: (timestamp: number) => unknown;
  router: PaymentFlowRouter;
  removePersistData: (key: DataPersistKeys) => Promise<boolean>;
}

function invalidateOrderCaches(dispatch: PaymentFlowDispatch, userId?: string) {
  if (!userId) {
    return;
  }

  dispatch(appActions.invalidateUnpaidOrdersCache(userId));
  dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey: 'packing', userId }));
  dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey: 'shipped', userId }));
  dispatch(appActions.invalidateOrdersByStatusCache({ cacheKey: 'completed', userId }));
}

export function usePaymentFlow({
  resolvedOrderId,
  userId,
  dispatch,
  markCartCleared,
  router,
  removePersistData,
}: UsePaymentFlowParams) {
  const [isPolling, setIsPolling] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult['status'] | null>(null);
  const [postPaymentState, setPostPaymentState] = useState<'idle' | 'verifying' | 'timeout'>(
    'idle',
  );
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
        dispatch(markCartCleared(Date.now()));
        router.replace(`/order-success?orderId=${resolvedOrderId}`);
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
    [dispatch, markCartCleared, removePersistData, resolvedOrderId, router, userId],
  );

  return {
    confirmCloseDialogOpen,
    finalizePaymentFlow,
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
