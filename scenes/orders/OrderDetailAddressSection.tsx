import React from 'react';
import { Text, XStack, YStack, Separator } from 'tamagui';
import { TruckIcon } from '@/components/icons';
import OrderSectionCard from '@/components/elements/OrderSectionCard';
import type { OrderWithItems } from '@/services';
import { cleanStreetAddress } from '@/utils/address';
import { formatLevel3Display } from '@/utils/areaFormatters';

interface OrderDetailAddressSectionProps {
  address: OrderWithItems['addresses'];
}

export default function OrderDetailAddressSection({ address }: OrderDetailAddressSectionProps) {
  if (!address) {
    return null;
  }

  const district = address.area_name ? address.area_name.split(',')[0].trim() : undefined;
  const cleanedStreet = cleanStreetAddress(
    address.street_address || '',
    address.city || '',
    address.province || '',
    address.postal_code || '',
    district,
  );

  const isDistrictRedundant =
    district &&
    (district.toLowerCase() === address.city?.toLowerCase() ||
      district.toLowerCase() === `kecamatan ${address.city?.toLowerCase()}`);
  const displayDistrict = district && !isDistrictRedundant ? formatLevel3Display(district) : '';

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
            {cleanedStreet}
          </Text>
          {displayDistrict ? (
            <Text fontSize="$3" color="$colorSubtle">
              {displayDistrict}
            </Text>
          ) : null}
          <Text fontSize="$3" color="$colorSubtle">
            {address.city}, {address.province} {address.postal_code}
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
