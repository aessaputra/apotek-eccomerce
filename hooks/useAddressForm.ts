import { useState, useCallback, useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import type { Address } from '@/types/address';
import { parseCoordinate } from '@/utils/coordinates';
import {
  type AddressFormValues,
  type AddressFormErrors,
  initialFormValues,
  initialFormErrors,
  validateReceiverName,
  validatePhoneNumber,
  validateStreetAddress,
  validateAreaId,
  validateCity,
  validatePostalCode,
  validateAllFields,
} from '@/utils/addressValidation';

export interface UseAddressFormReturn {
  // Form values
  values: AddressFormValues;
  // Form errors
  errors: AddressFormErrors;
  // General error message
  generalError: string | null;
  // Map confirmation state - true if user has confirmed location on map
  mapConfirmed: boolean;
  // Refs for focus management
  refs: {
    receiverNameRef: React.RefObject<RNTextInput | null>;
    phoneNumberRef: React.RefObject<RNTextInput | null>;
    streetAddressRef: React.RefObject<RNTextInput | null>;
    addressNoteRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
  // Actions
  setGeneralError: (error: string | null) => void;
  setFieldValue: <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => void;
  setArea: (area: {
    id: string;
    name: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
  clearArea: () => void;
  validateField: (field: keyof AddressFormErrors, value: string) => boolean;
  validateAll: () => boolean;
  resetForm: () => void;
  populateFromAddress: (address: Address) => void;
  clearFieldError: (field: keyof AddressFormErrors) => void;
  // Map confirmation actions
  setMapConfirmed: (confirmed: boolean) => void;
  resetMapConfirmation: () => void;
}

/**
 * Hook for managing address form state and validation
 * Encapsulates form logic, validation, and focus management
 */
export function useAddressForm(): UseAddressFormReturn {
  // Form values state
  const [values, setValues] = useState<AddressFormValues>(initialFormValues);

  // Form errors state
  const [errors, setErrors] = useState<AddressFormErrors>(initialFormErrors);

  // General error message
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Map confirmation state - tracks if user has confirmed location on map
  const [mapConfirmed, setMapConfirmedState] = useState(false);

  // Refs for focus management
  const receiverNameRef = useRef<RNTextInput | null>(null);
  const phoneNumberRef = useRef<RNTextInput | null>(null);
  const streetAddressRef = useRef<RNTextInput | null>(null);
  const addressNoteRef = useRef<RNTextInput | null>(null);
  const cityRef = useRef<RNTextInput | null>(null);
  const postalCodeRef = useRef<RNTextInput | null>(null);
  const provinceRef = useRef<RNTextInput | null>(null);

  /**
   * Set a field value with optional validation clearing
   */
  const setFieldValue = useCallback(
    <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => {
      setValues(prev => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field: keyof AddressFormErrors) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  }, []);

  /**
   * Clear area selection when dependent fields are manually edited
   */
  const clearArea = useCallback(() => {
    setValues(prev => ({
      ...prev,
      areaId: '',
      areaName: '',
    }));
    // Clear area error since user is now manually entering data
    clearFieldError('areaId');
  }, [clearFieldError]);

  /**
   * Set area from area picker selection
   */
  const setArea = useCallback(
    (area: { id: string; name: string; city: string; province: string; postalCode: string }) => {
      setValues(prev => ({
        ...prev,
        areaId: area.id,
        areaName: area.name,
        city: area.city,
        province: area.province,
        postalCode: area.postalCode,
      }));
      // Clear errors for all auto-populated fields
      clearFieldError('areaId');
      clearFieldError('city');
      clearFieldError('postalCode');
    },
    [clearFieldError],
  );

  /**
   * Validate a single field and update error state
   */
  const validateField = useCallback((field: keyof AddressFormErrors, value: string): boolean => {
    let error: string | null = null;

    switch (field) {
      case 'receiverName':
        error = validateReceiverName(value);
        break;
      case 'phoneNumber':
        error = validatePhoneNumber(value);
        break;
      case 'streetAddress':
        error = validateStreetAddress(value);
        break;
      case 'areaId':
        error = validateAreaId(value);
        break;
      case 'city':
        error = validateCity(value);
        break;
      case 'postalCode':
        error = validatePostalCode(value);
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === null;
  }, []);

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    const validationErrors = validateAllFields({
      receiverName: values.receiverName,
      phoneNumber: values.phoneNumber,
      streetAddress: values.streetAddress,
      areaId: values.areaId,
      city: values.city,
      postalCode: values.postalCode,
    });

    if (validationErrors) {
      setErrors(validationErrors);
      return false;
    }

    return true;
  }, [values]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(initialFormValues);
    setErrors(initialFormErrors);
    setGeneralError(null);
  }, []);

  const populateFromAddress = useCallback((address: Address) => {
    setValues({
      receiverName: address.receiver_name,
      phoneNumber: address.phone_number,
      streetAddress: address.street_address,
      addressNote: address.address_note || '',
      areaId: address.area_id || '',
      areaName: address.area_name || '',
      city: address.city,
      postalCode: address.postal_code,
      province: address.province || '',
      isDefault: address.is_default ?? false,
      latitude: parseCoordinate(address.latitude),
      longitude: parseCoordinate(address.longitude),
    });
    setErrors(initialFormErrors);
    setGeneralError(null);
    const hasSavedCoords =
      parseCoordinate(address.latitude) !== null && parseCoordinate(address.longitude) !== null;
    setMapConfirmedState(hasSavedCoords);
  }, []);

  /**
   * Set map confirmation state
   */
  const setMapConfirmed = useCallback((confirmed: boolean) => {
    setMapConfirmedState(confirmed);
  }, []);

  /**
   * Reset map confirmation - called when address fields change or coordinates change
   */
  const resetMapConfirmation = useCallback(() => {
    setMapConfirmedState(false);
  }, []);

  return {
    values,
    errors,
    generalError,
    mapConfirmed,
    refs: {
      receiverNameRef,
      phoneNumberRef,
      streetAddressRef,
      addressNoteRef,
      cityRef,
      postalCodeRef,
      provinceRef,
    },
    setGeneralError,
    setFieldValue,
    setArea,
    clearArea,
    validateField,
    validateAll,
    resetForm,
    populateFromAddress,
    clearFieldError,
    setMapConfirmed,
    resetMapConfirmation,
  };
}
