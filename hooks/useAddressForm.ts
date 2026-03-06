import { useState, useCallback, useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import type { Address } from '@/types/address';
import {
  type AddressFormValues,
  type AddressFormErrors,
  initialFormValues,
  initialFormErrors,
  validateReceiverName,
  validatePhoneNumber,
  validateStreetAddress,
  validateCity,
  validatePostalCode,
  validateAllFields,
} from '@/utils/addressValidation';

export interface UseAddressFormReturn {
  // Form values
  values: AddressFormValues;
  // Form errors
  errors: AddressFormErrors;
  // Loading and saving states
  isLoading: boolean;
  isSaving: boolean;
  // General error message
  generalError: string | null;
  // Refs for focus management
  refs: {
    receiverNameRef: React.RefObject<RNTextInput | null>;
    phoneNumberRef: React.RefObject<RNTextInput | null>;
    streetAddressRef: React.RefObject<RNTextInput | null>;
    cityRef: React.RefObject<RNTextInput | null>;
    postalCodeRef: React.RefObject<RNTextInput | null>;
    provinceRef: React.RefObject<RNTextInput | null>;
  };
  // Actions
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setGeneralError: (error: string | null) => void;
  setFieldValue: <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) => void;
  validateField: (field: keyof AddressFormErrors, value: string) => boolean;
  validateAll: () => boolean;
  resetForm: () => void;
  populateFromAddress: (address: Address) => void;
  clearFieldError: (field: keyof AddressFormErrors) => void;
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

  // Loading and saving states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // General error message
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Refs for focus management
  const receiverNameRef = useRef<RNTextInput | null>(null);
  const phoneNumberRef = useRef<RNTextInput | null>(null);
  const streetAddressRef = useRef<RNTextInput | null>(null);
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
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  /**
   * Populate form from existing address data
   */
  const populateFromAddress = useCallback((address: Address) => {
    setValues({
      receiverName: address.receiver_name,
      phoneNumber: address.phone_number,
      streetAddress: address.street_address,
      city: address.city,
      postalCode: address.postal_code,
      province: address.province || '',
      isDefault: address.is_default ?? false,
    });
    setErrors(initialFormErrors);
    setGeneralError(null);
  }, []);

  return {
    values,
    errors,
    isLoading,
    isSaving,
    generalError,
    refs: {
      receiverNameRef,
      phoneNumberRef,
      streetAddressRef,
      cityRef,
      postalCodeRef,
      provinceRef,
    },
    setIsLoading,
    setIsSaving,
    setGeneralError,
    setFieldValue,
    validateField,
    validateAll,
    resetForm,
    populateFromAddress,
    clearFieldError,
  };
}
