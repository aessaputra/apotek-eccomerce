import React from 'react';
import { YStack, XStack } from 'tamagui';

export interface CartLoadingSkeletonProps {
  rowCount?: number;
}

export const CartLoadingSkeleton: React.FC<CartLoadingSkeletonProps> = ({ rowCount = 3 }) => {
  return (
    <YStack gap="$3" padding="$4">
      {Array.from({ length: rowCount }).map((_, index) => (
        <XStack
          key={`skeleton-${index}`}
          gap="$3"
          padding="$3"
          backgroundColor="$surface"
          borderRadius="$3">
          <YStack width={80} height={80} backgroundColor="$surfaceBorder" borderRadius="$2" />

          <YStack flex={1} gap="$2" justifyContent="center">
            <YStack height={16} backgroundColor="$surfaceBorder" borderRadius="$1" width="70%" />
            <YStack height={12} backgroundColor="$surfaceBorder" borderRadius="$1" width="40%" />
            <YStack
              height={14}
              backgroundColor="$surfaceBorder"
              borderRadius="$1"
              width="30%"
              marginTop="$1"
            />
          </YStack>

          <YStack width={32} height={32} backgroundColor="$surfaceBorder" borderRadius="$2" />
        </XStack>
      ))}

      <YStack
        gap="$3"
        padding="$4"
        backgroundColor="$surface"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$surfaceBorder">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack height={14} backgroundColor="$surfaceBorder" borderRadius="$1" width="30%" />
          <YStack height={14} backgroundColor="$surfaceBorder" borderRadius="$1" width="25%" />
        </XStack>

        <XStack justifyContent="space-between" alignItems="center">
          <YStack height={14} backgroundColor="$surfaceBorder" borderRadius="$1" width="25%" />
          <YStack height={14} backgroundColor="$surfaceBorder" borderRadius="$1" width="30%" />
        </XStack>

        <YStack height={1} backgroundColor="$surfaceBorder" marginVertical="$2" />

        <XStack justifyContent="space-between" alignItems="center">
          <YStack height={16} backgroundColor="$surfaceBorder" borderRadius="$1" width="20%" />
          <YStack height={16} backgroundColor="$surfaceBorder" borderRadius="$1" width="35%" />
        </XStack>
      </YStack>
    </YStack>
  );
};

export default CartLoadingSkeleton;
