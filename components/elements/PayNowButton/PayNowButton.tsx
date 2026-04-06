import React, { useCallback, useState } from 'react';
import { Spinner, Text, Button as TamaguiButton } from 'tamagui';
import { useRouter } from 'expo-router';
import { CreditCardIcon } from '@/components/icons';
import { createSnapToken } from '@/services/checkout.service';
import {
  classifyError,
  ErrorType,
  isRetryableError,
  translateErrorMessage,
  type AppError,
} from '@/utils/error';
import { withRetry } from '@/utils/retry';

interface PayNowButtonProps {
  orderId: string;
  orderNumber?: string;
  onPaymentStart?: () => void;
  onPaymentComplete?: (success: boolean) => void;
  onError?: (error: AppError) => void;
}

export function PayNowButton({
  orderId,
  orderNumber,
  onPaymentStart,
  onPaymentComplete,
  onError,
}: PayNowButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayNow = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    onPaymentStart?.();

    try {
      // Step 1: Create Snap token with retry logic
      const snapData = await withRetry(
        async () => {
          const { data, error } = await createSnapToken(orderId);

          if (error || !data) {
            throw error ?? new Error('Gagal membuat token pembayaran.');
          }

          return data;
        },
        {
          maxRetries: 2,
          baseDelay: 800,
          maxDelay: 4000,
          shouldRetry: error => {
            const classifiedError = classifyError(error);
            return (
              classifiedError.type === ErrorType.NETWORK ||
              classifiedError.type === ErrorType.TIMEOUT ||
              classifiedError.type === ErrorType.SERVER
            );
          },
        },
      );

      // Step 2: Navigate to payment scene with Snap URL
      // The Payment scene will handle WebView and payment completion
      router.push({
        pathname: '/cart/payment',
        params: {
          paymentUrl: snapData.redirectUrl,
          orderId: orderId,
        },
      });

      onPaymentComplete?.(true);
    } catch (error) {
      const classifiedError = classifyError(error);
      const translatedMessage = translateErrorMessage(classifiedError);

      const appError: AppError = {
        ...classifiedError,
        message: translatedMessage,
        retryable: isRetryableError(classifiedError),
      };

      onError?.(appError);
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, isProcessing, onPaymentStart, onPaymentComplete, onError, router]);

  return (
    <TamaguiButton
      backgroundColor="$primary"
      color="$onPrimary"
      borderRadius="$3"
      minHeight={36}
      paddingHorizontal="$3"
      disabled={isProcessing}
      opacity={isProcessing ? 0.7 : 1}
      icon={
        isProcessing ? (
          <Spinner size="small" color="$onPrimary" />
        ) : (
          <CreditCardIcon size={16} color="$onPrimary" />
        )
      }
      onPress={handlePayNow}
      aria-label={`Bayar pesanan ${orderNumber ?? orderId}`}>
      <Text color="$onPrimary" fontSize="$3" fontWeight="600">
        {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
      </Text>
    </TamaguiButton>
  );
}
