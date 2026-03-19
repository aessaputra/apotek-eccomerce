import { useState } from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import * as Haptics from 'expo-haptics';
import AddressEditSheet from './AddressEditSheet';
import { ChevronRightIcon } from '@/components/icons';

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

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  return (
    <>
      <Card
        onPress={handleOpen}
        disabled={disabled}
        role="button"
        accessibilityState={{ disabled }}
        aria-label={`Edit ${label}. Nilai saat ini: ${value || 'belum diisi'}`}
        aria-describedby={error ? `Error: ${error}` : `Buka sheet untuk mengubah ${label}`}
        padding="$3"
        backgroundColor="$background"
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        borderRadius="$3"
        elevation={0}
        minHeight={48}
        pressStyle={{ opacity: 0.8 }}>
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
          <ChevronRightIcon size={18} color="$colorPress" />
        </XStack>
      </Card>

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
