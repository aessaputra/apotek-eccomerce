import { forwardRef, useState, useId } from 'react';
import { TextInput } from 'react-native';
import { Input, XStack, YStack, Text, styled, useTheme } from 'tamagui';
import { XCircleIcon } from '@/components/icons';
import { FORM_FIELD } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';
import { fonts } from '@/utils/fonts';

export interface FormInputProps {
  /** Label untuk input field */
  label?: string;
  /** Apakah field required (menampilkan asterisk) */
  required?: boolean;
  /** Error message untuk ditampilkan di bawah input */
  error?: string | null;
  /** Helper text untuk ditampilkan di bawah input (panduan pengisian) */
  helperText?: string;
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
  /** Accessibility label - override label/placeholder default */
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Apakah multiline input */
  multiline?: boolean;
  /** Jumlah baris untuk multiline (default: 3) */
  numberOfLines?: number;
  /** Value input */
  value?: string;
  /** Keyboard type */
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad';
  /** Auto capitalize */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto correct */
  autoCorrect?: boolean;
  /** Return key type */
  returnKeyType?: 'default' | 'done' | 'go' | 'next' | 'search' | 'send';
  /** On submit editing */
  onSubmitEditing?: () => void;
  /** Blur on submit */
  blurOnSubmit?: boolean;
  /** Editable */
  editable?: boolean;
}

const InputContainer = styled(XStack, {
  backgroundColor: '$background',
  borderWidth: 1.5,
  borderRadius: '$4',
  borderColor: '$borderColorHover',
  paddingHorizontal: '$4',
  alignItems: 'center',
  overflow: 'hidden',

  variants: {
    multiline: {
      true: {
        alignItems: 'flex-start',
        paddingVertical: '$4',
      },
    },
    focused: {
      true: {
        borderWidth: 2,
        borderColor: '$primary',
      },
    },
    error: {
      true: {
        borderWidth: 2,
        borderColor: '$danger',
      },
    },
    disabled: {
      true: {
        opacity: 0.6,
      },
    },
  } as const,
});

const StyledInput = styled(Input, {
  flex: 1,
  backgroundColor: '$colorTransparent',
  borderWidth: 0,
  padding: 0,
  margin: 0,
  fontSize: 16,
  color: '$color',
});

const FormInput = forwardRef<TextInput, FormInputProps>(
  (
    {
      label,
      required = false,
      error,
      helperText,
      disabled = false,
      value,
      onChangeText,
      onFocus,
      onBlur,
      placeholder,
      'aria-label': ariaLabel,
      'aria-describedby': externalAriaDescribedBy,
      multiline = false,
      numberOfLines = 3,
      keyboardType = 'default',
      autoCapitalize = 'none',
      autoCorrect = false,
      returnKeyType,
      onSubmitEditing,
      blurOnSubmit,
      editable = true,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const theme = useTheme();
    const isDisabled = disabled || !editable;
    const uniqueId = useId();
    const helperId = helperText ? `${uniqueId}-helper` : undefined;
    const errorId = error ? `${uniqueId}-error` : undefined;

    const ariaDescribedBy =
      externalAriaDescribedBy ?? ([helperId, errorId].filter(Boolean).join(' ') || undefined);

    const borderColorValue = error
      ? getThemeColor(theme, 'danger')
      : isFocused
        ? getThemeColor(theme, 'primary')
        : getThemeColor(theme, 'borderColorHover');
    const surfaceColor = getThemeColor(theme, 'surface');
    const placeholderColor = getThemeColor(theme, 'placeholderColor');
    const textColor = getThemeColor(theme, 'color');

    const handleFocus = () => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onBlur?.();
    };

    return (
      <YStack>
        {label && (
          <Text fontSize="$3" color="$color" marginBottom="$1.5" fontWeight="500">
            {label}
            {required && <Text color="$danger"> *</Text>}
          </Text>
        )}

        {multiline ? (
          <InputContainer
            multiline
            focused={isFocused && !error}
            error={!!error}
            disabled={isDisabled}
            minHeight={FORM_FIELD.MULTILINE_MIN_HEIGHT}>
            <StyledInput
              ref={ref}
              placeholder={placeholder}
              placeholderTextColor="$placeholderColor"
              value={value}
              onChangeText={onChangeText}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              blurOnSubmit={blurOnSubmit}
              editable={!isDisabled}
              multiline
              numberOfLines={numberOfLines}
              textAlignVertical="top"
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-label={ariaLabel || label || placeholder}
              aria-describedby={ariaDescribedBy}
              accessibilityLiveRegion={error ? 'polite' : undefined}
              underlineColorAndroid={getThemeColor(theme, 'colorTransparent')}
            />
          </InputContainer>
        ) : (
          <XStack
            alignItems="center"
            paddingHorizontal={FORM_FIELD.HORIZONTAL_PADDING}
            overflow="hidden"
            backgroundColor={surfaceColor}
            borderWidth={isFocused ? FORM_FIELD.ACTIVE_BORDER_WIDTH : FORM_FIELD.BORDER_WIDTH}
            borderRadius={FORM_FIELD.BORDER_RADIUS}
            borderColor={borderColorValue}
            height={FORM_FIELD.HEIGHT}
            opacity={isDisabled ? 0.6 : 1}>
            <TextInput
              ref={ref}
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
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              returnKeyType={returnKeyType}
              onSubmitEditing={onSubmitEditing}
              blurOnSubmit={blurOnSubmit}
              editable={!isDisabled}
              textAlignVertical="center"
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-label={ariaLabel || label || placeholder}
              aria-describedby={ariaDescribedBy}
              accessibilityLiveRegion={error ? 'polite' : undefined}
              underlineColorAndroid={getThemeColor(theme, 'colorTransparent')}
            />
          </XStack>
        )}

        {helperText && !error && (
          <Text id={helperId} fontSize="$2" color="$colorSubtle" marginTop="$1">
            {helperText}
          </Text>
        )}

        {error && (
          <XStack id={errorId} gap="$1" alignItems="center" marginTop="$1">
            <XCircleIcon size={14} color="$danger" />
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
