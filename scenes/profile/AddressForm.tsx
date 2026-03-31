import { useEffect, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { YStack, Spinner, styled, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function AddressFormScreen() {
  const router = useRouter();
  const { user } = useAppSlice();
  const { id } = useLocalSearchParams<RouteParams<'profile/address-form'>>();
  const isEdit = !!id;
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = BOTTOM_BAR_HEIGHT + insets.bottom + FORM_SCROLL_PADDING.SPACIOUS;

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

  const handleFieldCommitted = useCallback(() => {
    if (generalError) {
      setGeneralError(null);
    }
    if (dataError) {
      clearDataError();
    }
  }, [clearDataError, dataError, generalError, setGeneralError]);

  const handleDefaultToggle = useCallback(
    (value: boolean) => {
      setFieldValue('isDefault', value);
      handleFieldCommitted();
    },
    [handleFieldCommitted, setFieldValue],
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const basePayload = {
      receiver_name: values.receiverName.trim(),
      phone_number: values.phoneNumber.trim(),
      street_address: values.streetAddress.trim(),
      area_id: values.areaId,
      subdistrict_id: values.subdistrictId || values.areaId || null,
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
  }, [id, saveAddress, setGeneralError, user?.id, validateAll, values]);

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
      <FormScrollView
        contentContainerStyle={{
          paddingBottom: scrollPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <FormContent gap="$4">
          <ErrorMessage message={displayedError} onDismiss={handleDismissError} marginBottom="$0" />

          <AddressFieldsForm
            values={values}
            errors={errors}
            isSaving={saving}
            refs={refs}
            onFieldSave={setFieldValue}
            onFieldValidate={validateField}
            onFieldCommitted={handleFieldCommitted}
            onAreaSelect={setArea}
            onAreaClear={clearArea}
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
        aria-label={isEdit ? 'Simpan perubahan alamat' : 'Simpan alamat baru'}
        aria-describedby="Menyimpan data alamat pengiriman"
      />

      <AppAlertDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title={isEdit ? 'Alamat Berhasil Diperbarui' : 'Alamat Berhasil Ditambahkan'}
        description="Data alamat telah berhasil disimpan."
        confirmText="OK"
        onConfirm={() => router.back()}
      />
    </SafeAreaView>
  );
}
