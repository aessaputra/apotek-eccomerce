import { YStack, Text, XStack } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import type { MapCoords } from './MapPinSheet';

export interface MapPinTriggerProps {
  value?: MapCoords | null;
  disabled?: boolean;
  onPress: () => void;
}

function MapPinTrigger({ value, disabled = false, onPress }: MapPinTriggerProps) {
  const hasCoords = value != null;
  const coordLabel = hasCoords
    ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
    : 'Pilih Lokasi di Peta';

  return (
    <YStack gap="$1">
      <Text fontSize="$2" color="$colorPress" marginBottom="$1.5" fontWeight="500">
        Titik Lokasi (GPS)
      </Text>

      <YStack
        backgroundColor="$background"
        borderWidth={1.5}
        borderColor="$surfaceBorder"
        borderRadius="$4"
        paddingHorizontal="$4"
        paddingVertical="$3"
        minHeight={56}
        justifyContent="center"
        opacity={disabled ? 0.5 : 1}
        onPress={disabled ? undefined : onPress}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text fontSize="$4" color={hasCoords ? '$color' : '$colorMuted'} numberOfLines={1}>
              {coordLabel}
            </Text>
          </YStack>
          <ChevronRight size={20} color="$colorMuted" />
        </XStack>
      </YStack>

      <Text fontSize="$2" color="$colorMuted" marginLeft="$1">
        Opsional — diperlukan untuk kurir instan (Gojek, Grab, dll)
      </Text>
    </YStack>
  );
}

export default MapPinTrigger;
