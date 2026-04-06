import { useState, useCallback, useEffect } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import type { TextInput as RNTextInput } from 'react-native';
import FormInput from '@/components/elements/FormInput';
import { AreaPickerTrigger } from '@/components/AreaPicker';
import { MapPinSheet } from '@/components/MapPin';
import type { MapCoords } from '@/components/MapPin';
import type { AddressFormErrors, AddressFormValues } from '@/utils/addressValidation';
import { ADDRESS_PLACEHOLDER_STREET } from '@/constants/address';

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
  onCoordinatesChange?: (coords: MapCoords | null) => void;
  onMapConfirmed?: (confirmed: boolean) => void;
  openMapRequestKey?: number;
  onAreaPickerPress?: () => void;
  onStreetAddressPress?: () => void;
}

function AddressForm({
  values,
  errors,
  isSaving,
  refs,
  onFieldSave,
  onFieldValidate,
  onCoordinatesChange,
  onMapConfirmed,
  openMapRequestKey,
  onAreaPickerPress,
  onStreetAddressPress,
}: AddressFormProps) {
  const [mapPinOpen, setMapPinOpen] = useState(false);

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
    onStreetAddressPress?.();
  }, [onStreetAddressPress]);

  const handleOpenAreaPicker = useCallback(() => {
    onAreaPickerPress?.();
  }, [onAreaPickerPress]);

  return (
    <YStack gap="$4" marginBottom="$4">
      <YStack gap="$3">
        <FormInput
          ref={refs.receiverNameRef}
          required
          value={values.receiverName}
          onChangeText={handleReceiverNameChange}
          onBlur={handleReceiverNameBlur}
          error={errors.receiverName}
          placeholder="Nama Penerima"
          autoCapitalize="words"
          editable={!isSaving}
          returnKeyType="next"
          onSubmitEditing={() => refs.phoneNumberRef.current?.focus()}
        />

        <FormInput
          ref={refs.phoneNumberRef}
          required
          value={values.phoneNumber}
          onChangeText={handlePhoneNumberChange}
          onBlur={handlePhoneNumberBlur}
          error={errors.phoneNumber}
          placeholder="Nomor Telepon"
          keyboardType="phone-pad"
          editable={!isSaving}
          returnKeyType="next"
          onSubmitEditing={handleOpenStreetSearch}
        />
      </YStack>

      <YStack gap="$3">
        <AreaPickerTrigger
          areaName={values.areaName}
          areaId={values.areaId}
          error={errors.areaId}
          disabled={isSaving}
          onPress={handleOpenAreaPicker}
        />
      </YStack>

      <YStack gap="$1">
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
              {values.streetAddress || ADDRESS_PLACEHOLDER_STREET}
            </Text>
            <ChevronRight size={20} color="$colorMuted" />
          </XStack>
        </YStack>

        {errors.streetAddress ? (
          <Text fontSize="$2" color="$danger">
            {errors.streetAddress}
          </Text>
        ) : null}
      </YStack>

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
