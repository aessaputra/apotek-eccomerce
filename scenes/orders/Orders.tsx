import React from 'react';
import { YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import UnpaidOrders from './UnpaidOrders';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';

export default function Orders() {
  const router = useRouter();

  const handleTabChange = (tab: OrderTab) => {
    router.push(`/orders/${tab}`);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <OrderStatusTabs
        activeTab="unpaid"
        counts={{ unpaid: 0, packing: 0, shipped: 0, completed: 0 }}
        onTabChange={handleTabChange}
      />
      <UnpaidOrders />
    </YStack>
  );
}
