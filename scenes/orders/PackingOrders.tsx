import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Spinner, Text, YStack, Button, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { PackageIcon, AlertCircleIcon, ShoppingBagIcon } from '@/components/icons';
import { OrderCard } from '@/components/elements/OrderCard';
import { useOrdersByStatusPaginated } from '@/hooks/useOrdersByStatusPaginated';
import { useAppSlice } from '@/slices';
import { classifyError, translateErrorMessage } from '@/utils/error';
import { getThemeColor } from '@/utils/theme';
import { PACKING_ORDER_STATUSES, type OrderListItem } from '@/services';

const EmptyState = React.memo(function EmptyState() {
  const router = useRouter();

  const handleShopNow = useCallback(() => {
    router.push('/(tabs)/home');
  }, [router]);

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$6">
      <YStack
        width={120}
        height={120}
        borderRadius="$10"
        backgroundColor="$surfaceSubtle"
        alignItems="center"
        justifyContent="center">
        <PackageIcon size={48} color="$colorMuted" />
      </YStack>
      <YStack gap="$2" alignItems="center">
        <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
          Belum Ada Pesanan
        </Text>
        <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={280}>
          Pesanan yang sedang dikemas akan muncul di sini.
        </Text>
      </YStack>
      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        marginTop="$2"
        icon={<ShoppingBagIcon size={20} color="$onPrimary" />}
        onPress={handleShopNow}
        aria-label="Mulai belanja">
        Belanja Sekarang
      </Button>
    </YStack>
  );
});

const ErrorState = React.memo(function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$6">
      <YStack
        width={100}
        height={100}
        borderRadius="$10"
        backgroundColor="$dangerSoft"
        alignItems="center"
        justifyContent="center">
        <AlertCircleIcon size={40} color="$danger" />
      </YStack>
      <YStack gap="$2" alignItems="center">
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Gagal Memuat Pesanan
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={280}>
          {message}
        </Text>
      </YStack>
      <Button
        size="$4"
        backgroundColor="$primary"
        color="$onPrimary"
        borderRadius="$4"
        marginTop="$2"
        onPress={onRetry}
        aria-label="Coba lagi">
        Coba Lagi
      </Button>
    </YStack>
  );
});

interface OrderListItemComponentProps {
  order: OrderListItem;
  onPress: (order: OrderListItem) => void;
}

const OrderListItemComponent = React.memo(function OrderListItemComponent({
  order,
  onPress,
}: OrderListItemComponentProps) {
  const handlePress = useCallback(() => {
    onPress(order);
  }, [order, onPress]);

  return (
    <YStack paddingHorizontal="$4" paddingVertical="$2">
      <OrderCard order={order} onPress={handlePress} elevated={false} />
    </YStack>
  );
});

export default function PackingOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const packingOrderStatuses = useMemo(() => [...PACKING_ORDER_STATUSES], []);
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
    orderStatuses: packingOrderStatuses,
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

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => (
      <OrderListItemComponent order={item} onPress={handleOrderPress} />
    ),
    [handleOrderPress],
  );

  const keyExtractor = useCallback((item: OrderListItem) => item.id, []);

  const onEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      loadMore();
    }
  }, [hasMore, isFetchingMore, loadMore]);

  if (isInitialLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$3"
        backgroundColor="$background">
        <Spinner size="large" color="$primary" />
        <Text color="$colorSubtle" fontSize="$3">
          Memuat pesanan...
        </Text>
      </YStack>
    );
  }

  if (error && packingOrders.length === 0) {
    const classifiedError = classifyError(new Error(error));
    const errorMessage = translateErrorMessage(classifiedError);
    return <ErrorState message={errorMessage} onRetry={handleRetry} />;
  }

  if (packingOrders.length === 0) {
    return <EmptyState />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={packingOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={refreshTintColor}
          />
        }
        ListFooterComponent={
          isFetchingMore ? (
            <YStack padding="$4" alignItems="center">
              <Spinner size="small" color="$primary" />
              <Text fontSize="$2" color="$colorSubtle" marginTop="$2">
                Memuat lebih banyak...
              </Text>
            </YStack>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </YStack>
  );
}
