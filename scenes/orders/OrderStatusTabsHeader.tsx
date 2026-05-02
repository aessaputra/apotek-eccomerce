import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { OrderStatusTabs, type OrderTab } from '@/components/elements/OrderStatusTabs';
import { useOrderTabCounts } from '@/hooks/useOrderTabCounts';
import { useAppSlice } from '@/slices';
import type { TypedHref } from '@/types/routes.types';

interface OrderStatusTabsHeaderProps {
  activeTab: OrderTab;
}

const ORDER_TAB_ROUTES: Record<OrderTab, TypedHref> = {
  all: '/orders/all',
  unpaid: '/orders/unpaid',
  packing: '/orders/packing',
  shipped: '/orders/shipped',
  completed: '/orders/completed',
  cancelled: '/orders/cancelled',
};

export function OrderStatusTabsHeader({ activeTab }: OrderStatusTabsHeaderProps) {
  const router = useRouter();
  const { user } = useAppSlice();
  const { counts } = useOrderTabCounts(user?.id);

  const handleTabChange = useCallback(
    (tab: OrderTab) => {
      router.push(ORDER_TAB_ROUTES[tab]);
    },
    [router],
  );

  return <OrderStatusTabs activeTab={activeTab} counts={counts} onTabChange={handleTabChange} />;
}

export default OrderStatusTabsHeader;
