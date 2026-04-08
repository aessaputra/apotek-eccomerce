import React, { useEffect } from 'react';
import { YStack } from 'tamagui';
import { useRouter, useSegments } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';

export default function Orders() {
  const router = useRouter();
  const segments = useSegments();

  const handleTabChange = (tab: OrderTab) => {
    router.push(`/orders/${tab}`);
  };

  useEffect(() => {
    const currentSegment = segments[segments.length - 1];
    if (currentSegment === 'orders' || currentSegment === 'index') {
      router.push('/orders/unpaid');
    }
  }, [segments, router]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <OrderStatusTabs
        counts={{ unpaid: 0, packing: 0, shipped: 0, completed: 0 }}
        onTabChange={handleTabChange}
      />
    </YStack>
  );
}
