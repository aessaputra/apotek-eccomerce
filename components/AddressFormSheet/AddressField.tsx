import { useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import * as Haptics from 'expo-haptics';
import AddressEditSheet from './AddressEditSheet';
import { ChevronRightIcon } from '@/components/icons';
import { getThemeColor } from '@/utils/theme';

export interface AddressFieldProps {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSave: (value: string) => string | null;
}

function AddressField({
  label,
  value,
  placeholder,
  disabled = false,
  required = false,
  error,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  onSave,
}: AddressFieldProps) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`Edit ${label}. Nilai saat ini: ${value || 'belum diisi'}`}
        accessibilityHint={error ? `Error: ${error}` : `Buka sheet untuk mengubah ${label}`}>
        <Card
          padding="$3"
          backgroundColor="$background"
          borderWidth={1}
          borderColor={error ? '$danger' : '$surfaceBorder'}
          borderRadius="$3"
          elevation={0}>
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <YStack flex={1} gap="$1">
              <Text fontSize="$3" color="$colorPress" fontWeight="500">
                {label}
                {required ? ' *' : ''}
              </Text>
              <Text fontSize="$4" color={value ? '$color' : '$colorPress'}>
                {value || placeholder}
              </Text>
              {error ? (
                <Text fontSize="$2" color="$danger">
                  {error}
                </Text>
              ) : null}
            </YStack>
            <ChevronRightIcon size={18} color={getThemeColor(theme, 'colorPress')} />
          </XStack>
        </Card>
      </Pressable>

      {open ? (
        <AddressEditSheet
          open={open}
          onOpenChange={setOpen}
          title={label}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onSave={onSave}
        />
      ) : null}
    </>
  );
}

export default AddressField;
