import React from 'react';
import { Spinner, Text, Button as TamaguiButton } from 'tamagui';
import { CreditCardIcon } from '@/components/icons';
import { usePayNow } from '@/hooks/usePayNow';
import type { AppError } from '@/utils/error';

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
  const { isProcessing, handlePayNow } = usePayNow({
    orderId,
    disabled,
    onPaymentStart,
    onPaymentComplete,
    onError,
  });

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
        e?.stopPropagation?.();
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
