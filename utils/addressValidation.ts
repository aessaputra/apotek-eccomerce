import {
  ADDRESS_MIN_LENGTH_STREET,
  ADDRESS_MIN_LENGTH_NAME,
  ADDRESS_MAX_LENGTH_NAME,
  ADDRESS_MIN_LENGTH_PHONE_DIGITS,
  ADDRESS_MAX_LENGTH_PHONE_DIGITS,
  ADDRESS_MIN_LENGTH_POSTAL,
  ADDRESS_MAX_LENGTH_POSTAL,
} from '@/constants/address';

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

export function validateReceiverName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Nama penerima wajib diisi';
  }
  if (trimmed.length < ADDRESS_MIN_LENGTH_NAME) {
    return `Nama penerima minimal ${ADDRESS_MIN_LENGTH_NAME} karakter`;
  }
  if (trimmed.length > ADDRESS_MAX_LENGTH_NAME) {
    return `Nama penerima maksimal ${ADDRESS_MAX_LENGTH_NAME} karakter`;
  }
  return null;
}

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
  if (digitsOnly.length < ADDRESS_MIN_LENGTH_PHONE_DIGITS) {
    return `Nomor telepon minimal ${ADDRESS_MIN_LENGTH_PHONE_DIGITS} digit`;
  }
  if (digitsOnly.length > ADDRESS_MAX_LENGTH_PHONE_DIGITS) {
    return `Nomor telepon maksimal ${ADDRESS_MAX_LENGTH_PHONE_DIGITS} digit`;
  }
  return null;
}

export function validateStreetAddress(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Alamat lengkap wajib diisi';
  }
  if (trimmed.length < ADDRESS_MIN_LENGTH_STREET) {
    return `Alamat lengkap minimal ${ADDRESS_MIN_LENGTH_STREET} karakter`;
  }
  return null;
}

export function validateCity(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Kota wajib diisi';
  }
  if (trimmed.length < ADDRESS_MIN_LENGTH_NAME) {
    return `Nama kota minimal ${ADDRESS_MIN_LENGTH_NAME} karakter`;
  }
  return null;
}

export function validatePostalCode(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Kode pos wajib diisi';
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Kode pos harus berupa angka';
  }
  if (trimmed.length < ADDRESS_MIN_LENGTH_POSTAL) {
    return `Kode pos minimal ${ADDRESS_MIN_LENGTH_POSTAL} digit`;
  }
  if (trimmed.length > ADDRESS_MAX_LENGTH_POSTAL) {
    return `Kode pos maksimal ${ADDRESS_MAX_LENGTH_POSTAL} digit`;
  }
  return null;
}

export function validateAreaId(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return 'Area pengiriman wajib dipilih';
  }
  return null;
}

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
