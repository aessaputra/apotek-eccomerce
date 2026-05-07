import { useId } from 'react';
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
  const selectionSummary = selectionLines.join(', ');
  const accessibleLabel = hasFullSelection
    ? `Area pengiriman ${selectionSummary}. Ketuk untuk mengubah area pengiriman`
    : 'Pilih area pengiriman';

  const errorId = useId();
  const helperId = useId();

  const getBorderColor = () => {
    if (error) return '$danger';
    return '$surfaceBorder';
  };

  return (
    <YStack gap="$1">
      <YStack
        role="button"
        aria-label={accessibleLabel}
        aria-haspopup="dialog"
        aria-expanded={false}
        aria-disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperId}
        accessibilityValue={hasFullSelection ? { text: selectionSummary } : undefined}
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
              <YStack gap="$1">
                {selectionLines.map(line => (
                  <Text
                    key={line}
                    fontSize="$5"
                    lineHeight="$5"
                    color="$color"
                    fontWeight="400"
                    textTransform="uppercase">
                    {line}
                  </Text>
                ))}
              </YStack>
            ) : (
              <Text fontSize="$4" color="$colorMuted" fontWeight="400">
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

      {error ? (
        <Text id={errorId} fontSize="$2" color="$danger" marginTop="$1">
          {error}
        </Text>
      ) : (
        <Text id={helperId} fontSize="$2" color="$colorMuted" marginTop="$1">
          Pilih provinsi, kota, kecamatan, dan kode pos untuk pengiriman
        </Text>
      )}
    </YStack>
  );
}

export default AreaPickerTrigger;
