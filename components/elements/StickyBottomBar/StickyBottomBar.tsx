import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text, Button, Spinner } from 'tamagui';
import { BOTTOM_BAR_HEIGHT, MIN_TOUCH_TARGET } from '@/constants/ui';
import { formatRupiah } from '@/utils/currency';

export interface StickyBottomBarProps {
  grandTotal: number;
  isLoading?: boolean;
  disabled?: boolean;
  hideTotal?: boolean;
  onConfirm: () => void;
  confirmText?: string;
}

export const StickyBottomBar = ({
  grandTotal,
  isLoading = false,
  disabled = false,
  hideTotal = false,
  onConfirm,
  confirmText = 'Konfirmasi',
}: StickyBottomBarProps) => {
  const insets = useSafeAreaInsets();
  const formattedGrandTotal = formatRupiah(grandTotal);

  return (
    <XStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={BOTTOM_BAR_HEIGHT + insets.bottom}
      paddingBottom={insets.bottom}
      paddingHorizontal="$4"
      backgroundColor="$surface"
      borderTopWidth={1}
      borderTopColor="$surfaceBorder"
      alignItems="center"
      gap="$3"
      role="toolbar"
      aria-label="Ringkasan dan aksi checkout">
      {hideTotal ? null : (
        <YStack flex={1}>
          <Text fontSize="$2" color="$colorSubtle">
            Total
          </Text>
          <Text
            fontSize="$6"
            fontWeight="800"
            color="$color"
            aria-label={`Total belanja ${formattedGrandTotal}`}>
            {formattedGrandTotal}
          </Text>
        </YStack>
      )}

      <Button
        flex={1}
        size="$5"
        minHeight={MIN_TOUCH_TARGET}
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        fontWeight="700"
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
        disabled={disabled || isLoading}
        opacity={disabled || isLoading ? 0.6 : 1}
        onPress={onConfirm}
        role="button"
        aria-label={confirmText}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        icon={isLoading ? <Spinner color="$onPrimary" /> : undefined}>
        {confirmText}
      </Button>
    </XStack>
  );
};
