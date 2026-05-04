import React from 'react';
import { Text, XStack, YStack, Separator } from 'tamagui';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import { formatRupiah } from '@/scenes/cart/cart.constants';

interface OrderDetailSummarySectionProps {
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
}

export default function OrderDetailSummarySection({
  subtotal,
  shippingCost,
  totalAmount,
}: OrderDetailSummarySectionProps) {
  return (
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
  );
}
