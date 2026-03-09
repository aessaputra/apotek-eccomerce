import { useEffect, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import { YStack, Spinner, useTheme } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AddressFieldsForm from '@/components/AddressFormSheet/AddressForm';
import DefaultAddressToggle from '@/components/AddressFormSheet/DefaultAddressToggle';
import ErrorMessage from '@/components/elements/ErrorMessage';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { useAddressForm } from '@/hooks/useAddressForm';
import { useAddressData } from '@/hooks/useAddressData';
import type { AddressInsert } from '@/types/address';
import { getThemeColor } from '@/utils/theme';
import { FORM_SCROLL_PADDING } from '@/constants/ui';

export default function AddressFormScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const {
    values,
    errors,
    isLoading: formLoading,
    isSaving: formSaving,
    generalError,
    setIsLoading,
    setIsSaving,
    setGeneralError,
    setFieldValue,
    validateField,
    validateAll,
    populateFromAddress,
    refs,
  } = useAddressForm();

  const {
    isLoading: dataLoading,
    isSaving: dataSaving,
    error: dataError,
    loadAddress,
    saveAddress,
  } = useAddressData();

  useEffect(() => {
    setIsLoading(dataLoading);
  }, [dataLoading, setIsLoading]);

  useEffect(() => {
    setIsSaving(dataSaving);
  }, [dataSaving, setIsSaving]);

  useEffect(() => {
    if (dataError) {
      setGeneralError(dataError);
    }
  }, [dataError, setGeneralError]);

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

  const loading = formLoading || dataLoading;
  const saving = formSaving || dataSaving;

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    setGeneralError(null);

    if (!validateAll()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGeneralError('Mohon perbaiki kesalahan pada form');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: AddressInsert = {
      receiver_name: values.receiverName.trim(),
      phone_number: values.phoneNumber.trim(),
      street_address: values.streetAddress.trim(),
      city: values.city.trim(),
      postal_code: values.postalCode.trim(),
      province: values.province.trim() || null,
      is_default: values.isDefault,
    };

    const success = await saveAddress({
      userId: user.id,
      addressId: id,
      payload,
    });

    if (success) {
      Alert.alert(
        'Berhasil',
        isEdit ? 'Alamat berhasil diperbarui' : 'Alamat berhasil ditambahkan',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [id, isEdit, router, saveAddress, setGeneralError, user?.id, validateAll, values]);

  const bgColor = getThemeColor(theme, 'background');

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: FORM_SCROLL_PADDING.SPACIOUS,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <YStack gap="$4">
          <ErrorMessage
            message={generalError}
            onDismiss={() => setGeneralError(null)}
            marginBottom="$0"
          />

          <AddressFieldsForm
            values={values}
            errors={errors}
            isSaving={saving}
            refs={refs}
            onFieldSave={setFieldValue}
            onFieldValidate={validateField}
            onFieldCommitted={() => {
              setGeneralError(null);
            }}
          />

          <DefaultAddressToggle
            isDefault={values.isDefault}
            isSaving={saving}
            onToggle={value => setFieldValue('isDefault', value)}
          />
        </YStack>
      </ScrollView>

      <BottomActionBar
        buttonTitle={isEdit ? 'Simpan Perubahan' : 'Simpan Alamat'}
        onPress={handleSave}
        isLoading={saving}
        disabled={saving}
        accessibilityLabel={isEdit ? 'Simpan perubahan alamat' : 'Simpan alamat baru'}
        accessibilityHint="Menyimpan data alamat pengiriman"
      />
    </SafeAreaView>
  );
}
