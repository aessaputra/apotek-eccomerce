import React, { useMemo, useState, useCallback } from 'react';
import { Card, Text, XStack, YStack } from 'tamagui';
import Image from '@/components/elements/Image';
import { PaymentCountdownTimer } from '@/components/elements/PaymentCountdownTimer';
import { PayNowButton } from '@/components/elements/PayNowButton';
import { StatusBadge } from '@/components/elements/StatusBadge';
import { PackageIcon } from '@/components/icons';
import { isBackendExpired, type OrderListItem } from '@/services';

export interface UnpaidOrderCardProps {
  order: OrderListItem;
  onPress?: () => void;
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function getProductImageUrl(order: OrderListItem): string | null {
  const firstItem = order.order_items[0];
  if (!firstItem?.products?.product_images?.length) {
    return null;
  }
  return firstItem.products.product_images[0]?.url ?? null;
}

function getProductDisplayInfo(order: OrderListItem): { name: string; itemCount: number } {
  const firstItem = order.order_items[0];
  return {
    name: firstItem?.products?.name ?? 'Produk',
    itemCount: order.order_items.length,
  };
}

export const UnpaidOrderCard = React.memo(function UnpaidOrderCard({
  order,
  onPress,
}: UnpaidOrderCardProps) {
  const imageUrl = useMemo(() => getProductImageUrl(order), [order]);
  const productInfo = useMemo(() => getProductDisplayInfo(order), [order]);
  const orderNumber = `APT-${order.id.slice(0, 8).toUpperCase()}`;
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  // Check if backend already marked order as expired
  const backendExpired = useMemo(() => isBackendExpired(order.expired_at), [order.expired_at]);

  const isExpired = backendExpired || isTimerExpired;

  const handleTimerExpired = useCallback(() => {
    setIsTimerExpired(true);
    if (__DEV__) {
      console.log('[UnpaidOrderCard] Order expired:', order.id);
    }
  }, [order.id]);

  return (
    <Card
      onPress={onPress}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$surfaceBorder"
      borderRadius="$4"
      overflow="hidden"
      pressStyle={{ opacity: 0.9, backgroundColor: '$surfaceHover' }}>
      <YStack gap="$3" padding="$3">
        {backendExpired ? (
          <StatusBadge variant="danger">Pembayaran Kadaluarsa</StatusBadge>
        ) : (
          <PaymentCountdownTimer createdAt={order.created_at} onExpired={handleTimerExpired} />
        )}

        <XStack gap="$3" alignItems="center">
          <YStack
            width={64}
            height={64}
            borderRadius="$2"
            overflow="hidden"
            backgroundColor="$surfaceSubtle"
            alignItems="center"
            justifyContent="center">
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <PackageIcon size={28} color="$colorSubtle" />
            )}
          </YStack>

          <YStack flex={1} gap="$1">
            <Text fontSize="$3" fontWeight="600" color="$color" numberOfLines={2}>
              {productInfo.name}
            </Text>

            {productInfo.itemCount > 1 && (
              <Text fontSize="$2" color="$colorSubtle">
                +{productInfo.itemCount - 1} produk lainnya
              </Text>
            )}

            <Text fontSize="$4" fontWeight="700" color="$primary">
              {formatRupiah(order.gross_amount ?? order.total_amount)}
            </Text>
          </YStack>
        </XStack>

        <XStack justifyContent="flex-end">
          <PayNowButton orderId={order.id} orderNumber={orderNumber} disabled={isExpired} />
        </XStack>
      </YStack>
    </Card>
  );
});

export default UnpaidOrderCard;
