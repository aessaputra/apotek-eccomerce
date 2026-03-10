import { YStack } from 'tamagui';
import type { TextInput as RNTextInput } from 'react-native';
import FormInput from '@/components/elements/FormInput';
import type { AddressFormErrors, AddressFormValues } from '@/utils/addressValidation';

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
}

function AddressForm({
  values,
  errors,
  isSaving,
  refs,
  onFieldSave,
  onFieldValidate,
  onFieldCommitted,
}: AddressFormProps) {
  return (
    <YStack gap="$3.5" marginBottom="$4">
      <FormInput
        ref={refs.receiverNameRef}
        label="Nama Penerima"
        required
        value={values.receiverName}
        onChangeText={text => {
          onFieldSave('receiverName', text);
          onFieldCommitted?.();
        }}
        onBlur={() => {
          const normalizedValue = values.receiverName.trim();
          onFieldSave('receiverName', normalizedValue);
          onFieldValidate('receiverName', normalizedValue);
        }}
        error={errors.receiverName}
        placeholder="Masukkan nama penerima"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        onSubmitEditing={() => refs.phoneNumberRef.current?.focus()}
      />

      <FormInput
        ref={refs.phoneNumberRef}
        label="Nomor Telepon"
        required
        value={values.phoneNumber}
        onChangeText={text => {
          onFieldSave('phoneNumber', text);
          onFieldCommitted?.();
        }}
        onBlur={() => {
          const normalizedValue = values.phoneNumber.trim();
          onFieldSave('phoneNumber', normalizedValue);
          onFieldValidate('phoneNumber', normalizedValue);
        }}
        error={errors.phoneNumber}
        placeholder="08xxxxxxxxxx"
        keyboardType="phone-pad"
        editable={!isSaving}
        returnKeyType="next"
        onSubmitEditing={() => refs.streetAddressRef.current?.focus()}
      />

      <FormInput
        ref={refs.streetAddressRef}
        label="Alamat Lengkap"
        required
        value={values.streetAddress}
        onChangeText={text => {
          onFieldSave('streetAddress', text);
          onFieldCommitted?.();
        }}
        onBlur={() => {
          const normalizedValue = values.streetAddress.trim();
          onFieldSave('streetAddress', normalizedValue);
          onFieldValidate('streetAddress', normalizedValue);
        }}
        error={errors.streetAddress}
        placeholder="Nama jalan, nomor rumah"
        multiline
        numberOfLines={4}
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        onSubmitEditing={() => refs.cityRef.current?.focus()}
      />

      <FormInput
        ref={refs.cityRef}
        label="Kota"
        required
        value={values.city}
        onChangeText={text => {
          onFieldSave('city', text);
          onFieldCommitted?.();
        }}
        onBlur={() => {
          const normalizedValue = values.city.trim();
          onFieldSave('city', normalizedValue);
          onFieldValidate('city', normalizedValue);
        }}
        error={errors.city}
        placeholder="Masukkan kota"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        onSubmitEditing={() => refs.provinceRef.current?.focus()}
      />

      <FormInput
        ref={refs.provinceRef}
        label="Provinsi"
        value={values.province}
        onChangeText={text => {
          onFieldSave('province', text);
          onFieldCommitted?.();
        }}
        onBlur={() => onFieldSave('province', values.province.trim())}
        placeholder="Masukkan provinsi (opsional)"
        autoCapitalize="words"
        editable={!isSaving}
        returnKeyType="next"
        onSubmitEditing={() => refs.postalCodeRef.current?.focus()}
      />

      <FormInput
        ref={refs.postalCodeRef}
        label="Kode Pos"
        required
        value={values.postalCode}
        onChangeText={text => {
          onFieldSave('postalCode', text);
          onFieldCommitted?.();
        }}
        onBlur={() => {
          const normalizedValue = values.postalCode.trim();
          onFieldSave('postalCode', normalizedValue);
          onFieldValidate('postalCode', normalizedValue);
        }}
        error={errors.postalCode}
        placeholder="5 digit kode pos"
        keyboardType="numeric"
        editable={!isSaving}
        returnKeyType="done"
      />
    </YStack>
  );
}

export default AddressForm;
