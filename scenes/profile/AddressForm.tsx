import { useEffect, useCallback, useState } from 'react';
import { Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { YStack, Spinner, styled, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AddressFieldsForm from '@/components/AddressForm/AddressForm';
import DefaultAddressToggle from '@/components/AddressForm/DefaultAddressToggle';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import ErrorMessage from '@/components/elements/ErrorMessage';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { useAddressForm } from '@/hooks/useAddressForm';
import { useAddressData } from '@/hooks/useAddressData';
import { buildAddressPayload } from '@/services/address.service';
import type { RouteParams } from '@/types/routes.types';
import { BOTTOM_BAR_HEIGHT, FORM_SCROLL_PADDING } from '@/constants/ui';
import { consumePendingAddressSelection } from '@/utils/addressSearchSession';
import { consumePendingAreaSelection } from '@/utils/areaPickerSession';
import { consumePendingMapPickerResult } from '@/utils/mapPickerSession';
import { useAndroidKeyboardInset } from './useAndroidKeyboardInset';
import {
  applyMapPickerSelection,
  applyPendingSelections,
  applySelectedAddressSelection,
  applySelectedAreaSelection,
  buildAddressMapRouteParams,
} from './addressFormFlow';
import type { PendingAreaSelection } from '@/utils/areaPickerSession';
import type { SelectedAddressSuggestion } from '@/types/geocoding';
import type { MapPickerResult } from '@/components/MapPin';

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
  const { id, returnTo } = useLocalSearchParams<RouteParams<'profile/address-form'>>();
  const isEdit = !!id;
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [mapConfirmRequiredDialogOpen, setMapConfirmRequiredDialogOpen] = useState(false);
  const [areaProximity, setAreaProximity] = useState<{
    latitude: number;
    longitude: number;
    bbox?: number[];
  } | null>(null);
  const insets = useSafeAreaInsets();

  const keyboardGap = 16;
  const keyboardHeight = useAndroidKeyboardInset();
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

  const handleOpenMap = useCallback(
    (overrides?: Parameters<typeof buildAddressMapRouteParams>[1]) => {
      router.push({
        pathname: '/profile/address-map',
        params: buildAddressMapRouteParams(
          {
            latitude: values.latitude,
            longitude: values.longitude,
            streetAddress: values.streetAddress,
            areaName: values.areaName,
            areaId: values.areaId,
            city: values.city,
            province: values.province,
            postalCode: values.postalCode,
          },
          overrides,
        ),
      });
    },
    [router, values],
  );

  const applySelectedArea = useCallback(
    (selectedArea: PendingAreaSelection) => {
      applySelectedAreaSelection(selectedArea, {
        clearTransientErrors,
        setArea,
        setAreaProximity,
        setCoordinateFieldValue: setFieldValue,
        resetMapConfirmation,
      });
    },
    [clearTransientErrors, resetMapConfirmation, setArea, setFieldValue],
  );

  const handleDefaultToggle = useCallback(
    (value: boolean) => {
      setFieldValue('isDefault', value);
      clearTransientErrors();
    },
    [clearTransientErrors, setFieldValue],
  );

  const applySelectedAddress = useCallback(
    (
      selectedAddress: SelectedAddressSuggestion,
      addressContext: {
        areaId: string;
        areaName: string;
        city: string;
        province: string;
        postalCode: string;
      },
    ) => {
      applySelectedAddressSelection(selectedAddress, addressContext, {
        clearTransientErrors,
        setTextFieldValue: setFieldValue,
        setCoordinateFieldValue: setFieldValue,
        setAreaProximity,
        setMapConfirmed,
        handleOpenMap,
      });
    },
    [clearTransientErrors, handleOpenMap, setFieldValue, setMapConfirmed],
  );

  const applyMapPickerResult = useCallback(
    (result: MapPickerResult) => {
      applyMapPickerSelection(result, {
        clearTransientErrors,
        setCoordinateFieldValue: setFieldValue,
        setMapConfirmed,
      });
    },
    [clearTransientErrors, setFieldValue, setMapConfirmed],
  );

  useFocusEffect(
    useCallback(() => {
      applyPendingSelections({
        consumePendingAreaSelection,
        consumePendingAddressSelection,
        consumePendingMapPickerResult,
        getCurrentAddressContext: () => ({
          areaId: values.areaId,
          areaName: values.areaName,
          city: values.city,
          province: values.province,
          postalCode: values.postalCode,
        }),
        applySelectedArea,
        applySelectedAddress,
        applyMapPickerResult,
      });
    }, [
      applySelectedAddress,
      applySelectedArea,
      applyMapPickerResult,
      values.areaId,
      values.areaName,
      values.city,
      values.postalCode,
      values.province,
    ]),
  );

  const handleOpenAreaPicker = useCallback(() => {
    const params: RouteParams<'profile/area-picker'> = {};

    if (values.areaId.trim()) {
      params.selectedAreaId = values.areaId.trim();
    }

    router.push({
      pathname: '/profile/area-picker',
      params,
    });
  }, [router, values.areaId]);

  const handleOpenStreetAddressSearch = useCallback(() => {
    const params: RouteParams<'profile/address-search'> = {};

    if (values.streetAddress.trim()) {
      params.query = values.streetAddress.trim();
    }

    if (areaProximity) {
      params.latitude = String(areaProximity.latitude);
      params.longitude = String(areaProximity.longitude);
    }

    router.push({
      pathname: '/profile/address-search',
      params,
    });
  }, [areaProximity, router, values.streetAddress]);

  const handleDismissError = useCallback(() => {
    setGeneralError(null);
    clearDataError();
  }, [clearDataError, setGeneralError]);

  const handleSuccessConfirm = useCallback(() => {
    if (returnTo === '/cart') {
      router.replace('/cart');
      return;
    }

    router.back();
  }, [returnTo, router]);

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
      address_note: values.addressNote.trim() || null,
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
    <SafeAreaView edges={[]}>
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
                onAreaPickerPress={handleOpenAreaPicker}
                onStreetAddressPress={handleOpenStreetAddressSearch}
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
        onConfirm={handleSuccessConfirm}
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
          handleOpenMap();
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
