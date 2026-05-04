import React, { useCallback, useEffect } from 'react';
import { useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { PackageIcon } from '@/components/icons';
import { useOrdersByStatusPaginated } from '@/hooks/useOrdersByStatusPaginated';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';
import { type OrderListItem } from '@/services';
import { OrderStatusList } from './OrderStatusList';

const EMPTY_TITLE = 'Belum Ada Pesanan';
const EMPTY_DESCRIPTION = 'Pesanan yang sedang diproses atau siap dikirim akan muncul di sini.';
const PACKING_LOADING_STATE = { withBackground: true, textSize: '$3' } as const;

export default function PackingOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders: packingOrders,
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
    customerOrderBucket: 'packing',
    cacheKey: 'packing',
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
        console.log('[PackingOrders] Navigating to order detail:', order.id);
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
      orders={packingOrders}
      isLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isFetchingMore}
      hasMore={hasMore}
      error={error}
      EmptyIcon={PackageIcon}
      emptyTitle={EMPTY_TITLE}
      emptyDescription={EMPTY_DESCRIPTION}
      onRefresh={refresh}
      onRetry={handleRetry}
      onLoadMore={loadMore}
      onOrderPress={handleOrderPress}
      onEmptyCtaPress={handleShopNow}
      refreshTintColor={refreshTintColor}
      emptyVariant="framed"
      errorVariant="framed"
      loadingState={PACKING_LOADING_STATE}
      loadingMoreLabel="Memuat lebih banyak..."
    />
  );
}
