import React from 'react';
import { YStack, Text } from 'tamagui';
import { CheckCircleIcon } from '@/components/icons';

export default function CompletedOrders() {
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      gap="$4">
      <CheckCircleIcon size={64} color="$colorSubtle" />
      <Text fontSize="$6" fontWeight="700" color="$color">
        Selesai
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Pesanan yang sudah selesai akan muncul di sini
      </Text>
    </YStack>
  );
}
