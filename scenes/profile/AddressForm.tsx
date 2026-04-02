import { useEffect, useCallback, useState } from 'react';
import { Alert, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { YStack, Spinner, styled, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AddressFieldsForm from '@/components/AddressForm/AddressForm';
import DefaultAddressToggle from '@/components/AddressForm/DefaultAddressToggle';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import ErrorMessage from '@/components/elements/ErrorMessage';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { useAddressForm } from '@/hooks/useAddressForm';
import { useAddressSuggestions } from '@/hooks/useAddressSuggestions';
import { useAddressData } from '@/hooks/useAddressData';
import { buildAddressPayload } from '@/services/address.service';
import { reverseGeocodeCoordinates } from '@/services/googlePlaces.service';
import type { AddressSuggestion } from '@/types/geocoding';
import type { RouteParams } from '@/types/routes.types';
import { BOTTOM_BAR_HEIGHT, FORM_SCROLL_PADDING } from '@/constants/ui';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const FormScrollView = styled(ScrollView, {
  flex: 1,
});

const FormContent = styled(YStack, {
  paddingHorizontal: '$4',
  paddingTop: '$3',
  flexGrow: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
});

export default function AddressFormScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { user } = useAppSlice();
  const { id } = useLocalSearchParams<RouteParams<'profile/address-form'>>();
  const isEdit = !!id;
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [mapConfirmRequiredDialogOpen, setMapConfirmRequiredDialogOpen] = useState(false);
  const [mapOpenRequestKey, setMapOpenRequestKey] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [areaProximity, setAreaProximity] = useState<{
    latitude: number;
    longitude: number;
    bbox?: number[];
  } | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const keyboardGap = 16;
  const extraBottomOffset = Platform.OS === 'android' ? keyboardHeight : 0;
  const scrollPaddingBottom =
    BOTTOM_BAR_HEIGHT + insets.bottom + FORM_SCROLL_PADDING.SPACIOUS + keyboardHeight + keyboardGap;

  const {
    values,
    errors,
    generalError,
    setGeneralError,
    setFieldValue,
    validateField,
    validateAll,
    populateFromAddress,
    setArea,
    clearArea,
    refs,
    mapConfirmed,
    setMapConfirmed,
    resetMapConfirmation,
  } = useAddressForm();

  const {
    isLoading: dataLoading,
    isSaving: dataSaving,
    error: dataError,
    loadAddress,
    saveAddress,
    clearError: clearDataError,
  } = useAddressData();

  const {
    query: addressSuggestionQuery,
    setQuery: setAddressSuggestionQuery,
    results: addressSuggestions,
    isLoading: addressSuggestionsLoading,
    isRetrieving: addressSuggestionSelecting,
    error: addressSuggestionError,
    clearAll: clearAddressSuggestions,
    loadInitialSuggestions,
    selectSuggestion,
  } = useAddressSuggestions(areaProximity);

  useEffect(() => {
    if (!isEdit || !id || !user?.id) return;

    loadAddress(id).then(address => {
      if (!address) {
        Alert.alert('Error', 'Gagal memuat alamat');
        router.back();
        return;
      }

      populateFromAddress(address);
    });
  }, [id, isEdit, user?.id, loadAddress, populateFromAddress, router]);

  const loading = dataLoading;
  const saving = dataSaving;
  const displayedError = generalError ?? dataError;

  const clearTransientErrors = useCallback(() => {
    if (generalError) {
      setGeneralError(null);
    }
    if (dataError) {
      clearDataError();
    }
  }, [clearDataError, dataError, generalError, setGeneralError]);

  const handleAddressFieldCommitted = useCallback(() => {
    clearTransientErrors();
    setFieldValue('latitude', null);
    setFieldValue('longitude', null);
    resetMapConfirmation();
  }, [clearTransientErrors, resetMapConfirmation, setFieldValue]);

  const handleDefaultToggle = useCallback(
    (value: boolean) => {
      setFieldValue('isDefault', value);
      clearTransientErrors();
    },
    [clearTransientErrors, setFieldValue],
  );

  const handleStreetAddressInput = useCallback(
    (text: string) => {
      setAddressSuggestionQuery(text);
    },
    [setAddressSuggestionQuery],
  );

  const handleLoadInitialSuggestions = useCallback(() => {
    if (areaProximity) {
      loadInitialSuggestions(areaProximity);
    }
  }, [areaProximity, loadInitialSuggestions]);

  const handleSuggestionSelect = useCallback(
    async (suggestion: AddressSuggestion) => {
      const selectedAddress = await selectSuggestion(suggestion);

      if (!selectedAddress) {
        return;
      }

      clearTransientErrors();
      setFieldValue('streetAddress', selectedAddress.streetAddress);

      if (!values.areaId) {
        setFieldValue('city', selectedAddress.city);
        setFieldValue('province', selectedAddress.province);
        setFieldValue('postalCode', selectedAddress.postalCode);
      }

      setFieldValue('latitude', selectedAddress.latitude);
      setFieldValue('longitude', selectedAddress.longitude);
      setAreaProximity({
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
      });
      setMapConfirmed(false);
      clearAddressSuggestions();
      setMapOpenRequestKey(current => current + 1);
    },
    [
      clearAddressSuggestions,
      clearTransientErrors,
      selectSuggestion,
      setFieldValue,
      setMapConfirmed,
      values.areaId,
    ],
  );

  const handleCoordinatesChange = useCallback(
    async (coords: { latitude: number; longitude: number } | null) => {
      if (!coords) {
        return;
      }

      const { data: reversedAddress, error } = await reverseGeocodeCoordinates(coords);

      if (error || !reversedAddress) {
        return;
      }

      const cityChanged =
        reversedAddress.city.trim().toLowerCase() !== values.city.trim().toLowerCase();
      const provinceChanged =
        reversedAddress.province.trim().toLowerCase() !== values.province.trim().toLowerCase();
      const postalChanged = reversedAddress.postalCode.trim() !== values.postalCode.trim();

      if (values.areaId && (cityChanged || provinceChanged || postalChanged)) {
        clearArea();
        setFieldValue('city', reversedAddress.city || values.city);
        setFieldValue('province', reversedAddress.province || values.province);
        setFieldValue('postalCode', reversedAddress.postalCode || values.postalCode);
        setGeneralError(
          'Area pengiriman berubah setelah titik peta dipindahkan. Pilih ulang area pengiriman.',
        );
      }
    },
    [
      clearArea,
      setFieldValue,
      setGeneralError,
      values.areaId,
      values.city,
      values.postalCode,
      values.province,
    ],
  );

  const handleDismissError = useCallback(() => {
    setGeneralError(null);
    clearDataError();
  }, [clearDataError, setGeneralError]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    setGeneralError(null);

    if (!validateAll()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGeneralError('Mohon perbaiki kesalahan pada form');
      return;
    }

    const hasCoordinates = values.latitude != null && values.longitude != null;
    if (!hasCoordinates) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setGeneralError('Pilih salah satu rekomendasi alamat jalan terlebih dulu.');
      return;
    }

    if (!mapConfirmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMapConfirmRequiredDialogOpen(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const basePayload = {
      receiver_name: values.receiverName.trim(),
      phone_number: values.phoneNumber.trim(),
      street_address: values.streetAddress.trim(),
      area_id: values.areaId,
      area_name: values.areaName || null,
      city: values.city.trim(),
      postal_code: values.postalCode.trim(),
      province: values.province.trim() || null,
      is_default: values.isDefault,
    };

    const payload = buildAddressPayload(basePayload, values.latitude, values.longitude);

    const success = await saveAddress({
      userId: user.id,
      addressId: id,
      payload,
    });

    if (success) {
      setSuccessDialogOpen(true);
    }
  }, [id, saveAddress, setGeneralError, user?.id, validateAll, values, mapConfirmed]);

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']}>
      <KeyboardAvoidingWrapper
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <YStack flex={1}>
          <FormScrollView
            contentContainerStyle={{
              paddingBottom: scrollPaddingBottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <FormContent gap="$4">
              <ErrorMessage
                message={displayedError}
                onDismiss={handleDismissError}
                marginBottom="$0"
              />

              <AddressFieldsForm
                values={values}
                errors={errors}
                isSaving={saving}
                refs={refs}
                onFieldSave={setFieldValue}
                onFieldValidate={validateField}
                onFieldCommitted={handleAddressFieldCommitted}
                onAreaSelect={async area => {
                  setArea(area);
                  setAreaProximity(null);
                }}
                onCoordinatesChange={handleCoordinatesChange}
                onMapConfirmed={setMapConfirmed}
                openMapRequestKey={mapOpenRequestKey}
                addressSuggestionQuery={addressSuggestionQuery}
                addressSuggestions={addressSuggestions}
                addressSuggestionError={addressSuggestionError}
                addressSuggestionsLoading={addressSuggestionsLoading}
                addressSuggestionSelecting={addressSuggestionSelecting}
                onStreetAddressInput={handleStreetAddressInput}
                onSuggestionSelect={handleSuggestionSelect}
                onLoadInitialSuggestions={handleLoadInitialSuggestions}
                hasAreaProximity={!!areaProximity}
              />

              <DefaultAddressToggle
                isDefault={values.isDefault}
                isSaving={saving}
                onToggle={handleDefaultToggle}
              />
            </FormContent>
          </FormScrollView>

          <BottomActionBar
            buttonTitle={isEdit ? 'Simpan Perubahan' : 'Simpan Alamat'}
            onPress={handleSave}
            isLoading={saving}
            disabled={saving}
            extraBottomOffset={extraBottomOffset}
            keyboardAnchored={Platform.OS === 'android'}
            aria-label={isEdit ? 'Simpan perubahan alamat' : 'Simpan alamat baru'}
            aria-describedby="Menyimpan data alamat pengiriman"
          />
        </YStack>
      </KeyboardAvoidingWrapper>

      <AppAlertDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title={isEdit ? 'Alamat Berhasil Diperbarui' : 'Alamat Berhasil Ditambahkan'}
        description="Data alamat telah berhasil disimpan."
        confirmText="OK"
        onConfirm={() => router.back()}
      />

      <AppAlertDialog
        open={mapConfirmRequiredDialogOpen}
        onOpenChange={setMapConfirmRequiredDialogOpen}
        title="Konfirmasi Lokasi Diperlukan"
        description="Lokasi peta harus cocok dengan alamat agar pengiriman berhasil. Silakan buka peta lalu konfirmasi titik alamat Anda."
        confirmText="Buka Peta"
        cancelText="Batal"
        onConfirm={() => {
          setMapConfirmRequiredDialogOpen(false);
          setMapOpenRequestKey(current => current + 1);
        }}
        onCancel={() => setMapConfirmRequiredDialogOpen(false)}
        confirmColor="$primary"
        confirmTextColor="$onPrimary"
        cancelColor="$background"
        cancelTextColor="$colorSubtle"
      />
    </SafeAreaView>
  );
}
