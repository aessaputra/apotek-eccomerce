import { useEffect, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Sheet, YStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import FormInput from '@/components/elements/FormInput';
import { MIN_TOUCH_TARGET } from '@/constants/ui';

export interface AddressEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSave: (value: string) => string | null;
}

function AddressEditSheet({
  open,
  onOpenChange,
  title,
  value,
  placeholder,
  disabled = false,
  required = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  onSave,
}: AddressEditSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput | null>(null);
  const [draftValue, setDraftValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftValue(value);
      setError(null);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, [open]);

  const handleSave = () => {
    if (disabled) return;

    const validationError = onSave(draftValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      moveOnKeyboardChange
      snapPoints={multiline ? [88] : [78]}
      animation="medium">
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Handle />
      <Sheet.Frame backgroundColor="$surface" borderTopLeftRadius="$4" borderTopRightRadius="$4">
        <YStack flex={1}>
          <Sheet.ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 20,
              flexGrow: 1,
            }}>
            <YStack gap="$3">
              <Text fontSize="$6" fontWeight="700" color="$color" fontFamily="$heading">
                {title}
              </Text>

              <FormInput
                ref={inputRef}
                required={required}
                value={draftValue}
                onChangeText={text => {
                  setDraftValue(text);
                  if (error) {
                    setError(null);
                  }
                }}
                error={error}
                placeholder={placeholder}
                multiline={multiline}
                numberOfLines={multiline ? 3 : undefined}
                minHeight={multiline ? 100 : undefined}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={!disabled}
                returnKeyType={multiline ? 'default' : 'done'}
                onSubmitEditing={multiline ? undefined : handleSave}
                accessibilityLabel={`Input ${title}`}
                accessibilityHint={`Masukkan nilai untuk ${title}`}
              />
            </YStack>
          </Sheet.ScrollView>

          <YStack padding="$4" paddingTop="$2" paddingBottom={Math.max(insets.bottom, 12)}>
            <Button
              title="Simpan"
              onPress={handleSave}
              disabled={disabled}
              backgroundColor="$primary"
              borderRadius="$3"
              minHeight={MIN_TOUCH_TARGET}
              titleStyle={{ fontSize: 16, fontWeight: '600' }}
              accessibilityLabel={`Simpan ${title}`}
              accessibilityHint={`Menyimpan perubahan ${title}`}
            />
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default AddressEditSheet;
