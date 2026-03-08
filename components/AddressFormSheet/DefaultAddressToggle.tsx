import { Pressable } from 'react-native';
import { YStack, XStack, Text, Card, Checkbox, useTheme } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { getThemeColor } from '@/utils/theme';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import { CheckIcon } from '@/components/icons';

export interface DefaultAddressToggleProps {
  /** Whether the address is set as default */
  isDefault: boolean;
  /** Whether the form is in saving state */
  isSaving: boolean;
  /** Callback when toggle changes */
  onToggle: (value: boolean) => void;
}

/**
 * Default Address Toggle Component
 * A card-based checkbox for setting an address as default
 */
function DefaultAddressToggle({ isDefault, isSaving, onToggle }: DefaultAddressToggleProps) {
  const theme = useTheme();

  const handlePress = () => {
    if (!isSaving) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggle(!isDefault);
    }
  };

  return (
    <Card
      padding="$4"
      marginBottom="$4"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor={isDefault ? '$primary' : '$surfaceBorder'}
      borderRadius="$4"
      elevation={0}>
      <Pressable
        onPress={handlePress}
        disabled={isSaving}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDefault }}
        accessibilityLabel="Jadikan alamat default"
        accessibilityHint="Mengatur alamat ini sebagai alamat pengiriman default yang akan digunakan otomatis saat checkout">
        <XStack gap="$3" alignItems="center">
          <Checkbox
            checked={isDefault}
            onCheckedChange={checked => onToggle(checked as boolean)}
            size="$5"
            disabled={isSaving}
            borderColor={isDefault ? '$primary' : '$borderColor'}
            backgroundColor={isDefault ? '$primary' : '$background'}
            borderWidth={isDefault ? 2 : 1.5}
            accessibilityLabel="Jadikan alamat default">
            <Checkbox.Indicator>
              <CheckIcon size={16} color={getThemeColor(theme, 'white')} />
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
      </Pressable>
    </Card>
  );
}

export default DefaultAddressToggle;
