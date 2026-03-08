import { forwardRef, useState } from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { FORM_FIELD } from '@/constants/ui';
import { XCircleIcon } from '@/components/icons';

export interface FormInputProps extends Omit<RNTextInputProps, 'style'> {
  /** Label untuk input field */
  label?: string;
  /** Apakah field required (menampilkan asterisk) */
  required?: boolean;
  /** Error message untuk ditampilkan di bawah input */
  error?: string | null;
  /** Apakah input disabled */
  disabled?: boolean;
  /** Callback saat value berubah */
  onChangeText?: (text: string) => void;
  /** Callback saat focus */
  onFocus?: () => void;
  /** Callback saat blur */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Apakah multiline input */
  multiline?: boolean;
  /** Jumlah baris untuk multiline (default: 3) */
  numberOfLines?: number;
  /** Minimum height untuk multiline input */
  minHeight?: number;
}

/**
 * Reusable FormInput component dengan built-in label, error handling, dan styling.
 * Mengikuti design system apotek dengan focus states yang jelas dan inline error messages.
 * Konsisten dengan EmailInput dan PasswordInput components.
 *
 * @example
 * ```tsx
 * <FormInput
 *   label="Nama Penerima"
 *   required
 *   value={name}
 *   onChangeText={setName}
 *   error={nameError}
 *   placeholder="Masukkan nama"
 *   autoCapitalize="words"
 * />
 * ```
 */
const FormInput = forwardRef<RNTextInput, FormInputProps>(
  (
    {
      label,
      required = false,
      error,
      disabled = false,
      value,
      onChangeText,
      onFocus,
      onBlur,
      placeholder,
      accessibilityLabel,
      accessibilityHint,
      multiline = false,
      numberOfLines = 3,
      minHeight,
      keyboardType = 'default',
      autoCapitalize = 'none',
      autoCorrect = false,
      returnKeyType,
      onSubmitEditing,
      editable = true,
      ...restProps
    },
    ref,
  ) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const placeholderColor = getThemeColor(theme, 'placeholderColor');
    const textColor = getThemeColor(theme, 'color');
    const surfaceColor = getThemeColor(theme, 'background');
    const borderColorValue = error
      ? getThemeColor(theme, 'danger')
      : isFocused
        ? getThemeColor(theme, 'primary')
        : getThemeColor(theme, 'borderColor');

    const inputHeight = multiline
      ? minHeight || FORM_FIELD.MULTILINE_MIN_HEIGHT
      : FORM_FIELD.HEIGHT;
    const textAlignVertical = multiline ? 'top' : 'center';

    return (
      <YStack>
        {label && (
          <Text fontSize="$3" color="$colorPress" marginBottom="$1.5" fontWeight="500">
            {label}
            {required && <Text color="$danger"> *</Text>}
          </Text>
        )}

        <XStack
          style={{
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            paddingHorizontal: FORM_FIELD.HORIZONTAL_PADDING,
            paddingVertical: multiline ? 16 : 0,
            overflow: 'hidden',
            backgroundColor: surfaceColor,
            borderWidth:
              error || isFocused ? FORM_FIELD.ACTIVE_BORDER_WIDTH : FORM_FIELD.BORDER_WIDTH,
            borderRadius: FORM_FIELD.BORDER_RADIUS,
            borderColor: borderColorValue,
            height: multiline ? undefined : inputHeight,
            minHeight: multiline ? inputHeight : undefined,
            opacity: disabled || !editable ? 0.6 : 1,
          }}>
          <RNTextInput
            ref={ref}
            style={{
              flex: 1,
              height: multiline ? undefined : '100%',
              fontSize: 16,
              fontFamily: theme.bodyFont?.val || 'System',
              color: textColor,
              padding: 0,
              margin: 0,
            }}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            editable={editable && !disabled}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : undefined}
            textAlignVertical={textAlignVertical}
            underlineColorAndroid="transparent"
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            accessibilityLabel={accessibilityLabel || label || placeholder}
            accessibilityHint={accessibilityHint}
            accessibilityLiveRegion={error ? 'polite' : undefined}
            {...restProps}
          />
        </XStack>

        {error && (
          <XStack gap="$1" alignItems="center" marginTop="$1">
            <XCircleIcon size={14} color={getThemeColor(theme, 'danger')} />
            <Text fontSize="$2" color="$danger">
              {error}
            </Text>
          </XStack>
        )}
      </YStack>
    );
  },
);

FormInput.displayName = 'FormInput';

export default FormInput;
