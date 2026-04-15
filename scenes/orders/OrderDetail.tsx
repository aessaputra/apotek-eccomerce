import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Spinner, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import { TruckIcon, PackageIcon, AlertCircleIcon } from '@/components/icons';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import { StatusBadge } from '@/components/elements/StatusBadge';
import {
  getOrderPrimaryStatusDisplay,
  getOrderSecondaryStatusDisplay,
  isBackendExpired,
  type OrderStatusVariant,
} from '@/services';
import { getThemeColor } from '@/utils/theme';
import { formatOrderDateTime } from '@/utils/orderDate';
import { formatOrderNumber } from '@/utils/orderNumber';
import { useOrderDetail } from '@/hooks';
import { PaymentCountdownTimer } from '@/components/elements/PaymentCountdownTimer';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import Image from '@/components/elements/Image';
import { formatCourierServiceName } from '@/constants/courier.constants';
import { formatRupiah } from '@/scenes/cart/cart.constants';

const SecondaryStatusText = styled(Text, {
  fontSize: '$2',
  color: '$colorMuted',
});

function getProductImageUrl(
  productImages?: { url: string; sort_order: number }[] | null,
): string | null {
  if (!productImages?.length) return null;
  const sorted = [...productImages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted[0]?.url ?? null;
}

function shouldShowTrackingSection(status: string): boolean {
  return status === 'shipped' || status === 'in_transit';
}

export default function OrderDetail() {
  const params = useLocalSearchParams<{
    orderId?: string | string[];
  }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const orderId =
    typeof orderIdParam === 'string' && orderIdParam.trim() ? orderIdParam : undefined;
  const theme = useTheme();
  const router = useRouter();
  const { order, status, isLoading, isRefreshing, error, refresh } = useOrderDetail(orderId);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
  const refreshTintColor = getThemeColor(theme, 'primary');
  const shouldShowTracking = shouldShowTrackingSection(order?.status ?? '');

  const handlePaymentExpired = useCallback(() => {
    setIsPaymentExpired(true);
  }, []);

  const handleTrackShipment = useCallback(() => {
    if (!order?.id) {
      return;
    }

    router.push({
      pathname: '/orders/track-shipment/[orderId]',
      params: { orderId: order.id },
    });
  }, [order?.id, router]);

  if (!orderId) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$4"
        padding="$4">
        <PackageIcon size={64} color="$colorSubtle" />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Pesanan Tidak Ditemukan
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center">
          ID pesanan tidak valid atau tidak tersedia.
        </Text>
      </YStack>
    );
  }

  if (isLoading) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$3">
        <Spinner size="large" color="$primary" />
        <Text color="$colorSubtle">Memuat detail pesanan...</Text>
      </YStack>
    );
  }

  if (status === 'error') {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$4"
        padding="$6">
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
            {error}
          </Text>
        </YStack>
        <Button
          size="$4"
          backgroundColor="$primary"
          color="$onPrimary"
          fontWeight="600"
          onPress={refresh}
          marginTop="$2">
          Coba Lagi
        </Button>
      </YStack>
    );
  }

  if (status === 'not-found') {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$4"
        padding="$6">
        <YStack
          width={100}
          height={100}
          borderRadius="$10"
          backgroundColor="$surfaceSubtle"
          alignItems="center"
          justifyContent="center">
          <PackageIcon size={40} color="$colorMuted" />
        </YStack>
        <YStack gap="$2" alignItems="center">
          <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
            Pesanan Tidak Ditemukan
          </Text>
          <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={280}>
            Pesanan yang Anda cari tidak tersedia atau telah dihapus.
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (!order) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$3">
        <Spinner size="large" color="$primary" />
        <Text color="$colorSubtle">Memuat detail pesanan...</Text>
      </YStack>
    );
  }

  const orderNumber = formatOrderNumber(order.id);
  const totalAmount = order.gross_amount ?? order.total_amount ?? 0;
  const shippingCost = order.shipping_cost ?? 0;
  const subtotal = totalAmount - shippingCost;
  const paymentUrl = order.snap_redirect_url?.trim() || '';
  const isBackendPaymentExpired = isBackendExpired(order.expired_at);
  const isOrderExpired = isBackendPaymentExpired || isPaymentExpired;
  const canResumePayment = !isOrderExpired && !!paymentUrl;
  const primaryStatusDisplay = getOrderPrimaryStatusDisplay(
    order.status,
    order.payment_status,
    order.expired_at,
  );
  const secondaryStatusDisplay = getOrderSecondaryStatusDisplay(order.status, order.payment_status);

  return (
    <YStack flex={1} backgroundColor="$background">
      {error && (
        <YStack backgroundColor="$dangerSoft" padding="$3" margin="$4" borderRadius="$3" gap="$2">
          <XStack alignItems="center" gap="$2">
            <AlertCircleIcon size={16} color="$danger" />
            <Text fontSize="$3" color="$danger" flex={1}>
              {error}
            </Text>
            <Button size="$2" backgroundColor="transparent" color="$danger" onPress={refresh}>
              Coba Lagi
            </Button>
          </XStack>
        </YStack>
      )}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={refreshTintColor}
          />
        }
        contentContainerStyle={{
          paddingBottom: order.payment_status === 'pending' || shouldShowTracking ? 100 : 24,
        }}>
        <YStack paddingVertical="$4" gap="$3">
          <OrderSectionCard>
            <YStack padding="$4" gap="$4">
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                      NOMOR PESANAN
                    </Text>
                    <Text fontSize="$6" fontWeight="700" color="$color">
                      {orderNumber}
                    </Text>
                  </YStack>
                  {order.payment_status === 'pending' && !isBackendPaymentExpired && (
                    <PaymentCountdownTimer
                      createdAt={order.created_at}
                      onExpired={handlePaymentExpired}
                      variant="compact"
                    />
                  )}
                </XStack>
                <Text fontSize="$3" color="$colorSubtle">
                  {formatOrderDateTime(order.created_at)}
                </Text>
              </YStack>

              <Separator />

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Status
                </Text>
                <StatusBadge variant={primaryStatusDisplay.variant as OrderStatusVariant}>
                  {primaryStatusDisplay.label}
                </StatusBadge>
              </XStack>

              {secondaryStatusDisplay && (
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$3" color="$colorSubtle">
                    Status Pembayaran
                  </Text>
                  <SecondaryStatusText>{secondaryStatusDisplay}</SecondaryStatusText>
                </XStack>
              )}
            </YStack>
          </OrderSectionCard>

          <OrderSectionCard>
            <YStack padding="$4" gap="$3">
              <XStack alignItems="center" gap="$2">
                <PackageIcon size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Produk
                </Text>
              </XStack>

              <Separator />

              <YStack gap="$4">
                {order.order_items?.map(item => {
                  const product = item.products;
                  const imageUrl = getProductImageUrl(product?.product_images);
                  const lineTotal = item.price_at_purchase * item.quantity;

                  return (
                    <XStack key={item.id} gap="$3" alignItems="flex-start">
                      {imageUrl ? (
                        <YStack
                          width={64}
                          height={64}
                          borderRadius="$3"
                          overflow="hidden"
                          backgroundColor="$surfaceSubtle">
                          <Image
                            source={{ uri: imageUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        </YStack>
                      ) : (
                        <YStack
                          width={64}
                          height={64}
                          borderRadius="$3"
                          backgroundColor="$surfaceSubtle"
                          alignItems="center"
                          justifyContent="center">
                          <PackageIcon size={24} color="$colorMuted" />
                        </YStack>
                      )}

                      <YStack flex={1} gap="$1">
                        <Text fontSize="$3" color="$color" fontWeight="500" numberOfLines={2}>
                          {product?.name ?? 'Produk'}
                        </Text>
                        <Text fontSize="$2" color="$colorSubtle">
                          {formatRupiah(item.price_at_purchase)} × {item.quantity}
                        </Text>
                        <Text fontSize="$4" color="$color" fontWeight="600">
                          {formatRupiah(lineTotal)}
                        </Text>
                      </YStack>
                    </XStack>
                  );
                })}
              </YStack>
            </YStack>
          </OrderSectionCard>

          {order.addresses && (
            <OrderSectionCard>
              <YStack padding="$4" gap="$3">
                <XStack alignItems="center" gap="$2">
                  <TruckIcon size={20} color="$primary" />
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Alamat Pengiriman
                  </Text>
                </XStack>

                <Separator />

                <YStack gap="$2">
                  <Text fontSize="$3" color="$color" fontWeight="600">
                    {order.addresses.receiver_name}
                  </Text>
                  <Text fontSize="$3" color="$color">
                    {order.addresses.phone_number}
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle">
                    {order.addresses.street_address}
                  </Text>
                  {order.addresses.address_note ? (
                    <Text fontSize="$3" color="$colorSubtle">
                      {order.addresses.address_note}
                    </Text>
                  ) : null}
                  <Text fontSize="$3" color="$colorSubtle">
                    {order.addresses.city}, {order.addresses.province} {order.addresses.postal_code}
                  </Text>
                </YStack>
              </YStack>
            </OrderSectionCard>
          )}

          {(order.courier_code || order.courier_service) && (
            <OrderSectionCard>
              <YStack padding="$4" gap="$3">
                <XStack alignItems="center" gap="$2">
                  <TruckIcon size={20} color="$primary" />
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Metode Pengiriman
                  </Text>
                </XStack>

                <Separator />

                <YStack gap="$2">
                  <Text fontSize="$3" color="$color" fontWeight="500">
                    {formatCourierServiceName(order.courier_code, order.courier_service)}
                  </Text>
                  {order.waybill_number && (
                    <Text fontSize="$3" color="$colorSubtle">
                      No. Resi: {order.waybill_number}
                    </Text>
                  )}
                  {order.shipping_etd && (
                    <Text fontSize="$3" color="$colorSubtle">
                      Estimasi: {order.shipping_etd}
                    </Text>
                  )}
                  {shippingCost > 0 && (
                    <Text fontSize="$4" color="$primary" fontWeight="600">
                      {formatRupiah(shippingCost)}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </OrderSectionCard>
          )}

          <OrderSectionCard>
            <YStack padding="$4" gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Subtotal Produk
                </Text>
                <Text fontSize="$3" color="$color">
                  {formatRupiah(subtotal)}
                </Text>
              </XStack>
              {shippingCost > 0 && (
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$3" color="$colorSubtle">
                    Ongkir
                  </Text>
                  <Text fontSize="$3" color="$color">
                    {formatRupiah(shippingCost)}
                  </Text>
                </XStack>
              )}
              <Separator />
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="700" color="$color">
                  Total
                </Text>
                <Text fontSize="$6" fontWeight="700" color="$primary">
                  {formatRupiah(totalAmount)}
                </Text>
              </XStack>
            </YStack>
          </OrderSectionCard>
        </YStack>
      </ScrollView>

      {order.payment_status === 'pending' && (
        <BottomActionBar
          buttonTitle={isOrderExpired ? 'Pembayaran Kadaluarsa' : 'Bayar Sekarang'}
          onPress={() => {
            if (canResumePayment) {
              router.push({
                pathname: '/cart/payment',
                params: { orderId: order.id, paymentUrl },
              });
            }
          }}
          isLoading={isLoading}
          disabled={!canResumePayment}
          aria-label="Bayar pesanan"
          aria-describedby="Tombol untuk melanjutkan pembayaran"
        />
      )}

      {order.payment_status !== 'pending' && shouldShowTracking && (
        <BottomActionBar
          buttonTitle="Lacak Pengiriman"
          onPress={handleTrackShipment}
          isLoading={isLoading}
          disabled={!order.waybill_number}
          aria-label="Lacak pengiriman pesanan"
          aria-describedby="Tombol untuk membuka layar tracking pengiriman"
        />
      )}
    </YStack>
  );
}
