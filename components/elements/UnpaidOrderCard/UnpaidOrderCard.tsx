import React from 'react';
import { Card, Separator, Text, XStack, YStack } from 'tamagui';
import { TruckIcon, CreditCardIcon } from '@/components/icons';
import { getPaymentStatusLabel, getOrderStatusLabel, type OrderListItem } from '@/services';

const ORDER_CARD_HEIGHT = 148;

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

function getStatusColor(status: string): { bg: string; text: string } {
  const successStates = ['settlement', 'capture'];
  const pendingStates = ['pending', 'authorize'];
  const failedStates = ['deny', 'cancel', 'expire'];
  const refundStates = ['refund', 'partial_refund', 'chargeback', 'partial_chargeback'];

  if (successStates.includes(status)) {
    return { bg: '$successSoft', text: '$success' };
  }
  if (pendingStates.includes(status)) {
    return { bg: '$warningSoft', text: '$warning' };
  }
  if (failedStates.includes(status)) {
    return { bg: '$dangerSoft', text: '$danger' };
  }
  if (refundStates.includes(status)) {
    return { bg: '$surface', text: '$colorSubtle' };
  }
  return { bg: '$surface', text: '$colorSubtle' };
}

interface UnpaidOrderCardProps {
  order: OrderListItem;
}

export function UnpaidOrderCard({ order }: UnpaidOrderCardProps) {
  const statusColors = getStatusColor(order.payment_status);
  const firstItem = order.order_items[0];
  const itemCount = order.order_items.length;
  const itemNames =
    itemCount === 1
      ? (firstItem?.products?.name ?? 'Produk')
      : `${firstItem?.products?.name ?? 'Produk'} +${itemCount - 1} lainnya`;

  return (
    <Card
      bordered
      elevate
      size="$4"
      backgroundColor="$surface"
      borderColor="$surfaceBorder"
      minHeight={ORDER_CARD_HEIGHT}>
      <YStack gap="$2" padding="$3">
        <XStack justifyContent="space-between" alignItems="center" gap="$2">
          <Text fontSize="$3" color="$colorSubtle" numberOfLines={1} flex={1}>
            {formatDate(order.created_at)}
          </Text>
          <XStack
            backgroundColor={statusColors.bg}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2">
            <Text fontSize="$2" fontWeight="600" color={statusColors.text}>
              {getPaymentStatusLabel(order.payment_status)}
            </Text>
          </XStack>
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
    </Card>
  );
}
