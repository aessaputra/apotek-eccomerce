import React, { useCallback, useEffect, useMemo } from 'react';
import { Text, YStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { WalletIcon } from '@/components/icons';
import { useUnpaidOrdersPaginated } from '@/hooks/useUnpaidOrdersPaginated';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';
import type { OrderListItem } from '@/services';
import { OrderStatusList } from './OrderStatusList';

const EMPTY_TITLE = 'Belum Ada Pesanan';
const EMPTY_DESCRIPTION =
  'Pesanan yang masih bisa dibayar akan muncul di sini. Yuk, mulai belanja!';

export function UnpaidOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders: unpaidOrders,
    error,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    refresh,
    refreshIfNeeded,
    loadMore,
  } = useUnpaidOrdersPaginated(user?.id);

  const refreshTintColor = getThemeColor(theme, 'primary');

  useEffect(() => {
    if (user?.id) {
      void refreshIfNeeded();
    }
  }, [user?.id, refreshIfNeeded]);

  const handleOrderPress = useCallback(
    (order: OrderListItem) => {
      if (__DEV__) {
        console.log('[UnpaidOrders] Navigating to order detail:', order.id);
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

  const handleOrderExpired = useCallback(() => {
    void refresh();
  }, [refresh]);

  const unpaidHeader = useMemo(
    () => (
      <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$2">
        <YStack
          backgroundColor="$warningSoft"
          borderRadius="$4"
          padding="$3"
          gap="$1.5"
          borderWidth={1}
          borderColor="$warning">
          <Text fontSize="$4" fontWeight="700" color="$warning">
            Masih Bisa Dibayar
          </Text>
          <Text fontSize="$3" color="$colorSubtle">
            Hanya pesanan yang masih bisa dibayar ditampilkan di sini.
          </Text>
        </YStack>
      </YStack>
    ),
    [],
  );

  return (
    <OrderStatusList
      orders={unpaidOrders}
      isLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isFetchingMore}
      hasMore={hasMore}
      error={error}
      EmptyIcon={WalletIcon}
      emptyTitle={EMPTY_TITLE}
      emptyDescription={EMPTY_DESCRIPTION}
      onRefresh={refresh}
      onRetry={handleRetry}
      onLoadMore={loadMore}
      onOrderPress={handleOrderPress}
      onEmptyCtaPress={handleShopNow}
      refreshTintColor={refreshTintColor}
      cardType="unpaid"
      onOrderExpired={handleOrderExpired}
      headerComponent={unpaidHeader}
    />
  );
}

export default UnpaidOrders;
