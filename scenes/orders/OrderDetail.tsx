import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { PackageIcon, AlertCircleIcon } from '@/components/icons';
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
import OrderDetailItemsSection from './OrderDetailItemsSection';
import OrderDetailAddressSection from './OrderDetailAddressSection';
import OrderDetailShippingSection from './OrderDetailShippingSection';
import OrderDetailPaymentSection from './OrderDetailPaymentSection';
import OrderDetailSummarySection from './OrderDetailSummarySection';
import OrderDetailActions from './OrderDetailActions';

const DETAIL_CONTENT_WITH_ACTION_STYLE = { paddingBottom: 100 } as const;
const DETAIL_CONTENT_DEFAULT_STYLE = { paddingBottom: 24 } as const;

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
  const { order, status, isLoading, isRefreshing, isConfirming, error, refresh, confirmReceived } =
    useOrderDetail(orderId);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
  const refreshTintColor = getThemeColor(theme, 'primary');
  const shouldShowTracking = shouldShowTrackingSection(order?.status ?? '');

  const refreshControl = useMemo(
    () => (
      <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={refreshTintColor} />
    ),
    [isRefreshing, refresh, refreshTintColor],
  );

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

  const handleResumePayment = useCallback(() => {
    const paymentUrl = order?.snap_redirect_url?.trim() || '';
    const isOrderExpired = isBackendExpired(order?.expired_at) || isPaymentExpired;

    if (!order?.id || isOrderExpired || !paymentUrl) {
      return;
    }

    router.push({
      pathname: '/cart/payment',
      params: { orderId: order.id, paymentUrl },
    });
  }, [isPaymentExpired, order?.expired_at, order?.id, order?.snap_redirect_url, router]);

  const handleConfirmReceived = useCallback(() => {
    void confirmReceived();
  }, [confirmReceived]);

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
  const isAwaitingCustomerConfirmation = order.customer_completion_stage === 'awaiting_customer';
  const primaryStatusDisplay = getOrderPrimaryStatusDisplay(
    order.status,
    order.payment_status,
    order.expired_at,
    order.customer_completion_stage,
  );
  const secondaryStatusDisplay = getOrderSecondaryStatusDisplay(order.status, order.payment_status);

  const shouldReserveActionSpace =
    order.payment_status === 'pending' || shouldShowTracking || isAwaitingCustomerConfirmation;
  const contentContainerStyle = shouldReserveActionSpace
    ? DETAIL_CONTENT_WITH_ACTION_STYLE
    : DETAIL_CONTENT_DEFAULT_STYLE;

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
      <ScrollView refreshControl={refreshControl} contentContainerStyle={contentContainerStyle}>
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
                      expiresAt={order.expired_at}
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

              <OrderDetailPaymentSection secondaryStatusDisplay={secondaryStatusDisplay} />
            </YStack>
          </OrderSectionCard>

          <OrderDetailItemsSection orderItems={order.order_items} />
          <OrderDetailAddressSection address={order.addresses} />
          <OrderDetailShippingSection
            courierCode={order.courier_code}
            courierService={order.courier_service}
            waybillNumber={order.waybill_number}
            shippingEtd={order.shipping_etd}
            shippingCost={shippingCost}
          />
          <OrderDetailSummarySection
            subtotal={subtotal}
            shippingCost={shippingCost}
            totalAmount={totalAmount}
          />
        </YStack>
      </ScrollView>

      <OrderDetailActions
        paymentStatus={order.payment_status}
        isOrderExpired={isOrderExpired}
        canResumePayment={canResumePayment}
        isLoading={isLoading}
        isConfirming={isConfirming}
        shouldShowTracking={shouldShowTracking}
        isAwaitingCustomerConfirmation={isAwaitingCustomerConfirmation}
        waybillNumber={order.waybill_number}
        onResumePayment={handleResumePayment}
        onTrackShipment={handleTrackShipment}
        onConfirmReceived={handleConfirmReceived}
      />
    </YStack>
  );
}
