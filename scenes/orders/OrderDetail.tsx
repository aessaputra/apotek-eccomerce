import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Separator, Spinner, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import { TruckIcon, CreditCardIcon, PackageIcon, AlertCircleIcon } from '@/components/icons';
import { getOrderStatusLabel, getPaymentStatusLabel } from '@/services';
import { getThemeColor } from '@/utils/theme';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { PaymentCountdownTimer } from '@/components/elements/PaymentCountdownTimer';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import Image from '@/components/elements/Image';
import { formatCourierServiceName } from '@/constants/courier.constants';

const SectionCard = styled(Card, {
  bordered: true,
  size: '$4',
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  marginHorizontal: '$4',
  marginBottom: '$3',
});

/**
 * Status badge styled component for order/payment status display.
 * Uses semantic color variants matching OrderCard.tsx pattern.
 */
const StatusBadge = styled(XStack, {
  paddingHorizontal: '$3',
  paddingVertical: '$1.5',
  borderRadius: '$3',
  alignItems: 'center',
  gap: '$2',

  variants: {
    variant: {
      success: {
        backgroundColor: '$successSoft',
      },
      warning: {
        backgroundColor: '$warningSoft',
      },
      danger: {
        backgroundColor: '$dangerSoft',
      },
      primary: {
        backgroundColor: '$brandPrimarySoft',
      },
      neutral: {
        backgroundColor: '$surfaceSubtle',
      },
    },
  } as const,
});

const StatusBadgeText = styled(Text, {
  fontSize: '$3',
  fontWeight: '600',

  variants: {
    variant: {
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      danger: {
        color: '$danger',
      },
      primary: {
        color: '$primary',
      },
      neutral: {
        color: '$colorSubtle',
      },
    },
  } as const,
});

const SecondaryStatusText = styled(Text, {
  fontSize: '$2',
  color: '$colorMuted',
});

type StatusVariant = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  processing: { label: 'Diproses', variant: 'primary' },
  awaiting_shipment: { label: 'Menunggu Pengiriman', variant: 'primary' },
  shipped: { label: 'Dikirim', variant: 'primary' },
  delivered: { label: 'Terkirim', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'danger' },
  draft: { label: 'Draft', variant: 'neutral' },
};

const FAILED_PAYMENT_STATES = ['deny', 'expire', 'cancel'];
const SUCCESS_PAYMENT_STATES = ['settlement', 'capture'];
const REFUND_STATES = ['refund', 'partial_refund', 'chargeback', 'partial_chargeback'];

function getPrimaryStatusDisplay(
  orderStatus: string,
  paymentStatus: string,
  expiredAt?: string | null,
): { label: string; variant: StatusVariant } {
  if (paymentStatus === 'pending') {
    const isExpired = expiredAt && new Date(expiredAt) < new Date();
    if (isExpired) {
      return { label: 'Pembayaran Kadaluarsa', variant: 'danger' };
    }
    return { label: 'Menunggu Pembayaran', variant: 'warning' };
  }

  if (FAILED_PAYMENT_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'danger' };
  }

  if (SUCCESS_PAYMENT_STATES.includes(paymentStatus)) {
    return (
      ORDER_STATUS_CONFIG[orderStatus] || {
        label: getOrderStatusLabel(orderStatus),
        variant: 'neutral',
      }
    );
  }

  if (REFUND_STATES.includes(paymentStatus)) {
    return { label: getPaymentStatusLabel(paymentStatus), variant: 'warning' };
  }

  return { label: getOrderStatusLabel(orderStatus), variant: 'neutral' };
}

function getSecondaryStatusDisplay(orderStatus: string, paymentStatus: string): string | null {
  if (paymentStatus === 'pending' && orderStatus === 'pending') {
    return null;
  }

  if (FAILED_PAYMENT_STATES.includes(paymentStatus)) {
    return null;
  }

  if (SUCCESS_PAYMENT_STATES.includes(paymentStatus)) {
    return `Pembayaran: ${getPaymentStatusLabel(paymentStatus)}`;
  }

  return null;
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
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

function getProductImageUrl(
  productImages?: { url: string; sort_order: number }[] | null,
): string | null {
  if (!productImages?.length) return null;
  const sorted = [...productImages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return sorted[0]?.url ?? null;
}

export default function OrderDetail() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const orderId =
    typeof orderIdParam === 'string' && orderIdParam.trim() ? orderIdParam : undefined;

  const theme = useTheme();
  const router = useRouter();
  const { order, status, isLoading, isRefreshing, error, refresh } = useOrderDetail(orderId);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
  const refreshTintColor = getThemeColor(theme, 'primary');

  const handlePaymentExpired = useCallback(() => {
    setIsPaymentExpired(true);
    if (__DEV__) {
      console.log('[OrderDetail] Payment expired for order:', orderId);
    }
  }, [orderId]);

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
        padding="$4">
        <AlertCircleIcon size={64} color="$danger" />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Gagal Memuat Pesanan
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center">
          {error}
        </Text>
        <Button
          size="$4"
          backgroundColor="$primary"
          color="white"
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
        padding="$4">
        <PackageIcon size={64} color="$colorSubtle" />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Pesanan Tidak Ditemukan
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center">
          Pesanan yang Anda cari tidak tersedia atau telah dihapus.
        </Text>
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

  const orderNumber = `APT-${order.id.slice(0, 8).toUpperCase()}`;
  const totalAmount = order.gross_amount ?? order.total_amount ?? 0;
  const shippingCost = order.shipping_cost ?? 0;
  const subtotal = totalAmount - shippingCost;

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
          paddingBottom: order.payment_status === 'pending' ? 80 : 20,
        }}>
        <YStack paddingVertical="$4" gap="$3">
          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
                <YStack gap="$1" flex={1}>
                  <Text fontSize="$2" color="$colorMuted">
                    Nomor Pesanan
                  </Text>
                  <Text fontSize="$5" fontWeight="700" color="$color">
                    {orderNumber}
                  </Text>
                </YStack>
                {order.payment_status === 'pending' && (
                  <PaymentCountdownTimer
                    createdAt={order.created_at}
                    onExpired={handlePaymentExpired}
                    variant="compact"
                  />
                )}
              </XStack>

              <YStack gap="$1">
                <Text fontSize="$2" color="$colorMuted">
                  Waktu Pesanan
                </Text>
                <Text fontSize="$2" color="$colorSubtle">
                  {formatDate(order.created_at)}
                </Text>
              </YStack>

              <Separator />

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Status
                </Text>
                <StatusBadge
                  variant={
                    getPrimaryStatusDisplay(order.status, order.payment_status, order.expired_at)
                      .variant
                  }>
                  <StatusBadgeText
                    variant={
                      getPrimaryStatusDisplay(order.status, order.payment_status, order.expired_at)
                        .variant
                    }>
                    {
                      getPrimaryStatusDisplay(order.status, order.payment_status, order.expired_at)
                        .label
                    }
                  </StatusBadgeText>
                </StatusBadge>
              </XStack>

              {getSecondaryStatusDisplay(order.status, order.payment_status) && (
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$3" color="$colorSubtle">
                    Detail
                  </Text>
                  <SecondaryStatusText>
                    {getSecondaryStatusDisplay(order.status, order.payment_status)}
                  </SecondaryStatusText>
                </XStack>
              )}
            </YStack>
          </SectionCard>

          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack alignItems="center" gap="$2">
                <CreditCardIcon size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Produk
                </Text>
              </XStack>

              <Separator />

              <YStack gap="$3">
                {order.order_items?.map(item => {
                  const product = item.products;
                  const imageUrl = getProductImageUrl(product?.product_images);
                  const lineTotal = item.price_at_purchase * item.quantity;

                  return (
                    <XStack key={item.id} gap="$3" alignItems="flex-start">
                      {imageUrl ? (
                        <YStack
                          width={60}
                          height={60}
                          borderRadius="$2"
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
                          width={60}
                          height={60}
                          borderRadius="$2"
                          backgroundColor="$surfaceSubtle"
                          alignItems="center"
                          justifyContent="center">
                          <PackageIcon size={24} color="$colorSubtle" />
                        </YStack>
                      )}

                      <YStack flex={1} gap="$1">
                        <Text fontSize="$3" color="$color" fontWeight="500">
                          {product?.name ?? 'Produk'}
                        </Text>
                        <Text fontSize="$2" color="$colorSubtle">
                          {formatRupiah(item.price_at_purchase)} × {item.quantity}
                        </Text>
                        <Text fontSize="$3" color="$color" fontWeight="600">
                          {formatRupiah(lineTotal)}
                        </Text>
                      </YStack>
                    </XStack>
                  );
                })}
              </YStack>
            </YStack>
          </SectionCard>

          {order.addresses && (
            <SectionCard>
              <YStack padding="$4" gap="$3">
                <XStack alignItems="center" gap="$2">
                  <TruckIcon size={20} color="$primary" />
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Alamat Pengiriman
                  </Text>
                </XStack>

                <Separator />

                <YStack gap="$1">
                  <Text fontSize="$3" color="$color" fontWeight="600">
                    {order.addresses.receiver_name}
                  </Text>
                  <Text fontSize="$3" color="$color">
                    {order.addresses.phone_number}
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle">
                    {order.addresses.street_address}
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle">
                    {order.addresses.city}, {order.addresses.province} {order.addresses.postal_code}
                  </Text>
                </YStack>
              </YStack>
            </SectionCard>
          )}

          {(order.courier_code || order.courier_service) && (
            <SectionCard>
              <YStack padding="$4" gap="$3">
                <XStack alignItems="center" gap="$2">
                  <TruckIcon size={20} color="$primary" />
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Metode Pengiriman
                  </Text>
                </XStack>

                <Separator />

                <YStack gap="$2">
                  <Text fontSize="$3" color="$color">
                    {formatCourierServiceName(order.courier_code, order.courier_service)}
                  </Text>
                  {order.shipping_etd && (
                    <Text fontSize="$3" color="$colorSubtle">
                      Estimasi: {order.shipping_etd}
                    </Text>
                  )}
                  {shippingCost > 0 && (
                    <Text fontSize="$3" color="$primary" fontWeight="600">
                      {formatRupiah(shippingCost)}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </SectionCard>
          )}

          <SectionCard>
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
                <Text fontSize="$5" fontWeight="700" color="$primary">
                  {formatRupiah(totalAmount)}
                </Text>
              </XStack>
            </YStack>
          </SectionCard>
        </YStack>
      </ScrollView>

      {order.payment_status === 'pending' && (
        <BottomActionBar
          buttonTitle={isPaymentExpired ? 'Pembayaran Kadaluarsa' : 'Bayar Sekarang'}
          onPress={() => {
            if (!isPaymentExpired) {
              router.push({
                pathname: '/payment/webview',
                params: { orderId: order.id, orderNumber },
              });
            }
          }}
          isLoading={isLoading}
          disabled={isPaymentExpired}
          aria-label="Bayar pesanan"
          aria-describedby="Tombol untuk melanjutkan pembayaran"
        />
      )}
    </YStack>
  );
}
