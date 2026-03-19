import { useState } from 'react';
import { TextInput } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { FORM_FIELD } from '@/constants/ui';
import { fonts } from '@/utils/fonts';

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
  'aria-label'?: string;
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
  'aria-label': ariaLabel,
}: EmailInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const placeholderColor = getThemeColor(theme, 'placeholderColor');
  const textColor = getThemeColor(theme, 'color');
  const surfaceColor = getThemeColor(theme, 'surface');
  const borderColorValue = error
    ? getThemeColor(theme, 'danger')
    : isFocused
      ? getThemeColor(theme, 'primary')
      : getThemeColor(theme, 'surfaceBorder');

  return (
    <XStack
      alignItems="center"
      paddingHorizontal={FORM_FIELD.HORIZONTAL_PADDING}
      overflow="hidden"
      backgroundColor={surfaceColor}
      borderWidth={isFocused ? FORM_FIELD.ACTIVE_BORDER_WIDTH : FORM_FIELD.BORDER_WIDTH}
      borderRadius={FORM_FIELD.BORDER_RADIUS}
      borderColor={borderColorValue}
      height={FORM_FIELD.HEIGHT}
      opacity={disabled ? 0.6 : 1}>
      <TextInput
        style={{
          flex: 1,
          height: '100%',
          padding: 0,
          margin: 0,
          fontSize: 16,
          fontFamily: theme.bodyFont?.val || fonts.poppins.regular,
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
        aria-label={ariaLabel || placeholder || 'Email'}
        testID="email-input"
      />
    </XStack>
  );
}

export default EmailInput;
