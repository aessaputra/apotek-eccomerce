import { YStack, Text, XStack } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';

export interface AreaPickerTriggerProps {
  areaName: string;
  areaId: string;
  error?: string | null;
  disabled?: boolean;
  onPress: () => void;
}

function formatSelectionLine(value: string): string {
  return value
    .trim()
    .replace(/^KABUPATEN\s+/i, 'KAB. ')
    .replace(/^KAB\s+/i, 'KAB. ')
    .replace(/^KOTA\s+/i, 'KOTA ')
    .toUpperCase();
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
  const selectionLines = areaName
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(formatSelectionLine);

  const getBorderColor = () => {
    if (error) return '$danger';
    return '$surfaceBorder';
  };

  return (
    <YStack gap="$1">
      {!hasFullSelection && (
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$1.5">
          <Text fontSize="$3" color="$color" fontWeight="500">
            Provinsi, Kota, Kecamatan, Kode Pos
            <Text color="$danger"> *</Text>
          </Text>
        </XStack>
      )}

      <YStack
        backgroundColor="$background"
        borderWidth={hasFullSelection ? 0 : 1.5}
        borderBottomWidth={hasFullSelection ? 1 : 1.5}
        borderColor={getBorderColor()}
        borderRadius={hasFullSelection ? 0 : '$4'}
        paddingHorizontal={hasFullSelection ? '$0.5' : '$4'}
        paddingTop={hasFullSelection ? '$1' : '$3'}
        paddingBottom={hasFullSelection ? '$3' : '$3'}
        minHeight={hasFullSelection ? 88 : 56}
        justifyContent="center"
        opacity={disabled ? 0.5 : 1}
        pressStyle={{ opacity: 0.9, scale: 0.995 }}
        animation="quick"
        onPress={disabled ? undefined : onPress}>
        <XStack
          justifyContent="space-between"
          alignItems={hasFullSelection ? 'flex-start' : 'center'}>
          <YStack flex={1} gap="$1">
            {hasFullSelection ? (
              <>
                <Text fontSize="$3" color="$colorMuted" fontWeight="400">
                  Provinsi, Kota, Kecamatan, Kode Pos
                </Text>
                <YStack gap="$1">
                  {selectionLines.map(line => (
                    <Text
                      key={line}
                      fontSize="$5"
                      lineHeight="$1"
                      color="$color"
                      fontWeight="400"
                      textTransform="uppercase"
                      numberOfLines={1}>
                      {line}
                    </Text>
                  ))}
                </YStack>
              </>
            ) : (
              <Text fontSize="$4" color="$colorMuted" fontWeight="400" numberOfLines={1}>
                {hasPartialSelection
                  ? 'Area tersimpan, silakan pilih ulang untuk menyegarkan detail'
                  : 'Pilih provinsi, kota, kecamatan, kode pos'}
              </Text>
            )}
          </YStack>
          <YStack paddingTop={hasFullSelection ? '$4' : '$0'} paddingLeft="$2">
            <ChevronRight size={20} color="$colorMuted" />
          </YStack>
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
