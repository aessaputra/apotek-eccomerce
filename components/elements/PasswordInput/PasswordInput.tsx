import { useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { FORM_FIELD } from '@/constants/ui';
import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { fonts } from '@/utils/fonts';

export interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Password input dengan toggle visibility dan enhanced styling.
 * Mengikuti design system apotek dengan focus states yang jelas.
 * Menggunakan Tamagui XStack untuk layout dan styling, TextInput native untuk input functionality.
 * Konsisten dengan EmailInput component dan project guidelines (Tamagui only, no StyleSheet).
 */
function PasswordInput({
  value,
  onChangeText,
  placeholder,
  error,
  disabled,
  onFocus,
  onBlur,
}: PasswordInputProps) {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
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
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
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
        aria-label={placeholder || 'Password'}
        testID="password-input"
      />
      <Pressable
        onPress={() => setIsVisible(!isVisible)}
        style={{
          padding: FORM_FIELD.ICON_BUTTON_PADDING,
          marginLeft: FORM_FIELD.ICON_BUTTON_MARGIN_LEFT,
        }}
        disabled={disabled}
        aria-label={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
        role="button">
        {isVisible ? (
          <EyeOffIcon size={18} color={getThemeColor(theme, 'colorPress')} />
        ) : (
          <EyeIcon size={18} color={getThemeColor(theme, 'colorPress')} />
        )}
      </Pressable>
    </XStack>
  );
}

export default PasswordInput;
