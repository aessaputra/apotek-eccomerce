import { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '@/components/elements/FormInput';
import { getThemeColor } from '@/utils/theme';

export interface ReceiverInfoSectionProps {
  /** Receiver name value */
  receiverName: string;
  /** Phone number value */
  phoneNumber: string;
  /** Receiver name error message */
  receiverNameError: string | null;
  /** Phone number error message */
  phoneNumberError: string | null;
  /** Whether the form is in saving state */
  isSaving: boolean;
  /** Callback when receiver name changes */
  onReceiverNameChange: (value: string) => void;
  /** Callback when phone number changes */
  onPhoneNumberChange: (value: string) => void;
  /** Callback when receiver name is blurred */
  onReceiverNameBlur: () => void;
  /** Callback when phone number is blurred */
  onPhoneNumberBlur: () => void;
  /** Ref for receiver name input */
  receiverNameRef: React.RefObject<RNTextInput | null>;
  /** Ref for phone number input */
  phoneNumberRef: React.RefObject<RNTextInput | null>;
  /** Callback to focus street address input */
  onFocusStreetAddress: () => void;
}

/**
 * Receiver Information Section
 * Contains name and phone number fields for the address form
 */
const ReceiverInfoSection = forwardRef<RNTextInput, ReceiverInfoSectionProps>(
  (
    {
      receiverName,
      phoneNumber,
      receiverNameError,
      phoneNumberError,
      isSaving,
      onReceiverNameChange,
      onPhoneNumberChange,
      onReceiverNameBlur,
      onPhoneNumberBlur,
      receiverNameRef,
      phoneNumberRef,
      onFocusStreetAddress,
    },
    ref,
  ) => {
    const theme = useTheme();

    return (
      <Card
        padding="$4"
        marginBottom="$4"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$surfaceBorder"
        borderRadius="$4"
        elevation={0}>
        <YStack gap="$4">
          <XStack gap="$2" alignItems="center" marginBottom="$2">
            <Ionicons name="person-outline" size={20} color={getThemeColor(theme, 'primary')} />
            <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
              Informasi Penerima
            </Text>
          </XStack>

          <YStack gap="$3">
            <FormInput
              ref={receiverNameRef}
              label="Nama Penerima"
              required
              value={receiverName}
              onChangeText={onReceiverNameChange}
              onBlur={onReceiverNameBlur}
              error={receiverNameError}
              autoCapitalize="words"
              editable={!isSaving}
              returnKeyType="next"
              onSubmitEditing={onFocusStreetAddress}
              accessibilityLabel="Nama penerima"
              accessibilityHint="Masukkan nama lengkap penerima paket"
            />
            <FormInput
              ref={phoneNumberRef}
              label="Nomor Telepon"
              required
              value={phoneNumber}
              onChangeText={onPhoneNumberChange}
              onBlur={onPhoneNumberBlur}
              error={phoneNumberError}
              placeholder="08xx xxxx xxxx"
              keyboardType="phone-pad"
              editable={!isSaving}
              returnKeyType="next"
              accessibilityLabel="Nomor telepon"
              accessibilityHint="Masukkan nomor telepon penerima"
            />
          </YStack>
        </YStack>
      </Card>
    );
  },
);

ReceiverInfoSection.displayName = 'ReceiverInfoSection';

export default ReceiverInfoSection;
