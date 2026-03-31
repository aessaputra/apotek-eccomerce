import { useState, useCallback } from 'react';
import { YStack } from 'tamagui';
import type { TextInput as RNTextInput } from 'react-native';
import FormInput from '@/components/elements/FormInput';
import { AreaPickerTrigger, AreaPickerSheet } from '@/components/AreaPicker';
import { MapPinTrigger, MapPinSheet } from '@/components/MapPin';
import type { MapCoords } from '@/components/MapPin';
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
    subdistrictId: string;
    name: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
  onAreaClear?: () => void;
  onCoordinatesChange?: (coords: MapCoords | null) => void;
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
  onAreaClear,
  onCoordinatesChange,
}: AddressFormProps) {
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [mapPinOpen, setMapPinOpen] = useState(false);

  const handleMapPinConfirm = useCallback(
    (coords: MapCoords) => {
      onFieldSave('latitude', coords.latitude);
      onFieldSave('longitude', coords.longitude);
      onCoordinatesChange?.(coords);
      onFieldCommitted?.();
    },
    [onFieldSave, onCoordinatesChange, onFieldCommitted],
  );

  const currentMapCoords =
    values.latitude != null && values.longitude != null
      ? { latitude: values.latitude, longitude: values.longitude }
      : null;

  const handleAreaSelect = useCallback(
    (area: BiteshipArea) => {
      onAreaSelect({
        id: area.id,
        subdistrictId: area.id,
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
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave],
  );

  const handleReceiverNameBlur = useCallback(() => {
    const normalizedValue = values.receiverName.trim();
    onFieldSave('receiverName', normalizedValue);
    onFieldValidate('receiverName', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.receiverName]);

  const handlePhoneNumberChange = useCallback(
    (text: string) => {
      onFieldSave('phoneNumber', text);
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave],
  );

  const handlePhoneNumberBlur = useCallback(() => {
    const normalizedValue = values.phoneNumber.trim();
    onFieldSave('phoneNumber', normalizedValue);
    onFieldValidate('phoneNumber', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.phoneNumber]);

  const handleStreetAddressChange = useCallback(
    (text: string) => {
      onFieldSave('streetAddress', text);
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave],
  );

  const handleStreetAddressBlur = useCallback(() => {
    const normalizedValue = values.streetAddress.trim();
    onFieldSave('streetAddress', normalizedValue);
    onFieldValidate('streetAddress', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.streetAddress]);

  const handleCityChange = useCallback(
    (text: string) => {
      // Clear area selection if user manually edits city (data integrity)
      if (values.areaId && text !== values.city) {
        onAreaClear?.();
      }
      onFieldSave('city', text);
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave, onAreaClear, values.areaId, values.city],
  );

  const handleCityBlur = useCallback(() => {
    const normalizedValue = values.city.trim();
    onFieldSave('city', normalizedValue);
    onFieldValidate('city', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.city]);

  const handleProvinceChange = useCallback(
    (text: string) => {
      // Clear area selection if user manually edits province (data integrity)
      if (values.areaId && text !== values.province) {
        onAreaClear?.();
      }
      onFieldSave('province', text);
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave, onAreaClear, values.areaId, values.province],
  );

  const handleProvinceBlur = useCallback(() => {
    onFieldSave('province', values.province.trim());
  }, [onFieldSave, values.province]);

  const handlePostalCodeChange = useCallback(
    (text: string) => {
      // Clear area selection if user manually edits postal code (data integrity)
      if (values.areaId && text !== values.postalCode) {
        onAreaClear?.();
      }
      onFieldSave('postalCode', text);
      onFieldCommitted?.();
    },
    [onFieldCommitted, onFieldSave, onAreaClear, values.areaId, values.postalCode],
  );

  const handlePostalCodeBlur = useCallback(() => {
    const normalizedValue = values.postalCode.trim();
    onFieldSave('postalCode', normalizedValue);
    onFieldValidate('postalCode', normalizedValue);
  }, [onFieldSave, onFieldValidate, values.postalCode]);

  return (
    <YStack gap="$3.5" marginBottom="$4">
      <FormInput
        ref={refs.receiverNameRef}
        label="Nama Penerima"
        required
        value={values.receiverName}
        onChangeText={handleReceiverNameChange}
        onBlur={handleReceiverNameBlur}
        error={errors.receiverName}
        placeholder="Masukkan nama penerima"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        helperText="Wajib diisi sesuai nama penerima paket"
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
        helperText="Wajib diisi, gunakan nomor aktif"
        onSubmitEditing={() => refs.streetAddressRef.current?.focus()}
      />

      <FormInput
        ref={refs.streetAddressRef}
        label="Alamat Lengkap"
        required
        value={values.streetAddress}
        onChangeText={handleStreetAddressChange}
        onBlur={handleStreetAddressBlur}
        error={errors.streetAddress}
        placeholder="Nama jalan, nomor rumah"
        multiline
        numberOfLines={4}
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        helperText="Wajib diisi dengan jalan dan nomor rumah"
        onSubmitEditing={() => refs.cityRef.current?.focus()}
      />

      <FormInput
        ref={refs.cityRef}
        label="Kota"
        required
        value={values.city}
        onChangeText={handleCityChange}
        onBlur={handleCityBlur}
        error={errors.city}
        placeholder="Masukkan kota"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        helperText="Wajib diisi sesuai kota tujuan"
        onSubmitEditing={() => refs.postalCodeRef.current?.focus()}
      />

      <FormInput
        ref={refs.postalCodeRef}
        label="Kode Pos"
        required
        value={values.postalCode}
        onChangeText={handlePostalCodeChange}
        onBlur={handlePostalCodeBlur}
        error={errors.postalCode}
        placeholder="5 digit kode pos"
        keyboardType="numeric"
        editable={!isSaving}
        returnKeyType="next"
        helperText="Wajib diisi dengan 5 digit kode pos"
      />

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

      <MapPinTrigger
        value={currentMapCoords}
        disabled={isSaving}
        onPress={() => setMapPinOpen(true)}
      />

      <MapPinSheet
        isOpen={mapPinOpen}
        onClose={() => setMapPinOpen(false)}
        onConfirm={handleMapPinConfirm}
        initialCoords={currentMapCoords ?? undefined}
      />

      <FormInput
        ref={refs.provinceRef}
        label="Provinsi"
        value={values.province}
        onChangeText={handleProvinceChange}
        onBlur={handleProvinceBlur}
        placeholder="Masukkan provinsi (opsional)"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="done"
        helperText="Opsional, isi jika diperlukan"
      />
    </YStack>
  );
}

export default AddressForm;
