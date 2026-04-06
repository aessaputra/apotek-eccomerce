import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Spinner, Text, YStack, XStack, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { WalletIcon, AlertCircleIcon, CloseIcon } from '@/components/icons';
import { OrderCard } from '@/components/elements/OrderCard';
import { PayNowButton } from '@/components/elements/PayNowButton';
import { useUnpaidOrdersPaginated } from '@/hooks/useUnpaidOrdersPaginated';
import { useAppSlice } from '@/slices';
import { classifyError, translateErrorMessage } from '@/utils/error';
import type { OrderListItem } from '@/services';
import type { AppError } from '@/utils/error';

const EmptyState = React.memo(function EmptyState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <WalletIcon size={64} color="$colorSubtle" />
      <Text fontSize="$6" fontWeight="700" color="$color">
        Belum Ada Pesanan
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Pesanan yang belum dibayar akan muncul di sini
      </Text>
    </YStack>
  );
});

const ErrorState = React.memo(function ErrorState({ message }: { message: string }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <AlertCircleIcon size={48} color="$danger" />
      <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
        Gagal Memuat Pesanan
      </Text>
      <Text fontSize="$3" color="$colorSubtle" textAlign="center">
        {message}
      </Text>
    </YStack>
  );
});

interface OrderListItemComponentProps {
  order: OrderListItem;
  onPress: (order: OrderListItem) => void;
  onPaymentError: (error: AppError) => void;
}

const OrderListItemComponent = React.memo(function OrderListItemComponent({
  order,
  onPress,
  onPaymentError,
}: OrderListItemComponentProps) {
  const handlePress = useCallback(() => {
    onPress(order);
  }, [order, onPress]);

  return (
    <YStack paddingHorizontal="$3" paddingVertical="$2">
      <OrderCard order={order} onPress={handlePress} />
      <XStack justifyContent="flex-end" marginTop="$2">
        <PayNowButton
          orderId={order.id}
          orderNumber={order.midtrans_order_id ?? order.id.slice(0, 8)}
          onError={onPaymentError}
        />
      </XStack>
    </YStack>
  );
});

export default function UnpaidOrders() {
  const router = useRouter();
  const { user } = useAppSlice();
  const {
    orders: unpaidOrders,
    error,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingMore,
    refresh,
    loadMore,
  } = useUnpaidOrdersPaginated(user?.id);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      refresh();
    }
  }, [user?.id, refresh]);

  const handleOrderPress = useCallback(
    (order: OrderListItem) => {
      router.push({
        pathname: '/orders/[orderId]',
        params: { orderId: order.id },
      });
    },
    [router],
  );

  const handlePaymentError = useCallback((err: AppError) => {
    const message = err.message || 'Gagal memulai pembayaran. Silakan coba lagi.';
    setPaymentError(message);
    if (__DEV__) {
      console.warn('[UnpaidOrders] Payment error:', err);
    }
  }, []);

  const clearPaymentError = useCallback(() => {
    setPaymentError(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => (
      <OrderListItemComponent
        order={item}
        onPress={handleOrderPress}
        onPaymentError={handlePaymentError}
      />
    ),
    [handleOrderPress, handlePaymentError],
  );

  const keyExtractor = useCallback((item: OrderListItem) => item.id, []);

  const onEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      loadMore();
    }
  }, [hasMore, isFetchingMore, loadMore]);

  if (isInitialLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <Spinner size="large" color="$primary" />
        <Text color="$colorSubtle">Memuat pesanan...</Text>
      </YStack>
    );
  }

  if (error && unpaidOrders.length === 0) {
    const classifiedError = classifyError(new Error(error));
    const errorMessage = translateErrorMessage(classifiedError);
    return <ErrorState message={errorMessage} />;
  }

  if (unpaidOrders.length === 0) {
    return <EmptyState />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {paymentError && (
        <XStack
          backgroundColor="$dangerSoft"
          padding="$3"
          alignItems="center"
          justifyContent="space-between"
          gap="$2">
          <XStack flex={1} alignItems="center" gap="$2">
            <AlertCircleIcon size={16} color="$danger" />
            <Text fontSize="$3" color="$danger" flex={1} numberOfLines={2}>
              {paymentError}
            </Text>
          </XStack>
          <Button
            size="$2"
            backgroundColor="transparent"
            color="$danger"
            onPress={clearPaymentError}
            aria-label="Tutup error">
            <CloseIcon size={16} color="$danger" />
          </Button>
        </XStack>
      )}
      <FlatList
        data={unpaidOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#06B6D4" />
        }
        ListFooterComponent={
          isFetchingMore ? (
            <YStack padding="$3" alignItems="center">
              <Spinner size="small" color="$primary" />
            </YStack>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </YStack>
  );
}
