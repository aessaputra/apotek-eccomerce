import { useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { XStack, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

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
        accessibilityLabel={placeholder || 'Password'}
        testID="password-input"
      />
      <Pressable
        onPress={() => setIsVisible(!isVisible)}
        style={{ padding: 4, marginLeft: 8 }}
        disabled={disabled}
        accessibilityLabel={isVisible ? 'Sembunyikan password' : 'Tampilkan password'}
        accessibilityRole="button">
        <FontAwesome5
          name={isVisible ? 'eye-slash' : 'eye'}
          size={18}
          color={getThemeColor(theme, 'colorPress')}
        />
      </Pressable>
    </XStack>
  );
}

export default PasswordInput;
