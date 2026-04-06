import React from 'react';
import { YStack, Text } from 'tamagui';
import { TruckIcon } from '@/components/icons';

export default function ShippedOrders() {
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      gap="$4">
      <TruckIcon size={64} color="$colorSubtle" />
      <Text fontSize="$6" fontWeight="700" color="$color">
        Dikirim
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Pesanan yang sedang dalam pengiriman akan muncul di sini
      </Text>
    </YStack>
  );
}
