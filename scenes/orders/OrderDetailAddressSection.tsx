import React from 'react';
import { Text, XStack, YStack, Separator } from 'tamagui';
import { TruckIcon } from '@/components/icons';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import type { OrderWithItems } from '@/services';
import { formatAddress } from '@/utils/address';

interface OrderDetailAddressSectionProps {
  address: OrderWithItems['addresses'];
}

export default function OrderDetailAddressSection({ address }: OrderDetailAddressSectionProps) {
  if (!address) {
    return null;
  }

  const formattedAddress = formatAddress(address);

  return (
    <OrderSectionCard>
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$2">
          <TruckIcon size={20} color="$primary" />
          <Text fontSize="$4" fontWeight="600" color="$color">
            Alamat Pengiriman
          </Text>
        </XStack>

        <Separator />

        <YStack gap="$2">
          <Text fontSize="$3" color="$color" fontWeight="600">
            {address.receiver_name}
          </Text>
          <Text fontSize="$3" color="$color">
            {address.phone_number}
          </Text>
          <Text fontSize="$3" color="$colorSubtle">
            {formattedAddress}
          </Text>
          {address.address_note ? (
            <Text fontSize="$3" color="$colorSubtle" fontStyle="italic">
              Catatan: {address.address_note}
            </Text>
          ) : null}
        </YStack>
      </YStack>
    </OrderSectionCard>
  );
}
