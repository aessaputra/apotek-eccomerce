import React from 'react';
import { Card, Separator, Text, XStack, YStack, styled } from 'tamagui';
import { CreditCardIcon, TruckIcon } from '@/components/icons';
import { getOrderStatusLabel, getPaymentStatusLabel, type OrderListItem } from '@/services';

const ORDER_CARD_HEIGHT = 148;

const OrderCardContainer = styled(Card, {
  bordered: true,
  elevate: true,
  size: '$4',
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  minHeight: ORDER_CARD_HEIGHT,
});

const StatusBadge = styled(XStack, {
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',

  variants: {
    status: {
      success: {
        backgroundColor: '$successSoft',
      },
      warning: {
        backgroundColor: '$warningSoft',
      },
      danger: {
        backgroundColor: '$dangerSoft',
      },
      neutral: {
        backgroundColor: '$surface',
      },
    },
  } as const,
});

const StatusText = styled(Text, {
  fontSize: '$2',
  fontWeight: '600',

  variants: {
    status: {
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      danger: {
        color: '$danger',
      },
      neutral: {
        color: '$colorSubtle',
      },
    },
  } as const,
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

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const successStates = ['settlement', 'capture'];
  const pendingStates = ['pending', 'authorize'];
  const failedStates = ['deny', 'cancel', 'expire'];

  if (successStates.includes(status)) {
    return 'success';
  }
  if (pendingStates.includes(status)) {
    return 'warning';
  }
  if (failedStates.includes(status)) {
    return 'danger';
  }
  return 'neutral';
}

interface OrderCardProps {
  order: OrderListItem;
  onPress?: () => void;
}

export const OrderCard = React.memo(function OrderCard({ order, onPress }: OrderCardProps) {
  const statusVariant = getStatusVariant(order.payment_status);
  const firstItem = order.order_items[0];
  const itemCount = order.order_items.length;
  const itemNames =
    itemCount === 1
      ? (firstItem?.products?.name ?? 'Produk')
      : `${firstItem?.products?.name ?? 'Produk'} +${itemCount - 1} lainnya`;

  return (
    <OrderCardContainer onPress={onPress} pressStyle={{ scale: 0.98 }} animation="quick">
      <YStack gap="$2" padding="$3">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1} flex={1}>
            {formatDate(order.created_at)}
          </Text>
          <StatusBadge status={statusVariant}>
            <StatusText status={statusVariant}>
              {getPaymentStatusLabel(order.payment_status)}
            </StatusText>
          </StatusBadge>
        </XStack>

        <Separator marginVertical="$1" />

        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <YStack flex={1} gap="$1" minWidth={0}>
            <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
              {order.midtrans_order_id ?? order.id.slice(0, 8)}
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
                  {order.courier_service}
                </Text>
              </XStack>
            ) : null}
          </YStack>
        </XStack>

        <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
          <XStack alignItems="center" gap="$1">
            <CreditCardIcon size={14} color="$colorSubtle" />
            <Text fontSize="$2" color="$colorSubtle">
              {getOrderStatusLabel(order.status)}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </OrderCardContainer>
  );
});
