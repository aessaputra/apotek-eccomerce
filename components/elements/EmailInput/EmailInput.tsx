import { useState } from 'react';
import { TextInput } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export interface EmailInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad';
  editable?: boolean;
  accessibilityLabel?: string;
}

/**
 * Email input dengan enhanced styling dan focus states.
 * Menggunakan Tamagui XStack untuk layout dan styling, TextInput native untuk input functionality.
 * Konsisten dengan PasswordInput component dan project guidelines (Tamagui only, no StyleSheet).
 */
function EmailInput({
  value,
  onChangeText,
  placeholder,
  error,
  disabled,
  onFocus,
  onBlur,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'email-address',
  editable = true,
  accessibilityLabel,
}: EmailInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');
  const textColor = getThemeColor(theme, 'color', '#111827');
  const surfaceColor = getThemeColor(theme, 'surface', '#FFFFFF');
  const borderColorValue = error
    ? getThemeColor(theme, 'danger', '#DC2626')
    : isFocused
      ? getThemeColor(theme, 'primary', '#16A34A')
      : getThemeColor(theme, 'surfaceBorder', '#E5E7EB');

  return (
    <XStack
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        overflow: 'hidden',
        backgroundColor: surfaceColor,
        borderWidth: isFocused ? 2 : 1.5,
        borderRadius: 14,
        borderColor: borderColorValue,
        height: 56,
        opacity: disabled ? 0.6 : 1,
      }}>
      <TextInput
        style={{
          flex: 1,
          height: '100%',
          padding: 0,
          margin: 0,
          fontSize: 16,
          fontFamily: theme.bodyFont?.val || 'System',
          color: textColor,
        }}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        editable={editable && !disabled}
        underlineColorAndroid="transparent"
        textAlignVertical="center"
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        accessibilityLabel={accessibilityLabel || placeholder || 'Email'}
        testID="email-input"
      />
    </XStack>
  );
}

export default EmailInput;
