import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Spinner, Text, YStack, Button, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { WalletIcon, AlertCircleIcon, ShoppingBagIcon } from '@/components/icons';
import { UnpaidOrderCard } from '@/components/elements/UnpaidOrderCard';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { useUnpaidOrdersPaginated } from '@/hooks/useUnpaidOrdersPaginated';
import { useAppSlice } from '@/slices';
import { classifyError, translateErrorMessage } from '@/utils/error';
import { getThemeColor } from '@/utils/theme';
import type { OrderListItem } from '@/services';
import { cancelUserOrder } from '@/services/checkout.service';

const EmptyState = React.memo(function EmptyState() {
  const router = useRouter();

  const handleShopNow = useCallback(() => {
    router.push('/home');
  }, [router]);

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <WalletIcon size={80} color="$colorSubtle" />
      <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
        Belum Ada Pesanan
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        Pesanan yang belum dibayar akan muncul di sini. Yuk, mulai belanja!
      </Text>
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
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" padding="$4">
      <AlertCircleIcon size={64} color="$danger" />
      <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
        Gagal Memuat Pesanan
      </Text>
      <Text fontSize="$3" color="$colorSubtle" textAlign="center">
        {message}
      </Text>
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
  onCancel: (order: OrderListItem) => void;
}

const OrderListItemComponent = React.memo(function OrderListItemComponent({
  order,
  onPress,
  onCancel,
}: OrderListItemComponentProps) {
  const handlePress = useCallback(() => {
    onPress(order);
  }, [order, onPress]);

  return (
    <YStack paddingHorizontal="$4" paddingVertical="$2">
      <UnpaidOrderCard order={order} onPress={handlePress} onCancel={onCancel} />
    </YStack>
  );
});

export function UnpaidOrders() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<OrderListItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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

  const handleOpenCancelDialog = useCallback((order: OrderListItem) => {
    setActionError(null);
    setSelectedOrderForCancel(order);
  }, []);

  const handleCancelOrder = useCallback(async () => {
    if (!selectedOrderForCancel?.id || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setActionError(null);
    const { data, error: cancelError } = await cancelUserOrder(selectedOrderForCancel.id);
    setIsCancelling(false);

    if (cancelError) {
      setActionError(cancelError.message);
      return;
    }

    if (!data?.cancelled || data.payment_status !== 'cancel') {
      setActionError('Pesanan belum bisa dibatalkan. Muat ulang daftar pesanan lalu coba lagi.');
      void refresh();
      return;
    }

    setSelectedOrderForCancel(null);
    void refresh();
  }, [isCancelling, refresh, selectedOrderForCancel?.id]);

  const renderItem = useCallback(
    ({ item }: { item: OrderListItem }) => (
      <OrderListItemComponent
        order={item}
        onPress={handleOrderPress}
        onCancel={handleOpenCancelDialog}
      />
    ),
    [handleOpenCancelDialog, handleOrderPress],
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
    return <ErrorState message={errorMessage} onRetry={handleRetry} />;
  }

  if (unpaidOrders.length === 0) {
    return <EmptyState />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {actionError ? (
        <YStack
          backgroundColor="$dangerSoft"
          margin="$4"
          marginBottom="$0"
          padding="$3"
          borderRadius="$3">
          <Text fontSize="$3" color="$danger">
            {actionError}
          </Text>
        </YStack>
      ) : null}
      <FlatList
        data={unpaidOrders}
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
            <YStack padding="$3" alignItems="center">
              <Spinner size="small" color="$primary" />
            </YStack>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      <AppAlertDialog
        open={selectedOrderForCancel !== null}
        onOpenChange={open => {
          if (!open && !isCancelling) {
            setSelectedOrderForCancel(null);
          }
        }}
        title="Batalkan Pesanan?"
        description="Pesanan akan dibatalkan dan transaksi pembayaran akan ditutup bila masih bisa dibatalkan oleh Midtrans."
        confirmLabel={isCancelling ? 'Membatalkan...' : 'Ya, Batalkan Pesanan'}
        cancelLabel="Kembali"
        confirmColor="$background"
        confirmTextColor="$danger"
        confirmBorderColor="$danger"
        cancelColor="$primary"
        cancelTextColor="$onPrimary"
        onConfirm={() => {
          void handleCancelOrder();
        }}
      />
    </YStack>
  );
}

export default UnpaidOrders;
