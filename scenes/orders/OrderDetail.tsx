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
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import AppButton from '@/components/elements/Button';
import { formatCourierServiceName } from '@/constants/courier.constants';
import { formatRupiah } from '@/scenes/cart/cart.constants';
import { cancelUserOrder } from '@/services/checkout.service';

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
  const [confirmCancelDialogOpen, setConfirmCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
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

  const handleCancelOrder = useCallback(async () => {
    if (!order?.id || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setActionFeedback(null);

    const { data, error: cancelError } = await cancelUserOrder(order.id);

    setIsCancelling(false);
    setConfirmCancelDialogOpen(false);

    if (cancelError) {
      setActionFeedback(cancelError.message);
      return;
    }

    if (!data?.cancelled || data.payment_status !== 'cancel') {
      setActionFeedback(
        'Pesanan belum bisa dibatalkan. Silakan cek status pesanan lalu coba lagi.',
      );
      refresh();
      return;
    }

    setActionFeedback('Pesanan berhasil dibatalkan.');
    refresh();
  }, [isCancelling, order?.id, refresh]);

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
  const isActionableUnpaidOrder =
    order.status === 'pending' && ['pending', 'authorize'].includes(order.payment_status);
  const canResumePayment = !isOrderExpired && !!paymentUrl;
  const primaryStatusDisplay = getOrderPrimaryStatusDisplay(
    order.status,
    order.payment_status,
    order.expired_at,
  );
  const secondaryStatusDisplay = getOrderSecondaryStatusDisplay(order.status, order.payment_status);

  return (
    <YStack flex={1} backgroundColor="$background">
      {(error || actionFeedback) && (
        <YStack backgroundColor="$dangerSoft" padding="$3" margin="$4" borderRadius="$3" gap="$2">
          <XStack alignItems="center" gap="$2">
            <AlertCircleIcon size={16} color="$danger" />
            <Text fontSize="$3" color="$danger" flex={1}>
              {actionFeedback ?? error}
            </Text>
            {error ? (
              <Button size="$2" backgroundColor="transparent" color="$danger" onPress={refresh}>
                Coba Lagi
              </Button>
            ) : null}
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

          {isActionableUnpaidOrder && !isOrderExpired ? (
            <OrderSectionCard>
              <YStack padding="$4" gap="$3">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Kelola Pembayaran
                </Text>
                <Text fontSize="$3" color="$colorSubtle">
                  Jika belum ingin melanjutkan pembayaran, Anda dapat membatalkan pesanan ini.
                </Text>
                <AppButton
                  backgroundColor="$background"
                  borderWidth={1}
                  borderColor="$danger"
                  borderRadius="$4"
                  minHeight={44}
                  onPress={() => setConfirmCancelDialogOpen(true)}
                  disabled={isCancelling}
                  aria-label="Batalkan Pesanan">
                  <Text color="$danger" fontWeight="700">
                    {isCancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
                  </Text>
                </AppButton>
              </YStack>
            </OrderSectionCard>
          ) : null}
        </YStack>
      </ScrollView>

      {isActionableUnpaidOrder && order.payment_status === 'pending' && (
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

      <AppAlertDialog
        open={confirmCancelDialogOpen}
        onOpenChange={setConfirmCancelDialogOpen}
        title="Batalkan Pesanan?"
        description="Pesanan akan dibatalkan dan transaksi pembayaran akan ditutup jika masih bisa dibatalkan oleh Midtrans."
        confirmLabel="Ya, Batalkan Pesanan"
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
