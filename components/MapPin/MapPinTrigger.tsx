import { YStack, Text, XStack } from 'tamagui';
import { ChevronRight, CheckCircle, AlertCircle, MapPin } from '@tamagui/lucide-icons';
import type { MapCoords } from './MapPinSheet';

export interface MapPinTriggerProps {
  value?: MapCoords | null;
  disabled?: boolean;
  onPress: () => void;
  confirmed?: boolean;
  requireConfirmation?: boolean;
}

function MapPinTrigger({
  value,
  disabled = false,
  onPress,
  confirmed = false,
  requireConfirmation = true,
}: MapPinTriggerProps) {
  const hasCoords = value != null;
  const coordLabel = !hasCoords
    ? 'Pilih lokasi di peta'
    : confirmed
      ? 'Lokasi sudah dikonfirmasi'
      : 'Lokasi sudah dipilih, menunggu konfirmasi';
  const coordSubLabel = hasCoords
    ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
    : null;

  const getBorderColor = () => {
    if (!requireConfirmation) return '$surfaceBorder';
    if (confirmed) return '$success';
    if (hasCoords) return '$warning';
    return '$surfaceBorder';
  };

  const getStatusIndicator = () => {
    if (!requireConfirmation) return null;

    if (!hasCoords) {
      return (
        <XStack gap="$1" alignItems="center">
          <AlertCircle size={14} color="$warning" />
          <Text fontSize="$2" color="$warning" fontWeight="500">
            Wajib dikonfirmasi
          </Text>
        </XStack>
      );
    }

    if (confirmed) {
      return (
        <XStack gap="$1" alignItems="center">
          <CheckCircle size={14} color="$success" />
          <Text fontSize="$2" color="$success" fontWeight="500">
            Lokasi dikonfirmasi
          </Text>
        </XStack>
      );
    }

    return (
      <XStack gap="$1" alignItems="center">
        <AlertCircle size={14} color="$warning" />
        <Text fontSize="$2" color="$warning" fontWeight="500">
          Perlu konfirmasi ulang
        </Text>
      </XStack>
    );
  };

  const statusIndicator = getStatusIndicator();

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$1.5">
        <XStack gap="$1.5" alignItems="center">
          <MapPin size={16} color="$color" />
          <Text fontSize="$3" color="$color" fontWeight="500">
            Titik Lokasi (GPS)
          </Text>
        </XStack>
        {statusIndicator}
      </XStack>

      <YStack
        backgroundColor="$background"
        borderWidth={1.5}
        borderColor={getBorderColor()}
        borderRadius="$4"
        paddingHorizontal="$4"
        paddingVertical="$3"
        minHeight={56}
        justifyContent="center"
        opacity={disabled ? 0.5 : 1}
        pressStyle={{ opacity: 0.9, scale: 0.995 }}
        animation="quick"
        onPress={disabled ? undefined : onPress}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text
              fontSize="$4"
              color={hasCoords ? '$color' : '$colorMuted'}
              fontWeight={hasCoords ? '500' : '400'}
              numberOfLines={1}>
              {coordLabel}
            </Text>
            {coordSubLabel ? (
              <Text fontSize="$2" color="$colorMuted" numberOfLines={1} marginTop="$1">
                {coordSubLabel}
              </Text>
            ) : null}
          </YStack>
          <ChevronRight
            size={20}
            color={confirmed ? '$success' : hasCoords ? '$warning' : '$colorMuted'}
          />
        </XStack>
      </YStack>

      <Text fontSize="$2" color="$colorMuted" marginTop="$1">
        {requireConfirmation
          ? 'Konfirmasi titik lokasi untuk akurasi pengiriman'
          : 'Opsional untuk kurir instan (Gojek, Grab, dll)'}
      </Text>
    </YStack>
  );
}

export default MapPinTrigger;
