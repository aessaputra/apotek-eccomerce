import { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { YStack, XStack, Text, Card, styled } from 'tamagui';
import FormInput from '@/components/elements/FormInput';
import { MapPinIcon } from '@/components/icons';

export interface AddressInfoSectionProps {
  streetAddress: string;
  city: string;
  postalCode: string;
  province: string;
  streetAddressError: string | null;
  cityError: string | null;
  postalCodeError: string | null;
  isSaving: boolean;
  onStreetAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onStreetAddressBlur: () => void;
  onCityBlur: () => void;
  onPostalCodeBlur: () => void;
  refs: {
    streetAddressRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
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

const AddressInfoSection = forwardRef<RNTextInput, AddressInfoSectionProps>(
  (
    {
      streetAddress,
      city,
      postalCode,
      province,
      streetAddressError,
      cityError,
      postalCodeError,
      isSaving,
      onStreetAddressChange,
      onCityChange,
      onPostalCodeChange,
      onProvinceChange,
      onStreetAddressBlur,
      onCityBlur,
      onPostalCodeBlur,
      refs,
    },
    ref,
  ) => {
    return (
      <SectionCard>
        <YStack gap="$4">
          <XStack gap="$2" alignItems="center" marginBottom="$2">
            <MapPinIcon size={20} color="$primary" />
            <Text fontSize="$5" fontWeight="600" color="$color">
              Alamat Pengiriman
            </Text>
          </XStack>

          <YStack gap="$3">
            <FormInput
              ref={refs.streetAddressRef}
              label="Alamat Lengkap"
              required
              value={streetAddress}
              onChangeText={onStreetAddressChange}
              onBlur={onStreetAddressBlur}
              error={streetAddressError}
              placeholder="Jalan, RT/RW, Nomor rumah"
              autoCapitalize="words"
              editable={!isSaving}
              multiline
              numberOfLines={3}
              returnKeyType="next"
              onSubmitEditing={() => refs.cityRef.current?.focus()}
              aria-label="Alamat lengkap"
              aria-describedby="Masukkan alamat lengkap termasuk jalan, RT/RW, dan nomor rumah"
            />

            <XStack gap="$3">
              <YStack flex={1}>
                <FormInput
                  ref={refs.cityRef}
                  label="Kota"
                  required
                  value={city}
                  onChangeText={onCityChange}
                  onBlur={onCityBlur}
                  error={cityError}
                  autoCapitalize="words"
                  editable={!isSaving}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.postalCodeRef.current?.focus()}
                  aria-label="Kota"
                  aria-describedby="Masukkan nama kota"
                />
              </YStack>
              <YStack flex={1}>
                <FormInput
                  ref={refs.postalCodeRef}
                  label="Kode Pos"
                  required
                  value={postalCode}
                  onChangeText={onPostalCodeChange}
                  onBlur={onPostalCodeBlur}
                  error={postalCodeError}
                  placeholder="5 digit"
                  keyboardType="numeric"
                  editable={!isSaving}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.provinceRef.current?.focus()}
                  aria-label="Kode pos"
                  aria-describedby="Masukkan kode pos 5 digit"
                />
              </YStack>
            </XStack>

            <FormInput
              ref={refs.provinceRef}
              label="Provinsi"
              value={province}
              onChangeText={onProvinceChange}
              autoCapitalize="words"
              editable={!isSaving}
              returnKeyType="done"
              aria-label="Provinsi"
              aria-describedby="Masukkan nama provinsi (opsional)"
            />
          </YStack>
        </YStack>
      </SectionCard>
    );
  },
);

AddressInfoSection.displayName = 'AddressInfoSection';

export default AddressInfoSection;
