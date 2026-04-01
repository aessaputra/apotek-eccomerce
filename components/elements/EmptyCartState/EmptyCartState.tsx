import React from 'react';
import { Button, Text, YStack } from 'tamagui';
import { ShoppingCart, ShoppingBag } from '@tamagui/lucide-icons';

export interface EmptyCartStateProps {
  onBrowse: () => void;
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({ onBrowse }) => {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
      <ShoppingCart size={64} color="$primary" />

      <YStack alignItems="center" gap="$1" marginBottom="$2">
        <Text fontSize="$5" fontWeight="700" color="$color">
          Keranjang Kosong
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center" numberOfLines={2}>
          Belum ada produk di keranjang Anda
        </Text>
      </YStack>

      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        fontWeight="600"
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
        onPress={onBrowse}
        icon={<ShoppingBag size={18} color="$onPrimary" />}>
        Belanja Sekarang
      </Button>
    </YStack>
  );
};

export default EmptyCartState;
