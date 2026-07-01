import { useCallback, useId } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import type { TextInput as RNTextInput } from 'react-native';
import { Platform } from 'react-native';
import FormInput from '@/components/elements/FormInput';
import { AreaPickerTrigger } from '@/components/AreaPicker';
import type { AddressFormErrors, AddressFormValues } from '@/utils/addressValidation';
import { ADDRESS_PLACEHOLDER_STREET } from '@/constants/address';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: typeof import('react-native-maps').PROVIDER_GOOGLE | undefined = undefined;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

export interface AddressFormProps {
  values: AddressFormValues;
  errors: AddressFormErrors;
  isSaving: boolean;
  refs: {
    receiverNameRef: React.RefObject<RNTextInput | null>;
    phoneNumberRef: React.RefObject<RNTextInput | null>;
    streetAddressRef: React.RefObject<RNTextInput | null>;
    addressNoteRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
  onFieldSave: <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => void;
  onFieldValidate: (field: keyof AddressFormErrors, value: string) => void;
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
  onAreaPickerPress,
  onStreetAddressPress,
}: AddressFormProps) {
  const streetAddressErrorId = useId();

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

  const handleAddressNoteChange = useCallback(
    (text: string) => {
      onFieldSave('addressNote', text);
    },
    [onFieldSave],
  );

  const handleAddressNoteBlur = useCallback(() => {
    onFieldSave('addressNote', values.addressNote.trim());
  }, [onFieldSave, values.addressNote]);

  const handleOpenAreaPicker = useCallback(() => {
    onAreaPickerPress?.();
  }, [onAreaPickerPress]);

  return (
    <YStack gap="$4" marginBottom="$4">
      <YStack gap="$3">
        <FormInput
          ref={refs.receiverNameRef}
          required
          aria-label="Nama Penerima"
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
          aria-label="Nomor Telepon"
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

      <YStack gap="$3">
        <YStack gap="$1">
          <YStack
            backgroundColor="$background"
            borderWidth={1.5}
            borderColor={errors.streetAddress ? '$danger' : '$surfaceBorder'}
            borderRadius="$4"
            minHeight={56}
            paddingHorizontal="$4"
            paddingTop="$3"
            paddingBottom="$3"
            justifyContent="center"
            opacity={isSaving ? 0.5 : 1}
            role="button"
            aria-disabled={isSaving}
            aria-invalid={!!errors.streetAddress}
            aria-label={values.streetAddress || ADDRESS_PLACEHOLDER_STREET}
            aria-describedby={errors.streetAddress ? streetAddressErrorId : undefined}
            pressStyle={{ opacity: 0.9, scale: 0.995 }}
            animation="quick"
            onPress={isSaving ? undefined : handleOpenStreetSearch}>
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <Text
                flex={1}
                fontSize="$4"
                color={values.streetAddress ? '$color' : '$colorMuted'}
                fontWeight="400"
                flexShrink={1}>
                {values.streetAddress || ADDRESS_PLACEHOLDER_STREET}
              </Text>
              <ChevronRight size={20} color="$colorMuted" />
            </XStack>
          </YStack>

          {errors.streetAddress ? (
            <Text id={streetAddressErrorId} fontSize="$2" color="$danger" marginTop="$1">
              {errors.streetAddress}
            </Text>
          ) : null}
        </YStack>

        <FormInput
          ref={refs.addressNoteRef}
          value={values.addressNote}
          onChangeText={handleAddressNoteChange}
          onBlur={handleAddressNoteBlur}
          placeholder="Detail Lainnya (Blok / Unit No., Patokan)"
          autoCapitalize="sentences"
          editable={!isSaving}
          returnKeyType="done"
          aria-label="Detail lainnya"
        />

        {values.latitude && values.longitude ? (
          <YStack
            height={160}
            borderRadius="$4"
            overflow="hidden"
            borderWidth={1.5}
            borderColor="$surfaceBorder"
            opacity={isSaving ? 0.5 : 1}
            onPress={isSaving ? undefined : handleOpenStreetSearch}
            pressStyle={{ opacity: 0.9, scale: 0.995 }}
            animation="quick"
            marginTop="$2">
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: values.latitude,
                longitude: values.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled={false}
              pointerEvents="none">
              <Marker
                coordinate={{
                  latitude: values.latitude,
                  longitude: values.longitude,
                }}>
                <YStack alignItems="center">
                  <YStack
                    backgroundColor="$danger"
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    borderRadius="$4">
                    <Text color="white" fontSize="$2" fontWeight="600">
                      Alamatmu di sini
                    </Text>
                  </YStack>
                  <YStack
                    width={10}
                    height={10}
                    backgroundColor="$danger"
                    rotate="45deg"
                    marginTop={-5}
                    zIndex={-1}
                  />
                  <YStack
                    width={14}
                    height={14}
                    borderRadius={7}
                    backgroundColor="$danger"
                    marginTop={2}
                    borderWidth={2}
                    borderColor="white"
                    shadowColor="#000"
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.2}
                    shadowRadius={2}
                    elevation={3}
                  />
                </YStack>
              </Marker>
            </MapView>
          </YStack>
        ) : null}
      </YStack>
    </YStack>
  );
}

export default AddressForm;
