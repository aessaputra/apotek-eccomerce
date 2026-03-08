import { Pressable } from 'react-native';
import { type ComponentType, useCallback } from 'react';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { getThemeColor } from '@/utils/theme';
import type { Address } from '@/types/address';
import { ICON_SIZES, MIN_TOUCH_TARGET } from '@/constants/ui';
import { DeleteIcon, EditIcon, StarIcon, type IconProps } from '@/components/icons';

export interface AddressCardProps {
  address: Address;
  isDefault?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  showActions?: boolean;
}

interface ActionIconButtonProps {
  onPress: () => void;
  icon: ComponentType<IconProps>;
  iconColor: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}

const ACTION_BUTTON_STYLE = {
  minWidth: MIN_TOUCH_TARGET,
  minHeight: MIN_TOUCH_TARGET,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

function ActionIconButton({
  onPress,
  icon: Icon,
  iconColor,
  accessibilityLabel,
  accessibilityHint,
}: ActionIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={ACTION_BUTTON_STYLE}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <Icon size={ICON_SIZES.BUTTON} color={iconColor} />
    </Pressable>
  );
}

/**
 * AddressCard component untuk menampilkan alamat pengiriman
 * Mengikuti mobile design principles: touch target minimal 44px, clear visual hierarchy
 */
export default function AddressCard({
  address,
  isDefault = false,
  onPress,
  onEdit,
  onDelete,
  onSetDefault,
  showActions = false,
}: AddressCardProps) {
  const theme = useTheme();
  const primaryColor = getThemeColor(theme, 'primary');
  const colorPress = getThemeColor(theme, 'colorPress');
  const dangerColor = getThemeColor(theme, 'danger');

  const formattedAddress = [
    address.street_address,
    address.city,
    address.province,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  const handleSetDefaultPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetDefault?.();
  }, [onSetDefault]);

  const handleEditPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit?.();
  }, [onEdit]);

  const handleDeletePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete?.();
  }, [onDelete]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={onPress ? `Alamat ${address.receiver_name}` : undefined}
      accessibilityHint={onPress ? 'Tekan untuk melihat detail alamat' : undefined}>
      <Card
        padding="$4"
        marginBottom="$3"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor={isDefault ? '$primary' : '$surfaceBorder'}
        borderRadius="$4"
        elevation={0}>
        <YStack gap="$2">
          {/* Header dengan nama penerima dan badge default */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$1">
              <XStack gap="$2" alignItems="center">
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {address.receiver_name}
                </Text>
                {isDefault && (
                  <XStack
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                    backgroundColor="$primary"
                    alignItems="center"
                    accessibilityLabel="Alamat default"
                    accessibilityRole="text">
                    <Text fontSize="$1" fontWeight="600" color="$white">
                      Default
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text fontSize="$3" color="$colorPress">
                {address.phone_number}
              </Text>
            </YStack>
            {showActions && (
              <XStack gap="$2">
                {!isDefault && onSetDefault && (
                  <ActionIconButton
                    onPress={handleSetDefaultPress}
                    icon={StarIcon}
                    iconColor={primaryColor}
                    accessibilityLabel="Jadikan alamat default"
                    accessibilityHint="Mengatur alamat ini sebagai alamat pengiriman default"
                  />
                )}
                {onEdit && (
                  <ActionIconButton
                    onPress={handleEditPress}
                    icon={EditIcon}
                    iconColor={colorPress}
                    accessibilityLabel="Edit alamat"
                    accessibilityHint="Mengedit alamat pengiriman"
                  />
                )}
                {onDelete && (
                  <ActionIconButton
                    onPress={handleDeletePress}
                    icon={DeleteIcon}
                    iconColor={dangerColor}
                    accessibilityLabel="Hapus alamat"
                    accessibilityHint="Menghapus alamat pengiriman ini"
                  />
                )}
              </XStack>
            )}
          </XStack>

          {/* Alamat lengkap */}
          <Text fontSize="$3" color="$color" lineHeight="$4">
            {formattedAddress}
          </Text>
        </YStack>
      </Card>
    </Pressable>
  );
}
