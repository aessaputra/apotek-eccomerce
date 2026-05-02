import React, { useCallback, useEffect } from 'react';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { CheckCircleIcon } from '@/components/icons';
import { useOrdersByStatusPaginated } from '@/hooks/useOrdersByStatusPaginated';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';
import { type OrderListItem } from '@/services';
import { OrderStatusList } from './OrderStatusList';

const EMPTY_TITLE = 'Belum Ada Pesanan';
const EMPTY_DESCRIPTION = 'Pesanan yang sudah dikonfirmasi selesai akan muncul di sini.';

export default function CompletedOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders: completedOrders,
    error,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    refresh,
    refreshIfNeeded,
    loadMore,
  } = useOrdersByStatusPaginated({
    userId: user?.id,
    customerOrderBucket: 'completed',
    cacheKey: 'completed',
  });

  const refreshTintColor = getThemeColor(theme, 'primary');

  useEffect(() => {
    if (user?.id) {
      void refreshIfNeeded();
    }
  }, [user?.id, refreshIfNeeded]);

  const handleOrderPress = useCallback(
    (order: OrderListItem) => {
      if (__DEV__) {
        console.log('[CompletedOrders] Navigating to order detail:', order.id);
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
      orders={completedOrders}
      isLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isFetchingMore}
      hasMore={hasMore}
      error={error}
      EmptyIcon={CheckCircleIcon}
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
