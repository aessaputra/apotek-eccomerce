import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text, Button, Spinner } from 'tamagui';
import { BOTTOM_BAR_HEIGHT, BOTTOM_BAR_SHADOW } from '@/constants/ui';

export interface StickyBottomBarProps {
  grandTotal: number;
  isLoading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  confirmText?: string;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const StickyBottomBar = ({
  grandTotal,
  isLoading = false,
  disabled = false,
  onConfirm,
  confirmText = 'Konfirmasi',
}: StickyBottomBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <XStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={BOTTOM_BAR_HEIGHT + insets.bottom}
      paddingBottom={insets.bottom}
      paddingHorizontal="$4"
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$surfaceBorder"
      alignItems="center"
      gap="$3"
      elevation={8}
      {...BOTTOM_BAR_SHADOW}>
      <YStack flex={1}>
        <Text fontSize="$2" color="$color10">
          Total
        </Text>
        <Text fontSize="$6" fontWeight="800" color="$color">
          {formatRupiah(grandTotal)}
        </Text>
      </YStack>

      <Button
        flex={1}
        size="$5"
        backgroundColor="$primary"
        color="white"
        borderRadius="$4"
        fontWeight="700"
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
        disabled={disabled || isLoading}
        opacity={disabled || isLoading ? 0.6 : 1}
        onPress={onConfirm}
        icon={isLoading ? <Spinner color="white" /> : undefined}>
        {confirmText}
      </Button>
    </XStack>
  );
};
