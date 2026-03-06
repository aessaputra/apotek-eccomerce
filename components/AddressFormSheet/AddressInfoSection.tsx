import { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '@/components/elements/FormInput';
import { getThemeColor } from '@/utils/theme';

export interface AddressInfoSectionProps {
  /** Street address value */
  streetAddress: string;
  /** City value */
  city: string;
  /** Postal code value */
  postalCode: string;
  /** Province value */
  province: string;
  /** Street address error message */
  streetAddressError: string | null;
  /** City error message */
  cityError: string | null;
  /** Postal code error message */
  postalCodeError: string | null;
  /** Whether the form is in saving state */
  isSaving: boolean;
  /** Callback when street address changes */
  onStreetAddressChange: (value: string) => void;
  /** Callback when city changes */
  onCityChange: (value: string) => void;
  /** Callback when postal code changes */
  onPostalCodeChange: (value: string) => void;
  /** Callback when province changes */
  onProvinceChange: (value: string) => void;
  /** Callback when street address is blurred */
  onStreetAddressBlur: () => void;
  /** Callback when city is blurred */
  onCityBlur: () => void;
  /** Callback when postal code is blurred */
  onPostalCodeBlur: () => void;
  /** Refs for input focus management */
  refs: {
    streetAddressRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
}

/**
 * Address Information Section
 * Contains street address, city, postal code, and province fields
 */
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
            <Ionicons name="location-outline" size={20} color={getThemeColor(theme, 'primary')} />
            <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
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
              minHeight={100}
              returnKeyType="next"
              onSubmitEditing={() => refs.cityRef.current?.focus()}
              accessibilityLabel="Alamat lengkap"
              accessibilityHint="Masukkan alamat lengkap termasuk jalan, RT/RW, dan nomor rumah"
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
                  accessibilityLabel="Kota"
                  accessibilityHint="Masukkan nama kota"
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
                  accessibilityLabel="Kode pos"
                  accessibilityHint="Masukkan kode pos 5 digit"
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
              accessibilityLabel="Provinsi"
              accessibilityHint="Masukkan nama provinsi (opsional)"
            />
          </YStack>
        </YStack>
      </Card>
    );
  },
);

AddressInfoSection.displayName = 'AddressInfoSection';

export default AddressInfoSection;
