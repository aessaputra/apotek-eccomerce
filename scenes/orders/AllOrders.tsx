import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from 'tamagui';
import { ShoppingBagIcon } from '@/components/icons';
import { useOrdersPaginated } from '@/hooks/useOrdersPaginated';
import { useAppSlice } from '@/slices';
import type { OrderListItem } from '@/services';
import { getThemeColor } from '@/utils/theme';
import { OrderStatusList } from './OrderStatusList';

const EMPTY_TITLE = 'Belum ada pesanan';
const EMPTY_DESCRIPTION = 'Pesanan yang kamu buat akan muncul di sini.';

export function AllOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders,
    error,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    refresh,
    refreshIfNeeded,
    loadMore,
  } = useOrdersPaginated(user?.id);

  const refreshTintColor = getThemeColor(theme, 'primary');

  useEffect(() => {
    if (user?.id) {
      void refreshIfNeeded();
    }
  }, [user?.id, refreshIfNeeded]);

  const handleOrderPress = useCallback(
    (order: OrderListItem) => {
      if (__DEV__) {
        console.log('[AllOrders] Navigating to order detail:', order.id);
      }
      router.push({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: order.id },
      });
    },
    [router],
  );

  const handleRetry = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleShopNow = useCallback(() => {
    router.push('/home');
  }, [router]);

  return (
    <OrderStatusList
      orders={orders}
      isLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isFetchingMore}
      hasMore={hasMore}
      error={error}
      EmptyIcon={ShoppingBagIcon}
      emptyTitle={EMPTY_TITLE}
      emptyDescription={EMPTY_DESCRIPTION}
      onRefresh={refresh}
      onRetry={handleRetry}
      onLoadMore={loadMore}
      onOrderPress={handleOrderPress}
      onEmptyCtaPress={handleShopNow}
      refreshTintColor={refreshTintColor}
    />
  );
}

export default AllOrders;
