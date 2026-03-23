import { YStack, Text, XStack } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';

export interface AreaPickerTriggerProps {
  areaName: string;
  areaId: string;
  error?: string | null;
  disabled?: boolean;
  onPress: () => void;
}

function AreaPickerTrigger({
  areaName,
  areaId,
  error,
  disabled = false,
  onPress,
}: AreaPickerTriggerProps) {
  const hasFullSelection = !!areaId && !!areaName;
  const hasPartialSelection = !!areaId && !areaName;

  return (
    <YStack gap="$1">
      <Text fontSize="$2" color="$colorPress" marginBottom="$1.5" fontWeight="500">
        Area Pengiriman
        <Text color="$error"> *</Text>
      </Text>

      <YStack
        backgroundColor="$background"
        borderWidth={1.5}
        borderColor={error ? '$error' : '$surfaceBorder'}
        borderRadius="$4"
        paddingHorizontal="$4"
        paddingVertical="$3"
        minHeight={56}
        justifyContent="center"
        opacity={disabled ? 0.5 : 1}
        onPress={disabled ? undefined : onPress}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text
              fontSize="$4"
              color={hasFullSelection ? '$color' : '$colorMuted'}
              numberOfLines={1}>
              {hasFullSelection
                ? areaName
                : hasPartialSelection
                  ? 'Area terpilih (silakan pilih ulang untuk melihat nama)'
                  : 'Pilih area pengiriman'}
            </Text>
          </YStack>
          <ChevronRight size={20} color="$colorMuted" />
        </XStack>
      </YStack>

      {error && (
        <Text fontSize="$2" color="$error" marginLeft="$1">
          {error}
        </Text>
      )}

      <Text fontSize="$2" color="$colorMuted" marginLeft="$1">
        Wajib dipilih untuk kalkulasi ongkir
      </Text>
    </YStack>
  );
}

export default AreaPickerTrigger;
