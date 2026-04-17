import { YStack, XStack, Text, Card, styled } from 'tamagui';
import type { Address } from '@/types/address';
import { DEFAULT_ACCENT_BORDER_WIDTH, PRESS_OPACITY } from '@/constants/address';
import { formatAddress } from '@/utils/address';

export interface AddressCardProps {
  address: Address;
  isDefault?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  badgeText?: string | null;
}

const StyledCard = styled(Card, {
  p: '$4',
  mb: '$3',
  bw: 1,
  br: '$5',
  animation: 'quick',

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
    selected: {
      true: {
        borderWidth: 2,
        borderColor: '$primary',
      },
      false: {},
    },
  } as const,
});

export default function AddressCard({
  address,
  isDefault = false,
  selected = false,
  onPress,
  onEdit,
  badgeText,
}: AddressCardProps) {
  const formattedAddress = formatAddress(address);

  const displayBadge = badgeText ?? (isDefault ? 'Utama' : null);

  return (
    <StyledCard
      isDefault={isDefault}
      selected={selected}
      onPress={onPress}
      disabled={!onPress}
      role={onPress ? 'button' : 'none'}
      aria-label={onPress ? `Alamat ${address.receiver_name}` : undefined}
      pressStyle={{ opacity: PRESS_OPACITY }}>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
          <YStack flex={1} minWidth={0} gap="$1">
            <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={1}>
              {address.receiver_name}
            </Text>
            <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
              {address.phone_number}
            </Text>
          </YStack>

          {onEdit && (
            <Text
              fontSize="$3"
              color="$primary"
              fontWeight="600"
              onPress={e => {
                e.stopPropagation();
                onEdit();
              }}>
              Ubah
            </Text>
          )}
        </XStack>

        <Text fontSize="$3" color="$colorSubtle" numberOfLines={3}>
          {formattedAddress}
        </Text>

        {displayBadge && (
          <XStack
            alignSelf="flex-start"
            borderWidth={1}
            borderColor="$primary"
            borderRadius="$2"
            px="$2"
            py="$0.5">
            <Text fontSize="$2" color="$primary" fontWeight="600">
              {displayBadge}
            </Text>
          </XStack>
        )}
      </YStack>
    </StyledCard>
  );
}
