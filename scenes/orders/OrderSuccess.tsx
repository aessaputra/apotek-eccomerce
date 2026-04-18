import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  useTheme,
  Spinner,
  ScrollView,
  Card,
  Separator,
  styled,
} from 'tamagui';
import { CheckCircle, Package, Clock3, ReceiptText } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { formatOrderDateTime } from '@/utils/orderDate';
import { formatOrderNumber } from '@/utils/orderNumber';
import { getThemeColor } from '@/utils/theme';
import type { RouteParams } from '@/types/routes.types';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import type { OrderStatusVariant } from '@/services/order.service';
import { formatRupiah } from '@/scenes/cart/cart.constants';

const SectionCard = styled(Card, {
  bordered: true,
  elevate: false,
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  borderRadius: '$5',
  width: '100%',
});

function getPaymentBadgeVariant(
  paymentStatus: string | null | undefined,
  expiredAt?: string | null,
): OrderStatusVariant {
  if (!paymentStatus) return 'primary';

  if (paymentStatus === 'pending') {
    return expiredAt && new Date(expiredAt) < new Date() ? 'danger' : 'warning';
  }

  if (['settlement', 'capture'].includes(paymentStatus)) {
    return 'success';
  }

  if (
    [
      'refund',
      'partial_refund',
      'partially_refunded',
      'chargeback',
      'chargeback_reversed',
    ].includes(paymentStatus)
  ) {
    return 'warning';
  }

  if (['deny', 'cancel', 'expire', 'expired', 'failure', 'failed'].includes(paymentStatus)) {
    return 'danger';
  }

  return 'primary';
}

function getHeroContent(
  paymentStatus: string | null | undefined,
  expiredAt?: string | null,
): {
  title: string;
  description: string;
  summaryNote: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  colorToken: 'success' | 'warning' | 'danger' | 'primary';
  softToken: '$successSoft' | '$warningSoft' | '$dangerSoft' | '$primarySoft';
} {
  const variant = getPaymentBadgeVariant(paymentStatus, expiredAt);

  if (variant === 'warning') {
    return {
      title: 'Menunggu Pembayaran',
      description: 'Pesanan Anda masih menunggu pembayaran untuk dapat diproses lebih lanjut.',
      summaryNote: 'Segera selesaikan pembayaran agar pesanan bisa diproses.',
      icon: Clock3,
      colorToken: 'warning',
      softToken: '$warningSoft',
    };
  }

  if (variant === 'danger') {
    return {
      title: 'Pembayaran Belum Berhasil',
      description: 'Status pembayaran untuk pesanan ini memerlukan perhatian lebih lanjut.',
      summaryNote: 'Silakan kembali ke beranda untuk melanjutkan penggunaan aplikasi.',
      icon: ReceiptText,
      colorToken: 'danger',
      softToken: '$dangerSoft',
    };
  }

  if (variant === 'primary') {
    return {
      title: 'Status Pembayaran Diperbarui',
      description: 'Pesanan Anda sudah tercatat dan status pembayarannya baru saja diperbarui.',
      summaryNote: 'Silakan kembali ke beranda untuk melanjutkan aktivitas Anda.',
      icon: ReceiptText,
      colorToken: 'primary',
      softToken: '$primarySoft',
    };
  }

  return {
    title: 'Pembayaran Berhasil',
    description:
      'Terima kasih! Pesanan Anda sudah kami terima dan sedang disiapkan untuk diproses.',
    summaryNote: 'Pembayaran telah berhasil dikonfirmasi',
    icon: CheckCircle,
    colorToken: 'success',
    softToken: '$successSoft',
  };
}

export default function OrderSuccess() {
  const { orderId } = useLocalSearchParams<RouteParams<'order-success'>>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const successColor = getThemeColor(theme, 'success');
  const dangerColor = getThemeColor(theme, 'danger');
  const primaryColor = getThemeColor(theme, 'primary');
  const warningColor = getThemeColor(theme, 'warning');
  const subtleColor = getThemeColor(theme, 'colorSubtle');

  const resolvedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const { order, isLoading, error } = useOrderDetail(resolvedOrderId);

  const handleGoHome = () => {
    router.replace('/home');
  };

  const totalItems = order?.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const orderNumber = order
    ? formatOrderNumber(order.id)
    : resolvedOrderId
      ? formatOrderNumber(resolvedOrderId)
      : '';
  const heroContent = getHeroContent(order?.payment_status, order?.expired_at);
  const heroIconColor =
    heroContent.colorToken === 'danger'
      ? dangerColor
      : heroContent.colorToken === 'warning'
        ? warningColor
        : heroContent.colorToken === 'primary'
          ? primaryColor
          : successColor;
  const HeroIcon = heroContent.icon;

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingBottom={insets.bottom + 16}
      paddingTop={insets.top + 16}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}>
        <YStack
          flex={1}
          alignItems="center"
          gap="$4"
          paddingVertical="$4"
          justifyContent="space-between">
          <YStack alignItems="center" gap="$4" width="100%" maxWidth={420}>
            <YStack
              width={88}
              height={88}
              borderRadius="$10"
              backgroundColor={heroContent.softToken}
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor={heroContent.softToken}>
              <HeroIcon size={40} color={heroIconColor} />
            </YStack>

            <YStack gap="$2" alignItems="center">
              <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">
                {heroContent.title}
              </Text>
              <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={320}>
                {heroContent.description}
              </Text>
            </YStack>
          </YStack>

          {isLoading ? (
            <SectionCard maxWidth={420}>
              <YStack padding="$5" alignItems="center" gap="$3">
                <Spinner size="large" color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Menyiapkan Ringkasan Pesanan
                </Text>
                <Text fontSize="$3" color="$colorSubtle" textAlign="center">
                  Kami sedang memuat detail pesanan terbaru Anda.
                </Text>
              </YStack>
            </SectionCard>
          ) : error ? (
            <SectionCard maxWidth={420}>
              <YStack padding="$5" alignItems="center" gap="$3">
                <YStack
                  width={72}
                  height={72}
                  borderRadius="$10"
                  backgroundColor="$dangerSoft"
                  alignItems="center"
                  justifyContent="center">
                  <ReceiptText size={28} color={dangerColor} />
                </YStack>
                <YStack gap="$2" alignItems="center">
                  <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
                    Detail Pesanan Belum Tersedia
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={300}>
                    {error}
                  </Text>
                </YStack>
              </YStack>
            </SectionCard>
          ) : order ? (
            <SectionCard maxWidth={420}>
              <YStack padding="$5" gap="$4">
                <YStack gap="$2.5">
                  <XStack alignItems="baseline" gap="$2.5" flexWrap="wrap">
                    <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                      NOMOR PESANAN
                    </Text>
                    <Text fontSize="$5" fontWeight="700" color="$color">
                      {orderNumber}
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$2">
                    <Clock3 size={15} color={subtleColor} />
                    <Text fontSize="$3" color="$colorSubtle">
                      {formatOrderDateTime(order.created_at)}
                    </Text>
                  </XStack>
                </YStack>

                <Separator />

                <YStack gap="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack alignItems="center" gap="$2">
                      <Package size={16} color={primaryColor} />
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        Ringkasan Pesanan
                      </Text>
                    </XStack>
                    <Text fontSize="$4" fontWeight="600" color="$color">
                      {totalItems} item
                    </Text>
                  </XStack>

                  {order.order_items?.slice(0, 2).map(item => (
                    <XStack
                      key={item.id}
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap="$3">
                      <Text fontSize="$3" color="$color" flex={1} numberOfLines={1}>
                        {item.quantity}x {item.products?.name ?? 'Produk'}
                      </Text>
                      <Text fontSize="$3" color="$colorSubtle">
                        {formatRupiah(item.price_at_purchase * item.quantity)}
                      </Text>
                    </XStack>
                  ))}

                  {order.order_items && order.order_items.length > 2 ? (
                    <Text fontSize="$2" color="$colorMuted">
                      +{order.order_items.length - 2} item lainnya
                    </Text>
                  ) : null}
                </YStack>

                <Separator />

                <XStack justifyContent="space-between" alignItems="center" gap="$3">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$3" color="$colorSubtle">
                      Total Pembayaran
                    </Text>
                    <Text fontSize="$2" color="$colorMuted">
                      {heroContent.summaryNote}
                    </Text>
                  </YStack>
                  <Text fontSize="$6" fontWeight="700" color="$primary">
                    {formatRupiah(order.total_amount)}
                  </Text>
                </XStack>
              </YStack>
            </SectionCard>
          ) : (
            <SectionCard maxWidth={420}>
              <YStack padding="$5" alignItems="center" gap="$2">
                <Text fontSize="$4" fontWeight="600" color="$color" textAlign="center">
                  Pesanan Berhasil Dibuat
                </Text>
                <Text fontSize="$3" color="$colorSubtle" textAlign="center" maxWidth={300}>
                  Ringkasan pesanan belum tersedia, tetapi pembayaran Anda sudah kami catat.
                </Text>
              </YStack>
            </SectionCard>
          )}

          <YStack gap="$3" width="100%" maxWidth={420} paddingTop="$1">
            <Button
              title="Kembali ke Beranda"
              backgroundColor="$primary"
              borderRadius="$5"
              minHeight={56}
              titleStyle={{ color: '$onPrimary', fontWeight: '700', fontSize: '$4' }}
              onPress={handleGoHome}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
