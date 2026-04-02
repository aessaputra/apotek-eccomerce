import { YStack, Text, XStack } from 'tamagui';
import { ChevronRight, CheckCircle } from '@tamagui/lucide-icons';

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

  const getBorderColor = () => {
    if (error) return '$danger';
    if (hasFullSelection) return '$success';
    return '$surfaceBorder';
  };

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$1.5">
        <Text fontSize="$3" color="$color" fontWeight="500">
          Provinsi, Kota, Kecamatan, Kode Pos
          <Text color="$danger"> *</Text>
        </Text>
        {hasFullSelection && (
          <XStack gap="$1" alignItems="center">
            <CheckCircle size={14} color="$success" />
            <Text fontSize="$2" color="$success" fontWeight="500">
              Terpilih
            </Text>
          </XStack>
        )}
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
          <YStack flex={1} gap="$1">
            <Text
              fontSize="$4"
              color={hasFullSelection ? '$color' : '$colorMuted'}
              fontWeight={hasFullSelection ? '500' : '400'}
              numberOfLines={1}>
              {hasFullSelection
                ? areaName
                : hasPartialSelection
                  ? 'Area tersimpan, silakan pilih ulang untuk menyegarkan detail'
                  : 'Pilih provinsi, kota, kecamatan, kode pos'}
            </Text>
          </YStack>
          <ChevronRight size={20} color={hasFullSelection ? '$success' : '$colorMuted'} />
        </XStack>
      </YStack>

      {error && (
        <Text fontSize="$2" color="$danger" marginTop="$1">
          {error}
        </Text>
      )}

      {!hasFullSelection && !error && (
        <Text fontSize="$2" color="$colorMuted" marginTop="$1">
          Menentukan area pengiriman yang dipakai Biteship
        </Text>
      )}
    </YStack>
  );
}

export default AreaPickerTrigger;
