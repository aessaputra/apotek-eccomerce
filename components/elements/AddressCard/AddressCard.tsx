import { YStack, XStack, Text, Card, styled } from 'tamagui';
import type { Address } from '@/types/address';
import { DEFAULT_ACCENT_BORDER_WIDTH, PRESS_OPACITY } from '@/constants/address';

export interface AddressCardProps {
  address: Address;
  isDefault?: boolean;
  onPress?: () => void;
}

const StyledCard = styled(Card, {
  p: '$4',
  mb: '$3',
  bw: 1,
  br: '$5',
  elevation: 2,

  variants: {
    isDefault: {
      true: {
        backgroundColor: '$surface',
        borderColor: '$primary',
        borderLeftWidth: DEFAULT_ACCENT_BORDER_WIDTH,
        borderLeftColor: '$primary',
      },
      false: {
        backgroundColor: '$surface',
        borderColor: '$surfaceBorder',
      },
    },
  } as const,
});

const DefaultBadge = styled(XStack, {
  px: '$2',
  py: '$1',
  br: '$10',
  backgroundColor: '$primary',
  alignItems: 'center',
});

export default function AddressCard({ address, isDefault = false, onPress }: AddressCardProps) {
  const formattedAddress = [
    address.street_address,
    address.city,
    address.province,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <StyledCard
      isDefault={isDefault}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={onPress ? `Alamat ${address.receiver_name}` : undefined}
      accessibilityHint={onPress ? 'Tekan untuk melihat detail alamat' : undefined}
      pressStyle={{ opacity: PRESS_OPACITY }}>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <XStack gap="$2" alignItems="center">
              <Text fontSize="$5" fontWeight="700" color="$color">
                {address.receiver_name}
              </Text>
              {isDefault && (
                <DefaultBadge accessibilityLabel="Alamat default" accessibilityRole="text">
                  <Text fontSize="$1" fontWeight="600" color="$white">
                    Default
                  </Text>
                </DefaultBadge>
              )}
            </XStack>
            <Text fontSize="$3" fontWeight="500" color="$colorSubtle">
              {address.phone_number}
            </Text>
          </YStack>
        </XStack>

        <Text fontSize="$3" color="$colorPress" lineHeight="$5">
          {formattedAddress}
        </Text>
      </YStack>
    </StyledCard>
  );
}
