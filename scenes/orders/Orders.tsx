import React, { useCallback, useMemo } from 'react';
import { FlatList, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Card, Separator, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { PackageIcon, CreditCardIcon, TruckIcon } from '@/components/icons';
import { useOrdersPaginated } from '@/hooks';
import { useAppSlice } from '@/slices';
import {
  getOrderStatusLabel,
  getPaymentStatusLabel,
  type OrderListItem,
  ORDERS_CACHE_TTL_MS,
} from '@/services';
import { getThemeColor } from '@/utils/theme';

const ORDER_CARD_HEIGHT = 148;
const ORDER_CARD_SPACING = 12;

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string): { bg: string; text: string } {
  const successStates = ['settlement', 'capture'];
  const pendingStates = ['pending', 'authorize'];
  const failedStates = ['deny', 'cancel', 'expire'];
  const refundStates = ['refund', 'partial_refund', 'chargeback', 'partial_chargeback'];

  if (successStates.includes(status)) {
    return { bg: '$successSoft', text: '$success' };
  }
  if (pendingStates.includes(status)) {
    return { bg: '$warningSoft', text: '$warning' };
  }
  if (failedStates.includes(status)) {
    return { bg: '$dangerSoft', text: '$danger' };
  }
  if (refundStates.includes(status)) {
    return { bg: '$surface', text: '$colorSubtle' };
  }
  return { bg: '$surface', text: '$colorSubtle' };
}

interface OrderCardProps {
  order: OrderListItem;
}

function OrderCardBase({ order }: OrderCardProps) {
  const statusColors = getStatusColor(order.payment_status);
  const firstItem = order.order_items[0];
  const itemCount = order.order_items.length;
  const itemNames =
    itemCount === 1
      ? (firstItem?.products?.name ?? 'Produk')
      : `${firstItem?.products?.name ?? 'Produk'} +${itemCount - 1} lainnya`;

  return (
    <Card
      bordered
      elevate
      size="$4"
      backgroundColor="$surface"
      borderColor="$surfaceBorder"
      minHeight={ORDER_CARD_HEIGHT}>
      <YStack gap="$2" padding="$3">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1} flex={1}>
            {formatDate(order.created_at)}
          </Text>
          <XStack
            backgroundColor={statusColors.bg}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2">
            <Text fontSize="$2" fontWeight="600" color={statusColors.text}>
              {getPaymentStatusLabel(order.payment_status)}
            </Text>
          </XStack>
        </XStack>

        <Separator marginVertical="$1" />

        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <YStack flex={1} gap="$1" minWidth={0}>
            <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
              {order.midtrans_order_id ?? order.id.slice(0, 8)}
            </Text>
            <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
              {itemNames}
            </Text>
          </YStack>
          <YStack alignItems="flex-end" gap="$1">
            <Text fontSize="$5" fontWeight="700" color="$primary">
              {formatRupiah(order.gross_amount ?? order.total_amount)}
            </Text>
            {order.courier_service ? (
              <XStack alignItems="center" gap="$1">
                <TruckIcon size={14} color="$colorSubtle" />
                <Text fontSize="$2" color="$colorSubtle">
                  {order.courier_service}
                </Text>
              </XStack>
            ) : null}
          </YStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
          <XStack alignItems="center" gap="$1">
            <CreditCardIcon size={14} color="$colorSubtle" />
            <Text fontSize="$2" color="$colorSubtle">
              {getOrderStatusLabel(order.status)}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}

const OrderCard = React.memo(OrderCardBase, (previousProps, nextProps) => {
  const previousFirstItem = previousProps.order.order_items[0];
  const nextFirstItem = nextProps.order.order_items[0];

  return (
    previousProps.order.id === nextProps.order.id &&
    previousProps.order.midtrans_order_id === nextProps.order.midtrans_order_id &&
    previousProps.order.status === nextProps.order.status &&
    previousProps.order.payment_status === nextProps.order.payment_status &&
    previousProps.order.gross_amount === nextProps.order.gross_amount &&
    previousProps.order.total_amount === nextProps.order.total_amount &&
    previousProps.order.courier_service === nextProps.order.courier_service &&
    previousProps.order.created_at === nextProps.order.created_at &&
    previousProps.order.order_items.length === nextProps.order.order_items.length &&
    previousFirstItem?.products?.id === nextFirstItem?.products?.id &&
    previousFirstItem?.products?.name === nextFirstItem?.products?.name
  );
});

function LoadingSkeleton() {
  return (
    <YStack gap="$3" padding="$4">
      {[1, 2, 3].map(key => (
        <Card
          key={key}
          bordered
          size="$4"
          minHeight={ORDER_CARD_HEIGHT}
          backgroundColor="$surface"
          borderColor="$surfaceBorder"
          opacity={0.6}>
          <YStack gap="$2" padding="$3">
            <XStack justifyContent="space-between">
              <YStack flex={1} height={12} backgroundColor="$surfaceBorder" borderRadius="$1" />
              <YStack width={80} height={12} backgroundColor="$surfaceBorder" borderRadius="$1" />
            </XStack>
            <YStack height={16} backgroundColor="$surfaceBorder" borderRadius="$1" />
            <XStack justifyContent="flex-end">
              <YStack width={100} height={20} backgroundColor="$surfaceBorder" borderRadius="$1" />
            </XStack>
          </YStack>
        </Card>
      ))}
    </YStack>
  );
}

function EmptyState() {
  const theme = useTheme();
  const subtleColor = getThemeColor(theme, 'colorPress');

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      padding="$5"
      gap="$4">
      <PackageIcon size={64} color={subtleColor} />
      <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
        Belum Ada Pesanan
      </Text>
      <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
        Pesanan Anda akan muncul di sini setelah melakukan pembelian.
      </Text>
    </YStack>
  );
}

function ErrorState({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background"
      padding="$5"
      gap="$4">
      <PackageIcon size={64} color={getThemeColor(theme, 'danger')} />
      <Text fontSize="$5" fontWeight="700" color="$color" textAlign="center">
        Gagal Memuat Pesanan
      </Text>
      <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={300}>
        {message}
      </Text>
    </YStack>
  );
}

function ListErrorBanner({ message }: { message: string }) {
  return (
    <Card
      bordered
      size="$3"
      backgroundColor="$dangerSoft"
      borderColor="$danger"
      marginHorizontal="$4"
      marginBottom="$3">
      <YStack padding="$3" gap="$1">
        <Text fontSize="$3" fontWeight="700" color="$danger">
          Cache ditampilkan, pembaruan terakhir gagal
        </Text>
        <Text fontSize="$2" color="$danger">
          {message}
        </Text>
      </YStack>
    </Card>
  );
}

function ListFooter({
  isFetchingMore,
  isRevalidating,
}: {
  isFetchingMore: boolean;
  isRevalidating: boolean;
}) {
  if (!isFetchingMore && !isRevalidating) {
    return <YStack height={ORDER_CARD_SPACING} />;
  }

  return (
    <YStack alignItems="center" justifyContent="center" py="$3" gap="$2">
      <Spinner color="$primary" size="small" />
      <Text fontSize="$2" color="$colorSubtle">
        {isFetchingMore ? 'Memuat pesanan berikutnya...' : 'Memperbarui cache pesanan...'}
      </Text>
    </YStack>
  );
}

export default function Orders() {
  const theme = useTheme();
  const { user } = useAppSlice();
  const {
    orders,
    error,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    isRevalidating,
    hasMore,
    refresh,
    refreshIfNeeded,
    loadMore,
    metrics,
  } = useOrdersPaginated(user?.id);

  useFocusEffect(
    useCallback(() => {
      void refreshIfNeeded();
    }, [refreshIfNeeded]),
  );

  const keyExtractor = useCallback((item: OrderListItem) => item.id, []);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore) {
      return;
    }

    void loadMore();
  }, [hasMore, loadMore]);

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => (
      <YStack px="$4" pb="$3">
        <OrderCard order={item} />
      </YStack>
    ),
    [],
  );

  const refreshTintColor = getThemeColor(theme, 'primary');

  const cacheSummary = useMemo(() => {
    if (metrics.cacheAgeMs === null) {
      return null;
    }

    const cacheAgeSeconds = Math.round(metrics.cacheAgeMs / 1000);
    const ttlSeconds = Math.round(ORDERS_CACHE_TTL_MS / 1000);

    return `Cache ${cacheAgeSeconds}s • TTL ${ttlSeconds}s • ${metrics.lastPayloadBytes} bytes • ${metrics.lastFetchDurationMs} ms`;
  }, [metrics.cacheAgeMs, metrics.lastFetchDurationMs, metrics.lastPayloadBytes]);

  if (!user) {
    return <EmptyState />;
  }

  if (isInitialLoading && orders.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <LoadingSkeleton />
      </YStack>
    );
  }

  if (error && orders.length === 0) {
    return <ErrorState message={error} />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <FlatList
        data={orders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={15}
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }
        ListHeaderComponent={
          <YStack pt="$4">
            {error && orders.length > 0 ? <ListErrorBanner message={error} /> : null}
            {cacheSummary ? (
              <Text fontSize="$2" color="$colorMuted" px="$4" pb="$2">
                {cacheSummary}
              </Text>
            ) : null}
          </YStack>
        }
        ListFooterComponent={
          <ListFooter isFetchingMore={isFetchingMore} isRevalidating={isRevalidating} />
        }
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={{ flexGrow: orders.length === 0 ? 1 : 0, paddingBottom: 4 }}
      />
    </YStack>
  );
}
