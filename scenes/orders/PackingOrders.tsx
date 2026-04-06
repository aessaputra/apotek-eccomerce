import React from 'react';
import { YStack, Text } from 'tamagui';
import { PackageIcon } from '@/components/icons';

export default function PackingOrders() {
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      gap="$4">
      <PackageIcon size={64} color="$colorSubtle" />
      <Text fontSize="$6" fontWeight="700" color="$color">
        Dikemas
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Pesanan yang sedang dikemas akan muncul di sini
      </Text>
    </YStack>
  );
}
