import { YStack, XStack, Text, Card, Button, styled } from 'tamagui';
import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import type { Address } from '@/types/address';
import { PRESS_OPACITY } from '@/constants/address';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import { formatAddress } from '@/utils/address';

export interface AddressCardProps {
  address: Address;
  isDefault?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  badgeText?: string | null;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
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
  accessibilityActions,
  onAccessibilityAction,
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
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      pressStyle={{ opacity: PRESS_OPACITY }}>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
          <YStack flex={1} minWidth={0} gap="$1">
            <Text fontSize="$4" fontWeight="700" color="$color">
              {address.receiver_name}
            </Text>
            <Text fontSize="$3" color="$colorSubtle">
              {address.phone_number}
            </Text>
          </YStack>

          {onEdit && (
            <Button
              minHeight={MIN_TOUCH_TARGET}
              minWidth={MIN_TOUCH_TARGET}
              backgroundColor="$colorTransparent"
              color="$primary"
              fontWeight="600"
              fontSize="$3"
              p={0}
              role="button"
              aria-label={`Ubah alamat ${address.receiver_name}`}
              pressStyle={{ opacity: 0.8 }}
              onPress={event => {
                event?.stopPropagation?.();
                onEdit();
              }}>
              Ubah
            </Button>
          )}
        </XStack>

        <Text fontSize="$3" color="$colorSubtle">
          {formattedAddress}
        </Text>

        {address.address_note ? (
          <Text fontSize="$3" color="$colorSubtle" fontStyle="italic">
            Catatan: {address.address_note}
          </Text>
        ) : null}

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
