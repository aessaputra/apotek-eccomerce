import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text, Button, Spinner } from 'tamagui';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';
import { formatPrice } from '@/services/home.service';

export interface StickyBottomBarProps {
  grandTotal: number;
  isLoading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  confirmText?: string;
  /** When true, hide the total display and stretch the CTA button full-width.
   *  Used on review screens where the total is already shown in-scene. */
  hideTotal?: boolean;
}

export const StickyBottomBar = ({
  grandTotal,
  isLoading = false,
  disabled = false,
  onConfirm,
  confirmText = 'Konfirmasi',
  hideTotal = false,
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
      backgroundColor="$surface"
      borderTopWidth={1}
      borderTopColor="$surfaceBorder"
      alignItems="center"
      gap="$3">
      {hideTotal ? null : (
        <YStack flex={1}>
          <Text fontSize="$2" color="$colorSubtle">
            Total
          </Text>
          <Text fontSize="$6" fontWeight="800" color="$color">
            {formatPrice(grandTotal)}
          </Text>
        </YStack>
      )}

      <Button
        flex={hideTotal ? undefined : 1}
        width={hideTotal ? '100%' : undefined}
        size="$5"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        fontWeight="700"
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
        disabled={disabled || isLoading}
        opacity={disabled || isLoading ? 0.6 : 1}
        onPress={onConfirm}
        icon={isLoading ? <Spinner color="$onPrimary" /> : undefined}>
        {confirmText}
      </Button>
    </XStack>
  );
};
