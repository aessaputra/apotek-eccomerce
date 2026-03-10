import { YStack, XStack, Text, Card, Checkbox, styled } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { CheckIcon } from '@/components/icons';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import { PRESS_OPACITY } from '@/constants/address';

export interface DefaultAddressToggleProps {
  isDefault: boolean;
  isSaving: boolean;
  onToggle: (value: boolean) => void;
}

const StyledCard = styled(Card, {
  p: '$4',
  mb: '$4',
  bw: 1,
  br: '$5',
  elevation: 1,

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
  } as const,
});

function DefaultAddressToggle({ isDefault, isSaving, onToggle }: DefaultAddressToggleProps) {
  const handlePress = () => {
    if (!isSaving) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggle(!isDefault);
    }
  };

  return (
    <StyledCard
      isDefault={isDefault}
      onPress={handlePress}
      disabled={isSaving}
      minHeight={MIN_TOUCH_TARGET}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isDefault }}
      accessibilityLabel="Jadikan alamat default"
      accessibilityHint="Mengatur alamat ini sebagai alamat pengiriman default yang akan digunakan otomatis saat checkout"
      pressStyle={{ opacity: PRESS_OPACITY }}>
      <XStack gap="$3" alignItems="center">
        <Checkbox
          checked={isDefault}
          size="$5"
          disabled
          pointerEvents="none"
          borderColor={isDefault ? '$primary' : '$borderColor'}
          backgroundColor={isDefault ? '$primary' : '$background'}
          borderWidth={isDefault ? 2 : 1.5}>
          <Checkbox.Indicator>
            <CheckIcon size={16} color="$white" />
          </Checkbox.Indicator>
        </Checkbox>
        <YStack flex={1} gap="$1">
          <Text fontSize="$4" color="$color" fontWeight="600">
            Jadikan alamat default
          </Text>
          <Text fontSize="$3" color="$colorPress">
            Alamat ini akan digunakan secara otomatis saat checkout
          </Text>
        </YStack>
      </XStack>
    </StyledCard>
  );
}

export default DefaultAddressToggle;
