import { useState, useEffect, useCallback } from 'react';
import { Sheet, YStack, XStack, Text, Spinner, useTheme } from 'tamagui';
import * as Haptics from 'expo-haptics';
import ErrorMessage from '@/components/elements/ErrorMessage';
import Button from '@/components/elements/Button';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import ReceiverInfoSection from './ReceiverInfoSection';
import AddressInfoSection from './AddressInfoSection';
import DefaultAddressToggle from './DefaultAddressToggle';
import { useAppSlice } from '@/slices';
import { useAddressForm } from '@/hooks/useAddressForm';
import { useAddressData } from '@/hooks/useAddressData';
import type { AddressInsert } from '@/types/address';
import { getThemeColor } from '@/utils/theme';
import { MIN_TOUCH_TARGET } from '@/constants/ui';

export interface AddressFormSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Address ID for edit mode (undefined for create mode) */
  addressId?: string;
  /** Callback when address is successfully saved */
  onSuccess?: () => void;
}

/**
 * AddressFormSheet - A Tamagui Sheet-based address form
 * Refactored to separate concerns: form state, data operations, and UI composition
 */
function AddressFormSheet({ open, onOpenChange, addressId, onSuccess }: AddressFormSheetProps) {
  const theme = useTheme();
  const { user } = useAppSlice();
  const isEdit = !!addressId;

  // Form state and validation hook
  const {
    values,
    errors,
    isLoading: formLoading,
    isSaving: formSaving,
    generalError,
    refs,
    setIsLoading,
    setIsSaving,
    setGeneralError,
    setFieldValue,
    validateField,
    validateAll,
    resetForm,
    populateFromAddress,
  } = useAddressForm();

  // Data operations hook
  const {
    isLoading: dataLoading,
    isSaving: dataSaving,
    error: dataError,
    loadAddress,
    saveAddress,
  } = useAddressData();

  // Sync loading states between hooks
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

  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  // Combined loading and saving states
  const loading = formLoading || dataLoading;
  const saving = formSaving || dataSaving;

  // Load address data when editing
  useEffect(() => {
    if (open && isEdit && addressId && user?.id) {
      loadAddress(addressId).then(address => {
        if (address) {
          populateFromAddress(address);
        } else {
          onOpenChange(false);
        }
      });
    } else if (!open) {
      resetForm();
    }
  }, [
    open,
    isEdit,
    addressId,
    user?.id,
    loadAddress,
    populateFromAddress,
    resetForm,
    onOpenChange,
  ]);

  // Auto-focus first input after sheet opens
  useEffect(() => {
    if (open && !loading && refs.receiverNameRef.current) {
      const timer = setTimeout(() => {
        refs.receiverNameRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [open, loading, refs.receiverNameRef]);

  // Field change handlers with validation clearing
  const handleReceiverNameChange = useCallback(
    (value: string) => {
      setFieldValue('receiverName', value);
      if (errors.receiverName) {
        validateField('receiverName', value);
      }
    },
    [setFieldValue, errors.receiverName, validateField],
  );

  const handlePhoneNumberChange = useCallback(
    (value: string) => {
      setFieldValue('phoneNumber', value);
      if (errors.phoneNumber) {
        validateField('phoneNumber', value);
      }
    },
    [setFieldValue, errors.phoneNumber, validateField],
  );

  const handleStreetAddressChange = useCallback(
    (value: string) => {
      setFieldValue('streetAddress', value);
      if (errors.streetAddress) {
        validateField('streetAddress', value);
      }
    },
    [setFieldValue, errors.streetAddress, validateField],
  );

  const handleCityChange = useCallback(
    (value: string) => {
      setFieldValue('city', value);
      if (errors.city) {
        validateField('city', value);
      }
    },
    [setFieldValue, errors.city, validateField],
  );

  const handlePostalCodeChange = useCallback(
    (value: string) => {
      setFieldValue('postalCode', value);
      if (errors.postalCode) {
        validateField('postalCode', value);
      }
    },
    [setFieldValue, errors.postalCode, validateField],
  );

  // Form submission handler
  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setGeneralError(null);

    // Validate all fields
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
      addressId,
      payload,
    });

    if (success) {
      setSuccessDialogOpen(true);
    }
  }, [user?.id, validateAll, values, addressId, saveAddress, setGeneralError]);

  // Handle dialog close and success callback
  const handleDialogClose = useCallback(
    (open: boolean) => {
      setSuccessDialogOpen(open);
      if (!open) {
        onOpenChange(false);
        onSuccess?.();
      }
    },
    [onOpenChange, onSuccess],
  );

  const bgColor = getThemeColor(theme, 'surface');

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={[60, 85]}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      moveOnKeyboardChange
      animation="medium">
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Handle />
      <Sheet.Frame
        padding="$4"
        backgroundColor={bgColor}
        borderTopLeftRadius="$4"
        borderTopRightRadius="$4">
        {loading ? (
          <YStack alignItems="center" justifyContent="center" padding="$8" minHeight={200}>
            <Spinner size="large" color="$primary" />
            <Text marginTop="$4" color="$colorPress">
              Memuat alamat...
            </Text>
          </YStack>
        ) : (
          <YStack flex={1}>
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize="$6" fontWeight="700" color="$color" fontFamily="$heading">
                {isEdit ? 'Edit Alamat' : 'Tambah Alamat'}
              </Text>
            </XStack>

            {/* Scrollable Form Content */}
            <Sheet.ScrollView
              flex={1}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* General Error Message */}
              <ErrorMessage
                message={generalError}
                onDismiss={() => setGeneralError(null)}
                marginBottom="$4"
              />

              {/* Receiver Information Section */}
              <ReceiverInfoSection
                receiverName={values.receiverName}
                phoneNumber={values.phoneNumber}
                receiverNameError={errors.receiverName}
                phoneNumberError={errors.phoneNumber}
                isSaving={saving}
                onReceiverNameChange={handleReceiverNameChange}
                onPhoneNumberChange={handlePhoneNumberChange}
                onReceiverNameBlur={() => validateField('receiverName', values.receiverName)}
                onPhoneNumberBlur={() => validateField('phoneNumber', values.phoneNumber)}
                receiverNameRef={refs.receiverNameRef}
                phoneNumberRef={refs.phoneNumberRef}
                onFocusStreetAddress={() => refs.streetAddressRef.current?.focus()}
              />

              {/* Address Information Section */}
              <AddressInfoSection
                streetAddress={values.streetAddress}
                city={values.city}
                postalCode={values.postalCode}
                province={values.province}
                streetAddressError={errors.streetAddress}
                cityError={errors.city}
                postalCodeError={errors.postalCode}
                isSaving={saving}
                onStreetAddressChange={handleStreetAddressChange}
                onCityChange={handleCityChange}
                onPostalCodeChange={handlePostalCodeChange}
                onProvinceChange={value => setFieldValue('province', value)}
                onStreetAddressBlur={() => validateField('streetAddress', values.streetAddress)}
                onCityBlur={() => validateField('city', values.city)}
                onPostalCodeBlur={() => validateField('postalCode', values.postalCode)}
                refs={{
                  streetAddressRef: refs.streetAddressRef,
                  cityRef: refs.cityRef,
                  postalCodeRef: refs.postalCodeRef,
                  provinceRef: refs.provinceRef,
                }}
              />

              {/* Set as Default Section */}
              <DefaultAddressToggle
                isDefault={values.isDefault}
                isSaving={saving}
                onToggle={value => setFieldValue('isDefault', value)}
              />

              {/* Submit Button */}
              <Button
                title={isEdit ? 'Simpan Perubahan' : 'Simpan Alamat'}
                onPress={handleSave}
                isLoading={saving}
                disabled={saving}
                backgroundColor="$primary"
                paddingVertical="$3"
                borderRadius="$3"
                minHeight={MIN_TOUCH_TARGET}
                titleStyle={{ fontSize: 16, fontWeight: '600' }}
                accessibilityLabel={isEdit ? 'Simpan perubahan alamat' : 'Simpan alamat baru'}
                accessibilityHint="Menyimpan data alamat pengiriman"
              />

              {/* Extra padding at bottom for keyboard */}
              <YStack height={20} />
            </Sheet.ScrollView>
          </YStack>
        )}
      </Sheet.Frame>

      {/* Success Dialog */}
      <AppAlertDialog
        open={successDialogOpen}
        onOpenChange={handleDialogClose}
        title="Berhasil"
        description={isEdit ? 'Alamat berhasil diperbarui' : 'Alamat berhasil ditambahkan'}
        confirmText="OK"
      />
    </Sheet>
  );
}

export default AddressFormSheet;
