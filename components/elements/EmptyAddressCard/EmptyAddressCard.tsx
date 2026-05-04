import React from 'react';
import { Button as TamaguiButton, Card, Text, YStack } from 'tamagui';
import { MapPinIcon } from '@/components/icons';

export interface EmptyAddressCardProps {
  onPress: () => void;
}

export const EmptyAddressCard: React.FC<EmptyAddressCardProps> = ({ onPress }) => {
  return (
    <Card
      borderRadius="$4"
      borderWidth={1}
      borderStyle="dashed"
      borderColor="$surfaceBorder"
      backgroundColor="$surface"
      padding="$4"
      width="100%">
      <YStack gap="$3" alignItems="center">
        <MapPinIcon size={28} color="$primary" />
        <Text color="$color" fontWeight="600" textAlign="center">
          Belum ada alamat
        </Text>
        <TamaguiButton
          backgroundColor="$primary"
          color="$onPrimary"
          borderRadius="$3"
          minHeight={44}
          width="100%"
          onPress={onPress}
          aria-label="Tambah alamat pengiriman">
          Tambah Alamat
        </TamaguiButton>
      </YStack>
    </Card>
  );
};

export default EmptyAddressCard;
