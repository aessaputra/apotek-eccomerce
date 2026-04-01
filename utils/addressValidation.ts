/**
 * Address form validation utilities
 * Provides validation functions for address form fields
 */

export interface AddressFormErrors {
  receiverName: string | null;
  phoneNumber: string | null;
  streetAddress: string | null;
  areaId: string | null;
  city: string | null;
  postalCode: string | null;
}

export interface AddressFormValues {
  receiverName: string;
  phoneNumber: string;
  streetAddress: string;
  areaId: string;
  areaName: string;
  city: string;
  postalCode: string;
  province: string;
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
}

export const initialFormValues: AddressFormValues = {
  receiverName: '',
  phoneNumber: '',
  streetAddress: '',
  areaId: '',
  areaName: '',
  city: '',
  postalCode: '',
  province: '',
  isDefault: false,
  latitude: null,
  longitude: null,
};

export const initialFormErrors: AddressFormErrors = {
  receiverName: null,
  phoneNumber: null,
  streetAddress: null,
  areaId: null,
  city: null,
  postalCode: null,
};

/**
 * Validates receiver name
 * - Required field
 * - Minimum 2 characters
 * - Maximum 100 characters
 */
export function validateReceiverName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Nama penerima wajib diisi';
  }
  if (trimmed.length < 2) {
    return 'Nama penerima minimal 2 karakter';
  }
  if (trimmed.length > 100) {
    return 'Nama penerima maksimal 100 karakter';
  }
  return null;
}

/**
 * Validates phone number
 * - Required field
 * - Must contain only valid phone characters (digits, spaces, +, -, parentheses)
 * - Minimum 8 digits
 * - Maximum 15 digits
 */
export function validatePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Nomor telepon wajib diisi';
  }
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  if (!phoneRegex.test(trimmed)) {
    return 'Format nomor telepon tidak valid';
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return 'Nomor telepon minimal 8 digit';
  }
  if (digitsOnly.length > 15) {
    return 'Nomor telepon maksimal 15 digit';
  }
  return null;
}

/**
 * Validates street address
 * - Required field
 * - Minimum 10 characters
 */
export function validateStreetAddress(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Alamat lengkap wajib diisi';
  }
  if (trimmed.length < 10) {
    return 'Alamat lengkap minimal 10 karakter';
  }
  return null;
}

/**
 * Validates city name
 * - Required field
 * - Minimum 2 characters
 */
export function validateCity(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Kota wajib diisi';
  }
  if (trimmed.length < 2) {
    return 'Nama kota minimal 2 karakter';
  }
  return null;
}

/**
 * Validates postal code
 * - Required field
 * - Must be numeric only
 * - Minimum 5 digits
 * - Maximum 10 digits
 */
export function validatePostalCode(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Kode pos wajib diisi';
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Kode pos harus berupa angka';
  }
  if (trimmed.length < 5) {
    return 'Kode pos minimal 5 digit';
  }
  if (trimmed.length > 10) {
    return 'Kode pos maksimal 10 digit';
  }
  return null;
}

/**
 * Validates area ID
 * - Required field
 * - Must be selected from available areas
 */
export function validateAreaId(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return 'Area pengiriman wajib dipilih';
  }
  return null;
}

/**
 * Validates all form fields and returns errors object
 * Returns null if all fields are valid
 */
export function validateAllFields(
  values: Omit<AddressFormValues, 'province' | 'isDefault' | 'areaName' | 'latitude' | 'longitude'>,
): AddressFormErrors | null {
  const errors: AddressFormErrors = {
    receiverName: validateReceiverName(values.receiverName),
    phoneNumber: validatePhoneNumber(values.phoneNumber),
    streetAddress: validateStreetAddress(values.streetAddress),
    areaId: validateAreaId(values.areaId),
    city: validateCity(values.city),
    postalCode: validatePostalCode(values.postalCode),
  };

  const hasErrors = Object.values(errors).some(error => error !== null);
  return hasErrors ? errors : null;
}
