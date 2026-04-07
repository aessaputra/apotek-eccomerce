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

export interface PayNowButtonProps {
  orderId: string;
  orderNumber?: string;
  variant?: 'default' | 'fullWidth';
  disabled?: boolean;
  onPaymentStart?: () => void;
  onPaymentComplete?: (success: boolean) => void;
  onError?: (error: AppError) => void;
}

export function PayNowButton({
  orderId,
  orderNumber,
  variant = 'default',
  disabled = false,
  onPaymentStart,
  onPaymentComplete,
  onError,
}: PayNowButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayNow = useCallback(async () => {
    if (isProcessing || disabled) return;

    setIsProcessing(true);
    onPaymentStart?.();

    try {
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
  }, [orderId, isProcessing, disabled, onPaymentStart, onPaymentComplete, onError, router]);

  const isFullWidth = variant === 'fullWidth';

  return (
    <TamaguiButton
      backgroundColor={isFullWidth ? '$warning' : '$primary'}
      color="$onPrimary"
      borderRadius="$4"
      minHeight={isFullWidth ? 48 : 36}
      paddingHorizontal={isFullWidth ? '$4' : '$3'}
      disabled={isProcessing || disabled}
      opacity={isProcessing || disabled ? 0.5 : 1}
      flex={isFullWidth ? 1 : undefined}
      icon={
        isProcessing ? (
          <Spinner size="small" color="$onPrimary" />
        ) : (
          <CreditCardIcon size={isFullWidth ? 20 : 16} color="$onPrimary" />
        )
      }
      onPress={e => {
        e.stopPropagation();
        void handlePayNow();
      }}
      aria-label={`Bayar pesanan ${orderNumber ?? orderId}`}>
      <Text color="$onPrimary" fontSize={isFullWidth ? '$4' : '$3'} fontWeight="700">
        {disabled ? 'Kadaluarsa' : isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
      </Text>
    </TamaguiButton>
  );
}

export default PayNowButton;
