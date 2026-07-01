import { useCallback, useId } from 'react';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';
import Svg, { Path, Circle } from 'react-native-svg';
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
  onMapPress?: () => void;
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
  onMapPress,
}: AddressFormProps) {
  const theme = useTheme();
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
            onPress={isSaving ? undefined : onMapPress}
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
                anchor={{ x: 0.5, y: 1 }}
                coordinate={{
                  latitude: values.latitude,
                  longitude: values.longitude,
                }}>
                <YStack alignItems="center">
                  <YStack
                    shadowColor="$danger"
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={6}
                    elevation={5}>
                    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        fill={theme.danger?.val || '#e3242b'}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                      <Circle cx="12" cy="9" r="4" fill="white" />
                    </Svg>
                  </YStack>
                  <YStack
                    width={12}
                    height={4}
                    borderRadius={6}
                    backgroundColor="rgba(0,0,0,0.15)"
                    marginTop={4}
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
