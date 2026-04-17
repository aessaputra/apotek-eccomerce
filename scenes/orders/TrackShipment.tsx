import React, { useCallback } from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Separator, Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { ArrowUpRight, Clock3 } from '@tamagui/lucide-icons';
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
    picking_up: 'Kurir Menuju Penjemputan',
    pickingUp: 'Kurir Menuju Penjemputan',
    picked: 'Paket Sudah Dijemput',
    picked_up: 'Paket Sudah Dijemput',
    dropping_off: 'Sedang Dikirim',
    droppingOff: 'Sedang Dikirim',
    delivering: 'Sedang Dikirim',
    in_transit: 'Sedang Dikirim',
    on_hold: 'Tertahan',
    onHold: 'Tertahan',
    delivered: 'Terkirim',
    rejected: 'Pengiriman Ditolak',
    courier_not_found: 'Kurir Belum Ditemukan',
    courierNotFound: 'Kurir Belum Ditemukan',
    return_in_transit: 'Dalam Proses Pengembalian',
    returnInTransit: 'Dalam Proses Pengembalian',
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

function getTrackingHeroCopy(status: string): {
  title: string;
  description: string;
  tone: '$successSoft' | '$warningSoft' | '$dangerSoft' | '$primarySoft';
} {
  if (status === 'delivered') {
    return {
      title: 'Pesanan Sudah Terkirim',
      description: 'Kurir telah menyelesaikan pengantaran. Silakan cek detail riwayat di bawah.',
      tone: '$successSoft',
    };
  }

  if (['rejected', 'disposed', 'courier_not_found', 'courierNotFound'].includes(status)) {
    return {
      title: 'Pengiriman Perlu Perhatian',
      description: 'Status pengiriman berubah dan memerlukan pengecekan lebih lanjut.',
      tone: '$dangerSoft',
    };
  }

  if (
    ['on_hold', 'onHold', 'cancelled', 'returned', 'return_in_transit', 'returnInTransit'].includes(
      status,
    )
  ) {
    return {
      title: 'Pengiriman Sedang Tertahan',
      description:
        'Ada pembaruan status yang perlu diperhatikan sebelum pesanan melanjutkan perjalanan.',
      tone: '$warningSoft',
    };
  }

  return {
    title: 'Perjalanan Paket Anda',
    description: 'Lihat status terbaru, resi, dan riwayat perpindahan paket Anda di satu layar.',
    tone: '$primarySoft',
  };
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

  const heroContent = getTrackingHeroCopy(tracking?.status ?? order.status);

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
          <YStack padding="$4" gap="$4">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                <YStack
                  width={56}
                  height={56}
                  borderRadius="$10"
                  backgroundColor={heroContent.tone}
                  alignItems="center"
                  justifyContent="center">
                  <TruckIcon size={28} color="$primary" />
                </YStack>

                <YStack flex={1} gap="$1">
                  <Text fontSize="$4" fontWeight="700" color="$color">
                    {heroContent.title}
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle">
                    {heroContent.description}
                  </Text>
                </YStack>
              </XStack>

              {tracking && (
                <XStack>
                  <StatusBadge variant={getTrackingStatusVariant(tracking.status)}>
                    {formatTrackingStatusLabel(tracking.status)}
                  </StatusBadge>
                </XStack>
              )}
            </YStack>

            <Separator />

            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                <YStack flex={1} gap="$1">
                  <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                    NOMOR PESANAN
                  </Text>
                  <Text fontSize="$5" fontWeight="700" color="$color">
                    {formatOrderNumber(order.id)}
                  </Text>
                </YStack>

                <YStack alignItems="flex-end" gap="$1">
                  <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                    TERAKHIR DIPERBARUI
                  </Text>
                  <XStack alignItems="center" gap="$1.5">
                    <Clock3 size={14} color="$colorSubtle" />
                    <Text fontSize="$3" color="$colorSubtle">
                      {formatTrackingDate(
                        (tracking?.history[0] ?? trackingTimeline[0])?.updated_at ??
                          order.updated_at ??
                          order.created_at,
                      )}
                    </Text>
                  </XStack>
                </YStack>
              </XStack>

              <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                <YStack flex={1} gap="$1">
                  <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                    KURIR
                  </Text>
                  <Text fontSize="$3" color="$color">
                    {formatCourierServiceName(order.courier_code, order.courier_service)}
                  </Text>
                </YStack>

                {order.waybill_number ? (
                  <YStack flex={1} gap="$1" alignItems="flex-end">
                    <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                      NOMOR RESI
                    </Text>
                    <Text fontSize="$3" color="$color" textAlign="right">
                      {order.waybill_number}
                    </Text>
                  </YStack>
                ) : null}
              </XStack>

              {(tracking?.courier.driver_name || tracking?.courier.driver_phone) && (
                <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
                  {tracking?.courier.driver_name ? (
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                        DRIVER
                      </Text>
                      <Text fontSize="$3" color="$colorSubtle">
                        {tracking.courier.driver_name}
                      </Text>
                    </YStack>
                  ) : (
                    <YStack flex={1} />
                  )}

                  {tracking?.courier.driver_phone ? (
                    <YStack flex={1} gap="$1" alignItems="flex-end">
                      <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                        KONTAK DRIVER
                      </Text>
                      <Text fontSize="$3" color="$colorSubtle" textAlign="right">
                        {tracking.courier.driver_phone}
                      </Text>
                    </YStack>
                  ) : null}
                </XStack>
              )}

              {tracking?.link && (
                <Button
                  size="$4"
                  chromeless
                  alignSelf="flex-start"
                  color="$primary"
                  iconAfter={<ArrowUpRight size={16} color={getThemeColor(theme, 'primary')} />}
                  onPress={handleOpenTrackingLink}
                  disabled={!isSafeExternalUrl(tracking.link)}>
                  Lihat Tracking Kurir Eksternal
                </Button>
              )}
            </YStack>
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
