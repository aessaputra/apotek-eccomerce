import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, useTheme, Spinner, ScrollView } from 'tamagui';
import { CheckCircle, Package } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { getThemeColor } from '@/utils/theme';
import type { RouteParams } from '@/types/routes.types';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { getPaymentStatusLabel } from '@/services/order.service';

function formatOrderNumber(orderId: string): string {
  return `APT-${orderId.slice(0, 8).toUpperCase()}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function OrderSuccess() {
  const { orderId } = useLocalSearchParams<RouteParams<'orders/success'>>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const successColor = getThemeColor(theme, 'success');

  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const { order, isLoading, error } = useOrderDetail(resolvedOrderId);

  const handleGoHome = () => {
    router.navigate('/(tabs)/home');
  };

  const handleViewOrderDetail = () => {
    if (resolvedOrderId) {
      router.push({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: resolvedOrderId },
      });
    }
  };

  const handleViewOrders = () => {
    router.replace('/(tabs)/orders');
  };

  const totalItems = order?.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const orderNumber = order
    ? formatOrderNumber(order.id)
    : resolvedOrderId
      ? formatOrderNumber(resolvedOrderId)
      : '';

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingBottom={insets.bottom + 16}
      paddingTop={insets.top + 16}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack flex={1} alignItems="center" gap="$4" paddingVertical="$4">
          <YStack alignItems="center" gap="$4">
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="$successSoft"
              alignItems="center"
              justifyContent="center">
              <CheckCircle size={40} color={successColor} />
            </YStack>

            <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">
              Pembayaran Berhasil
            </Text>

            <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={300}>
              Terima kasih! Pesanan Anda telah diterima dan sedang diproses.
            </Text>
          </YStack>

          {isLoading ? (
            <YStack
              width="100%"
              maxWidth={400}
              backgroundColor="$surface"
              borderRadius="$4"
              padding="$4"
              alignItems="center"
              gap="$3">
              <Spinner size="large" color="$primary" />
              <Text fontSize="$3" color="$colorSubtle">
                Memuat detail pesanan...
              </Text>
            </YStack>
          ) : error ? (
            <YStack
              width="100%"
              maxWidth={400}
              backgroundColor="$surface"
              borderRadius="$4"
              padding="$4"
              alignItems="center"
              gap="$2">
              <Text fontSize="$3" color="$danger" textAlign="center">
                Gagal memuat detail pesanan
              </Text>
              <Text fontSize="$2" color="$colorMuted" textAlign="center">
                {error}
              </Text>
            </YStack>
          ) : order ? (
            <YStack
              width="100%"
              maxWidth={400}
              backgroundColor="$surface"
              borderRadius="$4"
              padding="$4"
              gap="$4"
              borderWidth={1}
              borderColor="$surfaceBorder">
              <YStack gap="$1">
                <Text fontSize="$2" color="$colorMuted">
                  Nomor Pesanan
                </Text>
                <Text fontSize="$5" fontWeight="700" color="$color">
                  {orderNumber}
                </Text>
              </YStack>

              <YStack gap="$1">
                <Text fontSize="$2" color="$colorMuted">
                  Waktu Pesanan
                </Text>
                <Text fontSize="$3" color="$color">
                  {formatDate(order.created_at)}
                </Text>
              </YStack>

              <YStack gap="$1">
                <Text fontSize="$2" color="$colorMuted">
                  Status Pembayaran
                </Text>
                <XStack
                  backgroundColor="$successSoft"
                  paddingHorizontal="$3"
                  paddingVertical="$1.5"
                  borderRadius="$2"
                  alignSelf="flex-start"
                  alignItems="center"
                  gap="$1.5">
                  <CheckCircle size={14} color={successColor} />
                  <Text fontSize="$3" fontWeight="600" color={successColor}>
                    {getPaymentStatusLabel(order.payment_status)}
                  </Text>
                </XStack>
              </YStack>

              <YStack gap="$2" borderTopWidth={1} borderColor="$surfaceBorder" paddingTop="$3">
                <XStack alignItems="center" gap="$2">
                  <Package size={16} color="$colorSubtle" />
                  <Text fontSize="$3" color="$colorSubtle">
                    Ringkasan Pesanan
                  </Text>
                </XStack>

                <Text fontSize="$3" color="$color">
                  {totalItems} item dalam pesanan
                </Text>

                {order.order_items?.slice(0, 3).map(item => (
                  <XStack key={item.id} justifyContent="space-between" alignItems="center">
                    <Text fontSize="$2" color="$colorSubtle" flex={1} numberOfLines={1}>
                      {item.quantity}x {item.products?.name ?? 'Produk'}
                    </Text>
                    <Text fontSize="$2" color="$colorSubtle">
                      {formatRupiah(item.price_at_purchase * item.quantity)}
                    </Text>
                  </XStack>
                ))}

                {order.order_items && order.order_items.length > 3 && (
                  <Text fontSize="$2" color="$colorMuted" textAlign="center">
                    +{order.order_items.length - 3} item lainnya
                  </Text>
                )}
              </YStack>

              <YStack gap="$1" borderTopWidth={1} borderColor="$surfaceBorder" paddingTop="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$3" color="$colorSubtle">
                    Total Pembayaran
                  </Text>
                  <Text fontSize="$6" fontWeight="700" color="$primary">
                    {formatRupiah(order.total_amount)}
                  </Text>
                </XStack>
              </YStack>
            </YStack>
          ) : null}

          <YStack gap="$3" width="100%" maxWidth={400}>
            {order && (
              <Button
                title="Lihat Detail Pesanan"
                backgroundColor="$primary"
                titleStyle={{ color: '$onPrimary', fontWeight: '600' }}
                onPress={handleViewOrderDetail}
              />
            )}

            <Button
              title="Lihat Semua Pesanan"
              backgroundColor="transparent"
              titleStyle={{ color: '$primary', fontWeight: '600' }}
              onPress={handleViewOrders}
            />

            <Button
              title="Kembali ke Beranda"
              backgroundColor="transparent"
              titleStyle={{ color: '$colorSubtle', fontWeight: '600' }}
              onPress={handleGoHome}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
