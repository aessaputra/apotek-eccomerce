import React from 'react';
import { Text, XStack, YStack, Separator } from 'tamagui';
import { TruckIcon } from '@/components/icons';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import { formatCourierServiceName } from '@/constants/courier.constants';
import { formatRupiah } from '@/scenes/cart/cart.constants';

interface OrderDetailShippingSectionProps {
  courierCode?: string | null;
  courierService?: string | null;
  waybillNumber?: string | null;
  shippingEtd?: string | null;
  shippingCost: number;
}

export default function OrderDetailShippingSection({
  courierCode,
  courierService,
  waybillNumber,
  shippingEtd,
  shippingCost,
}: OrderDetailShippingSectionProps) {
  if (!courierCode && !courierService) {
    return null;
  }

  return (
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
            {formatCourierServiceName(courierCode, courierService)}
          </Text>
          {waybillNumber && (
            <Text fontSize="$3" color="$colorSubtle">
              No. Resi: {waybillNumber}
            </Text>
          )}
          {shippingEtd && (
            <Text fontSize="$3" color="$colorSubtle">
              Estimasi: {shippingEtd}
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
  );
}
