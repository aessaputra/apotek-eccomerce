import React, { useCallback } from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Separator, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import { AlertCircleIcon, PackageIcon, TruckIcon } from '@/components/icons';
import { StatusBadge } from '@/components/elements/StatusBadge';
import { useOrderDetail, useOrderTracking } from '@/hooks';
import { formatCourierServiceName } from '@/constants/courier.constants';
import { formatOrderNumber } from '@/utils/orderNumber';
import { getThemeColor } from '@/utils/theme';
import type { OrderStatusVariant } from '@/services';
import type { TrackingEvent } from '@/types/shipping';

function formatTrackingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Pesanan Dikonfirmasi',
    allocated: 'Kurir Dialokasikan',
    picking_up: 'Kurir Menuju Pickup',
    pickingUp: 'Kurir Menuju Pickup',
    picked: 'Paket Sudah Diambil',
    picked_up: 'Paket Sudah Diambil',
    dropping_off: 'Dalam Pengantaran',
    droppingOff: 'Dalam Pengantaran',
    delivering: 'Dalam Pengantaran',
    in_transit: 'Dalam Perjalanan',
    on_hold: 'Tertahan',
    onHold: 'Tertahan',
    delivered: 'Terkirim',
    rejected: 'Pengiriman Ditolak',
    courier_not_found: 'Kurir Tidak Ditemukan',
    courierNotFound: 'Kurir Tidak Ditemukan',
    return_in_transit: 'Sedang Dikembalikan',
    returnInTransit: 'Sedang Dikembalikan',
    returned: 'Dikembalikan',
    cancelled: 'Dibatalkan',
    disposed: 'Dibuang',
  };

  return labels[status] || status.replace(/_/g, ' ');
}

function getTrackingStatusVariant(status: string): OrderStatusVariant {
  if (status === 'delivered') return 'success';
  if (['rejected', 'disposed', 'courier_not_found', 'courierNotFound'].includes(status)) {
    return 'danger';
  }
  if (
    ['on_hold', 'onHold', 'cancelled', 'returned', 'return_in_transit', 'returnInTransit'].includes(
      status,
    )
  ) {
    return 'warning';
  }
  return 'primary';
}

function formatTrackingDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function TrackShipment() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdParam = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const orderId =
    typeof orderIdParam === 'string' && orderIdParam.trim() ? orderIdParam : undefined;
  const theme = useTheme();
  const refreshTintColor = getThemeColor(theme, 'primary');

  const { order, status, isLoading, isRefreshing, error, refresh } = useOrderDetail(orderId);
  const canFetchTracking = Boolean(order?.waybill_number?.trim());
  const {
    tracking,
    error: trackingError,
    isLoading: isTrackingLoading,
    isRefreshing: isTrackingRefreshing,
    refresh: refreshTracking,
  } = useOrderTracking(order?.id, canFetchTracking);

  const handleRefresh = useCallback(async () => {
    if (canFetchTracking) {
      await Promise.all([refresh(), refreshTracking()]);
      return;
    }

    await refresh();
  }, [canFetchTracking, refresh, refreshTracking]);

  const handleOpenTrackingLink = useCallback(() => {
    if (!tracking?.link || !isSafeExternalUrl(tracking.link)) {
      return;
    }

    void Linking.openURL(tracking.link);
  }, [tracking?.link]);

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
          Tracking Tidak Tersedia
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
        <Text color="$colorSubtle">Memuat data tracking...</Text>
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
        <AlertCircleIcon size={40} color="$danger" />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Gagal Memuat Tracking
        </Text>
        <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={280}>
          {error}
        </Text>
        <Button size="$4" backgroundColor="$primary" color="$onPrimary" onPress={refresh}>
          Coba Lagi
        </Button>
      </YStack>
    );
  }

  if (status === 'not-found' || !order) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        gap="$4"
        padding="$6">
        <PackageIcon size={40} color="$colorMuted" />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Pesanan Tidak Ditemukan
        </Text>
      </YStack>
    );
  }

  const trackingTimeline =
    tracking && tracking.history.length > 0
      ? tracking.history.map((event: TrackingEvent, index: number, history: TrackingEvent[]) => ({
          ...event,
          timelineKey: `${event.updated_at}-${event.status}-${event.note}`,
          showConnector: index < history.length - 1,
        }))
      : tracking
        ? [
            {
              note: 'Status pengiriman belum memiliki riwayat detail.',
              status: tracking.status,
              updated_at: order.updated_at ?? order.created_at,
              timelineKey: `fallback-${tracking.id}`,
              showConnector: false,
            },
          ]
        : [];

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isTrackingRefreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 24 }}>
        <OrderSectionCard>
          <YStack padding="$4" gap="$3">
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <YStack flex={1} gap="$1">
                <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                  NOMOR PESANAN
                </Text>
                <Text fontSize="$6" fontWeight="700" color="$color">
                  {formatOrderNumber(order.id)}
                </Text>
              </YStack>
              {tracking && (
                <StatusBadge variant={getTrackingStatusVariant(tracking.status)}>
                  {formatTrackingStatusLabel(tracking.status)}
                </StatusBadge>
              )}
            </XStack>

            <Separator />

            <YStack gap="$2">
              <Text fontSize="$3" color="$color">
                {formatCourierServiceName(order.courier_code, order.courier_service)}
              </Text>
              {order.waybill_number && (
                <Text fontSize="$3" color="$colorSubtle">
                  No. Resi: {order.waybill_number}
                </Text>
              )}
              {tracking?.courier.driver_name && (
                <Text fontSize="$3" color="$colorSubtle">
                  Driver: {tracking.courier.driver_name}
                </Text>
              )}
              {tracking?.courier.driver_phone && (
                <Text fontSize="$3" color="$colorSubtle">
                  Kontak Driver: {tracking.courier.driver_phone}
                </Text>
              )}
            </YStack>

            {tracking?.link && (
              <Button
                size="$4"
                backgroundColor="$primary"
                color="$onPrimary"
                onPress={handleOpenTrackingLink}
                disabled={!isSafeExternalUrl(tracking.link)}>
                Buka Tracking Kurir
              </Button>
            )}
          </YStack>
        </OrderSectionCard>

        {!order.waybill_number ? (
          <OrderSectionCard>
            <YStack padding="$4" gap="$2">
              <Text fontSize="$4" fontWeight="600" color="$color">
                Menunggu Nomor Resi
              </Text>
              <Text fontSize="$3" color="$colorSubtle">
                Tracking akan tersedia setelah kurir memberikan nomor resi untuk pesanan ini.
              </Text>
            </YStack>
          </OrderSectionCard>
        ) : isTrackingLoading && !tracking ? (
          <OrderSectionCard>
            <YStack padding="$4" gap="$2" alignItems="center">
              <Spinner size="small" color="$primary" />
              <Text fontSize="$3" color="$colorSubtle">
                Memuat status pengiriman...
              </Text>
            </YStack>
          </OrderSectionCard>
        ) : trackingError ? (
          <OrderSectionCard>
            <YStack padding="$4" gap="$3">
              <Text fontSize="$4" fontWeight="600" color="$danger">
                Tracking Belum Bisa Dimuat
              </Text>
              <Text fontSize="$3" color="$colorSubtle">
                {trackingError}
              </Text>
              <Button
                size="$4"
                backgroundColor="$primary"
                color="$onPrimary"
                onPress={refreshTracking}>
                Coba Lagi
              </Button>
            </YStack>
          </OrderSectionCard>
        ) : tracking ? (
          <OrderSectionCard>
            <YStack padding="$4" gap="$4">
              <XStack alignItems="center" gap="$2">
                <TruckIcon size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Riwayat Pengiriman
                </Text>
              </XStack>

              <Separator />

              <YStack gap="$3">
                {trackingTimeline.map(
                  (event: TrackingEvent & { timelineKey: string; showConnector: boolean }) => (
                    <XStack key={event.timelineKey} gap="$3" alignItems="flex-start">
                      <YStack width={10} alignItems="center" paddingTop="$1">
                        <YStack
                          width={10}
                          height={10}
                          borderRadius="$10"
                          backgroundColor="$primary"
                        />
                        {event.showConnector && (
                          <YStack
                            width={2}
                            minHeight={32}
                            backgroundColor="$borderColor"
                            marginTop="$1"
                          />
                        )}
                      </YStack>
                      <YStack flex={1} gap="$1">
                        <Text fontSize="$3" fontWeight="600" color="$color">
                          {formatTrackingStatusLabel(event.status)}
                        </Text>
                        <Text fontSize="$2" color="$colorSubtle">
                          {formatTrackingDate(event.updated_at)}
                        </Text>
                        <Text fontSize="$3" color="$colorSubtle">
                          {event.note}
                        </Text>
                      </YStack>
                    </XStack>
                  ),
                )}
              </YStack>
            </YStack>
          </OrderSectionCard>
        ) : null}
      </ScrollView>
    </YStack>
  );
}
