import React from 'react';
import { Card, Separator, Text, XStack, YStack, styled } from 'tamagui';
import { PackageIcon, TruckIcon } from '@/components/icons';
import { StatusBadge } from '@/components/elements/StatusBadge';
import {
  getOrderPrimaryStatusDisplay,
  getOrderStatusLabel,
  type OrderListItem,
  type OrderStatusVariant,
} from '@/services';
import { formatCourierServiceName } from '@/constants/courier.constants';

const ORDER_CARD_HEIGHT = 148;

const OrderCardContainer = styled(Card, {
  bordered: true,
  size: '$4',
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  minHeight: ORDER_CARD_HEIGHT,
  variants: {
    elevated: {
      true: {
        elevate: true,
      },
      false: {
        elevate: false,
      },
    },
  } as const,
  defaultVariants: {
    elevated: true,
  },
});

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

interface StatusDisplay {
  label: string;
  variant: OrderStatusVariant;
}

interface OrderCardProps {
  order: OrderListItem;
  onPress?: () => void;
  elevated?: boolean;
}

export const OrderCard = React.memo(function OrderCard({
  order,
  onPress,
  elevated = true,
}: OrderCardProps) {
  const statusDisplay: StatusDisplay = getOrderPrimaryStatusDisplay(
    order.status,
    order.payment_status,
    order.expired_at,
  );
  const orderItems = order.order_items ?? [];
  const firstItem = orderItems[0];
  const itemCount = orderItems.length;
  const itemNames =
    itemCount <= 1
      ? (firstItem?.products?.name ?? 'Produk')
      : `${firstItem?.products?.name ?? 'Produk'} +${itemCount - 1} lainnya`;

  return (
    <OrderCardContainer
      onPress={onPress}
      pressStyle={{ scale: 0.98 }}
      animation="quick"
      elevated={elevated}>
      <YStack gap="$2" padding="$3">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1} flex={1}>
            {formatDate(order.created_at)}
          </Text>
          <StatusBadge variant={statusDisplay.variant} size="compact">
            {statusDisplay.label}
          </StatusBadge>
        </XStack>

        <Separator marginVertical="$1" />

        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <YStack flex={1} gap="$1" minWidth={0}>
            <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
              APT-{order.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
              {itemNames}
            </Text>
          </YStack>
          <YStack alignItems="flex-end" gap="$1">
            <Text fontSize="$5" fontWeight="700" color="$primary">
              {formatRupiah(order.gross_amount ?? order.total_amount)}
            </Text>
            {order.courier_service ? (
              <XStack alignItems="center" gap="$1">
                <TruckIcon size={14} color="$colorSubtle" />
                <Text fontSize="$2" color="$colorSubtle">
                  {formatCourierServiceName(order.courier_code, order.courier_service)}
                </Text>
              </XStack>
            ) : null}
          </YStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
          <XStack alignItems="center" gap="$1">
            <PackageIcon size={14} color="$colorSubtle" />
            <Text fontSize="$2" color="$colorSubtle">
              {getOrderStatusLabel(order.status)}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </OrderCardContainer>
  );
});
