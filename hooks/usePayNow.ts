import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { requestSnapTokenWithRetry } from '@/hooks/useCartCheckout.helpers';
import {
  classifyError,
  isRetryableError,
  translateErrorMessage,
  type AppError,
} from '@/utils/error';

export interface UsePayNowParams {
  orderId: string;
  disabled?: boolean;
  onPaymentStart?: () => void;
  onPaymentComplete?: (success: boolean) => void;
  onError?: (error: AppError) => void;
}

export interface UsePayNowReturn {
  isProcessing: boolean;
  handlePayNow: () => Promise<void>;
}

export function usePayNow({
  orderId,
  disabled = false,
  onPaymentStart,
  onPaymentComplete,
  onError,
}: UsePayNowParams): UsePayNowReturn {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const handlePayNow = useCallback(async () => {
    if (isProcessingRef.current || disabled) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    onPaymentStart?.();

    try {
      const snapData = await requestSnapTokenWithRetry(orderId);

      router.push({
        pathname: '/cart/payment',
        params: {
          paymentUrl: snapData.redirectUrl,
          orderId,
        },
      });

      onPaymentComplete?.(true);
    } catch (error) {
      const classifiedError = classifyError(error);

      onError?.({
        ...classifiedError,
        message: translateErrorMessage(classifiedError),
        retryable: isRetryableError(classifiedError),
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [disabled, onError, onPaymentComplete, onPaymentStart, orderId, router]);

  return {
    isProcessing,
    handlePayNow,
  };
}

export default usePayNow;
