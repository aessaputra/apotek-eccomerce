import { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { YStack, XStack, Text, Card, styled } from 'tamagui';
import FormInput from '@/components/elements/FormInput';
import { UserIcon } from '@/components/icons';

export interface ReceiverInfoSectionProps {
  receiverName: string;
  phoneNumber: string;
  receiverNameError: string | null;
  phoneNumberError: string | null;
  isSaving: boolean;
  onReceiverNameChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onReceiverNameBlur: () => void;
  onPhoneNumberBlur: () => void;
  receiverNameRef: React.RefObject<RNTextInput | null>;
  phoneNumberRef: React.RefObject<RNTextInput | null>;
  onFocusStreetAddress: () => void;
}

const SectionCard = styled(Card, {
  padding: '$4',
  marginBottom: '$4',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$5',
  elevation: 1,
});

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
    return (
      <SectionCard>
        <YStack gap="$4">
          <XStack gap="$2" alignItems="center" marginBottom="$2">
            <UserIcon size={20} color="$primary" />
            <Text fontSize="$5" fontWeight="600" color="$color">
              Informasi Penerima
            </Text>
          </XStack>

          <YStack gap="$3">
            <FormInput
              ref={receiverNameRef}
              required
              value={receiverName}
              onChangeText={onReceiverNameChange}
              onBlur={onReceiverNameBlur}
              error={receiverNameError}
              placeholder="Nama Penerima"
              autoCapitalize="words"
              editable={!isSaving}
              returnKeyType="next"
              onSubmitEditing={onFocusStreetAddress}
              aria-label="Nama penerima"
              aria-describedby="Masukkan nama lengkap penerima paket"
            />
            <FormInput
              ref={phoneNumberRef}
              required
              value={phoneNumber}
              onChangeText={onPhoneNumberChange}
              onBlur={onPhoneNumberBlur}
              error={phoneNumberError}
              placeholder="Nomor Telepon"
              keyboardType="phone-pad"
              editable={!isSaving}
              returnKeyType="next"
              aria-label="Nomor telepon"
              aria-describedby="Masukkan nomor telepon penerima"
            />
          </YStack>
        </YStack>
      </SectionCard>
    );
  },
);

ReceiverInfoSection.displayName = 'ReceiverInfoSection';

export default ReceiverInfoSection;
