import React, { useCallback, useEffect } from 'react';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { TruckIcon } from '@/components/icons';
import { useOrdersByStatusPaginated } from '@/hooks/useOrdersByStatusPaginated';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';
import { type OrderListItem } from '@/services';
import { OrderStatusList } from './OrderStatusList';

const EMPTY_TITLE = 'Belum Ada Pesanan';
const EMPTY_DESCRIPTION =
  'Pesanan yang sedang dikirim atau menunggu konfirmasi penerimaan akan muncul di sini.';

export default function ShippedOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders: shippedOrders,
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
    customerOrderBucket: 'shipped',
    cacheKey: 'shipped',
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
        console.log('[ShippedOrders] Navigating to order detail:', order.id);
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
      orders={shippedOrders}
      isLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isFetchingMore}
      hasMore={hasMore}
      error={error}
      EmptyIcon={TruckIcon}
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
