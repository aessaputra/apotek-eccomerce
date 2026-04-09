import React, { useCallback, useEffect, useRef, useState } from 'react';
import { YStack } from 'tamagui';
import { useFocusEffect, useRouter } from 'expo-router';
import { OrderStatusTabs } from '@/components/elements/OrderStatusTabs';
import type { OrderTab } from '@/components/elements/OrderStatusTabs';
import { useAppSlice } from '@/slices';
import { getOrderTabCounts, type OrderTabCounts } from '@/services';

const EMPTY_COUNTS: OrderTabCounts = {
  unpaid: 0,
  packing: 0,
  shipped: 0,
  completed: 0,
};

export default function Orders() {
  const router = useRouter();
  const { user } = useAppSlice();
  const [counts, setCounts] = useState<OrderTabCounts>(EMPTY_COUNTS);
  const latestRequestIdRef = useRef(0);

  const loadCounts = useCallback(async () => {
    if (!user?.id) {
      latestRequestIdRef.current += 1;
      setCounts(EMPTY_COUNTS);
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const { data, error } = await getOrderTabCounts(user.id);

    if (latestRequestIdRef.current !== requestId) {
      return;
    }

    if (error) {
      if (__DEV__) {
        console.warn('[Orders] Failed to load order tab counts:', error.message);
      }
      return;
    }

    if (data) {
      setCounts(data);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  useFocusEffect(
    useCallback(() => {
      void loadCounts();
    }, [loadCounts]),
  );

  const handleTabChange = (tab: OrderTab) => {
    router.push(`/orders/${tab}`);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <OrderStatusTabs counts={counts} onTabChange={handleTabChange} />
    </YStack>
  );
}
