import { useState, useCallback, useEffect } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import type { TextInput as RNTextInput } from 'react-native';
import FormInput from '@/components/elements/FormInput';
import { AreaPickerTrigger, AreaPickerSheet } from '@/components/AreaPicker';
import { MapPinSheet } from '@/components/MapPin';
import StreetAddressSearchSheet from './StreetAddressSearchSheet';
import type { MapCoords } from '@/components/MapPin';
import type { AddressSuggestion } from '@/types/geocoding';
import type { AddressFormErrors, AddressFormValues } from '@/utils/addressValidation';
import type { BiteshipArea } from '@/types/shipping';

export interface AddressFormProps {
  values: AddressFormValues;
  errors: AddressFormErrors;
  isSaving: boolean;
  refs: {
    receiverNameRef: React.RefObject<RNTextInput | null>;
    phoneNumberRef: React.RefObject<RNTextInput | null>;
    streetAddressRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
  onFieldSave: <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => void;
  onFieldValidate: (field: keyof AddressFormErrors, value: string) => void;
  onFieldCommitted?: () => void;
  onAreaSelect: (area: {
    id: string;
    name: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
  onCoordinatesChange?: (coords: MapCoords | null) => void;
  onMapConfirmed?: (confirmed: boolean) => void;
  openMapRequestKey?: number;
  addressSuggestionQuery?: string;
  addressSuggestions?: AddressSuggestion[];
  addressSuggestionError?: string | null;
  addressSuggestionsLoading?: boolean;
  addressSuggestionSelecting?: boolean;
  onStreetAddressInput?: (text: string) => void;
  onSuggestionSelect?: (suggestion: AddressSuggestion) => void;
  onLoadInitialSuggestions?: () => void;
  hasAreaProximity?: boolean;
}

function AddressForm({
  values,
  errors,
  isSaving,
  refs,
  onFieldSave,
  onFieldValidate,
  onFieldCommitted,
  onAreaSelect,
  onCoordinatesChange,
  onMapConfirmed,
  openMapRequestKey,
  addressSuggestionQuery = '',
  addressSuggestions = [],
  addressSuggestionError = null,
  addressSuggestionsLoading = false,
  addressSuggestionSelecting = false,
  onStreetAddressInput,
  onSuggestionSelect,
  onLoadInitialSuggestions,
  hasAreaProximity = false,
}: AddressFormProps) {
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [mapPinOpen, setMapPinOpen] = useState(false);
  const [streetSearchOpen, setStreetSearchOpen] = useState(false);

  useEffect(() => {
    if (!openMapRequestKey) return;
    setMapPinOpen(true);
  }, [openMapRequestKey]);

  const handleMapPinConfirm = useCallback(
    (coords: MapCoords) => {
      onFieldSave('latitude', coords.latitude);
      onFieldSave('longitude', coords.longitude);
      onCoordinatesChange?.(coords);
      onMapConfirmed?.(true);
    },
    [onFieldSave, onCoordinatesChange, onMapConfirmed],
  );

  const currentMapCoords =
    values.latitude != null && values.longitude != null
      ? { latitude: values.latitude, longitude: values.longitude }
      : null;

  const handleAreaSelect = useCallback(
    (area: BiteshipArea) => {
      onAreaSelect({
        id: area.id,
        name: area.name,
        city: area.administrative_division_level_2_name || '',
        province: area.administrative_division_level_1_name || '',
        postalCode: area.postal_code?.toString() || '',
      });
      onFieldCommitted?.();
    },
    [onAreaSelect, onFieldCommitted],
  );

  const handleReceiverNameChange = useCallback(
    (text: string) => {
      onFieldSave('receiverName', text);
    },
    [onFieldSave],
  );

  const handleReceiverNameBlur = useCallback(() => {
    const normalizedValue = values.receiverName.trim();
    onFieldSave('receiverName', normalizedValue);
    onFieldValidate('receiverName', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.receiverName]);

  const handlePhoneNumberChange = useCallback(
    (text: string) => {
      onFieldSave('phoneNumber', text);
    },
    [onFieldSave],
  );

  const handlePhoneNumberBlur = useCallback(() => {
    const normalizedValue = values.phoneNumber.trim();
    onFieldSave('phoneNumber', normalizedValue);
    onFieldValidate('phoneNumber', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.phoneNumber]);

  const handleOpenStreetSearch = useCallback(() => {
    setStreetSearchOpen(true);
    onStreetAddressInput?.(values.streetAddress);
  }, [onStreetAddressInput, values.streetAddress]);

  return (
    <YStack gap="$4" marginBottom="$4">
      <YStack gap="$3">
        <FormInput
          ref={refs.receiverNameRef}
          label="Nama Penerima"
          required
          value={values.receiverName}
          onChangeText={handleReceiverNameChange}
          onBlur={handleReceiverNameBlur}
          error={errors.receiverName}
          placeholder="Contoh: Budi Santoso"
          autoCapitalize="words"
          editable={!isSaving}
          returnKeyType="next"
          helperText="Nama lengkap sesuai KTP untuk pengiriman"
          onSubmitEditing={() => refs.phoneNumberRef.current?.focus()}
        />

        <FormInput
          ref={refs.phoneNumberRef}
          label="Nomor Telepon"
          required
          value={values.phoneNumber}
          onChangeText={handlePhoneNumberChange}
          onBlur={handlePhoneNumberBlur}
          error={errors.phoneNumber}
          placeholder="08xxxxxxxxxx"
          keyboardType="phone-pad"
          editable={!isSaving}
          returnKeyType="next"
          helperText="Nomor aktif untuk dihubungi kurir"
          onSubmitEditing={() => refs.streetAddressRef.current?.focus()}
        />
      </YStack>

      <YStack gap="$3">
        <AreaPickerTrigger
          areaName={values.areaName}
          areaId={values.areaId}
          error={errors.areaId}
          disabled={isSaving}
          onPress={() => setAreaPickerOpen(true)}
        />

        <AreaPickerSheet
          open={areaPickerOpen}
          onOpenChange={setAreaPickerOpen}
          onSelect={handleAreaSelect}
          selectedAreaId={values.areaId}
        />
      </YStack>

      <YStack gap="$1">
        <Text fontSize="$3" color="$color" fontWeight="500">
          Nama Jalan, Gedung, No. Rumah
          <Text color="$danger"> *</Text>
        </Text>

        <YStack
          backgroundColor="$background"
          borderWidth={1}
          borderColor={errors.streetAddress ? '$danger' : '$surfaceBorder'}
          borderRadius="$4"
          minHeight={56}
          paddingHorizontal="$4"
          paddingVertical="$3.5"
          justifyContent="center"
          opacity={isSaving ? 0.5 : 1}
          pressStyle={{ opacity: 0.9, scale: 0.995 }}
          onPress={isSaving ? undefined : handleOpenStreetSearch}>
          <XStack justifyContent="space-between" alignItems="center" gap="$3">
            <Text
              flex={1}
              fontSize="$4"
              color={values.streetAddress ? '$color' : '$placeholderColor'}
              numberOfLines={2}>
              {values.streetAddress || 'Nama jalan, gedung, no. rumah'}
            </Text>
            <Text fontSize="$4" color="$colorMuted">
              ›
            </Text>
          </XStack>
        </YStack>

        {errors.streetAddress ? (
          <Text fontSize="$2" color="$danger">
            {errors.streetAddress}
          </Text>
        ) : null}
      </YStack>

      <StreetAddressSearchSheet
        open={streetSearchOpen}
        onOpenChange={setStreetSearchOpen}
        query={addressSuggestionQuery}
        isSaving={isSaving}
        isLoading={addressSuggestionsLoading}
        isSelecting={addressSuggestionSelecting}
        error={addressSuggestionError}
        results={addressSuggestions}
        onQueryChange={text => {
          onFieldSave('streetAddress', text);
          onStreetAddressInput?.(text);
          onFieldCommitted?.();
        }}
        onSelectSuggestion={suggestion => onSuggestionSelect?.(suggestion)}
        onLoadSuggestions={onLoadInitialSuggestions}
        showInitialRecommendations={hasAreaProximity}
      />

      <MapPinSheet
        isOpen={mapPinOpen}
        onClose={() => setMapPinOpen(false)}
        onConfirm={handleMapPinConfirm}
        initialCoords={currentMapCoords ?? undefined}
        selectedAddressSummary={[
          values.streetAddress,
          values.areaName,
          values.city,
          values.province,
          values.postalCode,
        ]
          .filter(Boolean)
          .join(', ')}
        onEditAddressPress={() => setMapPinOpen(false)}
      />
    </YStack>
  );
}

export default AddressForm;
