import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { YStack, XStack, Text, useTheme, Card, Separator } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { useAppSlice } from '@/slices';
import { getUserOrders, getPaymentStatusLabel, getOrderStatusLabel } from '@/services';
import type { OrderWithItems } from '@/services';
import { PackageIcon, CreditCardIcon, TruckIcon } from '@/components/icons';

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
    return { bg: '$successBackground', text: '$success' };
  }
  if (pendingStates.includes(status)) {
    return { bg: '$warningBackground', text: '$warning' };
  }
  if (failedStates.includes(status)) {
    return { bg: '$dangerBackground', text: '$danger' };
  }
  if (refundStates.includes(status)) {
    return { bg: '$surface', text: '$colorSubtle' };
  }
  return { bg: '$surface', text: '$colorSubtle' };
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const statusColors = getStatusColor(order.payment_status);
  const item = order.order_items?.[0];
  const itemCount = order.order_items?.length ?? 0;
  const itemNames =
    itemCount === 1
      ? (item?.products?.name ?? 'Produk')
      : `${item?.products?.name ?? 'Produk'} +${itemCount - 1} lainnya`;

  return (
    <Card
      bordered
      elevate
      size="$4"
      animation="quick"
      backgroundColor="$surface"
      borderColor="$surfaceBorder">
      <YStack gap="$2" padding="$3">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
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
          <YStack flex={1} gap="$1">
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
            {order.courier_service && (
              <XStack alignItems="center" gap="$1">
                <TruckIcon size={14} color="$colorSubtle" />
                <Text fontSize="$2" color="$colorSubtle">
                  {order.courier_service}
                </Text>
              </XStack>
            )}
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

function LoadingSkeleton() {
  return (
    <YStack gap="$3" padding="$4">
      {[1, 2, 3].map(key => (
        <Card
          key={key}
          bordered
          size="$4"
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

export default function Orders() {
  const theme = useTheme();
  const { user } = useAppSlice();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getUserOrders(user.id);

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setOrders(data ?? []);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  if (!user) {
    return <EmptyState />;
  }

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <LoadingSkeleton />
      </YStack>
    );
  }

  if (error) {
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
          {error}
        </Text>
      </YStack>
    );
  }

  if (orders.length === 0) {
    return <EmptyState />;
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack gap="$3" padding="$4">
        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </YStack>
    </YStack>
  );
}
