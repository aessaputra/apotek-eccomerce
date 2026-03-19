import { forwardRef, useState } from 'react';
import { Input, XStack, YStack, Text, styled } from 'tamagui';
import { XCircleIcon } from '@/components/icons';

export interface FormInputProps {
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
  'aria-label'?: string;
  /** Accessibility hint */
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
  borderColor: '$borderColor',
  paddingHorizontal: '$4',
  minHeight: 56,
  alignItems: 'center',
  overflow: 'hidden',

  variants: {
    multiline: {
      true: {
        alignItems: 'flex-start',
        paddingVertical: '$4',
        minHeight: 120,
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
  backgroundColor: 'transparent',
  borderWidth: 0,
  padding: 0,
  margin: 0,
  fontSize: 16,
  color: '$color',
  minHeight: 56,
  textAlignVertical: 'center',
});

const FormInput = forwardRef<Input, FormInputProps>(
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
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
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
    const isDisabled = disabled || !editable;

    return (
      <YStack>
        {label && (
          <Text fontSize="$3" color="$colorPress" marginBottom="$1.5" fontWeight="500">
            {label}
            {required && <Text color="$danger"> *</Text>}
          </Text>
        )}

        <InputContainer
          multiline={multiline}
          focused={isFocused && !error}
          error={!!error}
          disabled={isDisabled}
          minHeight={multiline ? 120 : 56}>
          <StyledInput
            ref={ref}
            placeholder={placeholder}
            placeholderTextColor="$colorSubtle"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={blurOnSubmit}
            editable={!isDisabled}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : undefined}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            aria-label={ariaLabel || label || placeholder}
            aria-describedby={ariaDescribedBy}
            accessibilityLiveRegion={error ? 'polite' : undefined}
            underlineColorAndroid="transparent"
          />
        </InputContainer>

        {error && (
          <XStack gap="$1" alignItems="center" marginTop="$1">
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
