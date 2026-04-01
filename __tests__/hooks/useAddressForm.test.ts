import { describe, expect, test, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { useAddressForm } from '@/hooks/useAddressForm';

describe('useAddressForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setArea populates all area-related fields', () => {
    const { result } = renderHook(() => useAddressForm());

    act(() => {
      result.current.setArea({
        id: 'AREA-123',
        name: 'Kemang',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });
    });

    expect(result.current.values.areaId).toBe('AREA-123');
    expect(result.current.values.areaName).toBe('Kemang');
    expect(result.current.values.city).toBe('Jakarta Selatan');
    expect(result.current.values.province).toBe('DKI Jakarta');
    expect(result.current.values.postalCode).toBe('12345');
  });

  test('clearArea resets all area fields to empty', () => {
    const { result } = renderHook(() => useAddressForm());

    // First set an area
    act(() => {
      result.current.setArea({
        id: 'AREA-123',
        name: 'Kemang',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12345',
      });
    });

    // Verify area is set
    expect(result.current.values.areaId).toBe('AREA-123');

    // Clear the area
    act(() => {
      result.current.clearArea();
    });

    // Verify all area fields are cleared
    expect(result.current.values.areaId).toBe('');
    expect(result.current.values.areaName).toBe('');
    // City, province, postalCode should remain (user can edit them)
    expect(result.current.values.city).toBe('Jakarta Selatan');
  });

  test('clearArea clears areaId error', () => {
    const { result } = renderHook(() => useAddressForm());

    // Set an error first
    act(() => {
      result.current.validateField('areaId', '');
    });

    expect(result.current.errors.areaId).toBeTruthy();

    // Clear the area
    act(() => {
      result.current.clearArea();
    });

    // Error should be cleared
    expect(result.current.errors.areaId).toBeNull();
  });

  test('setFieldValue updates individual fields', () => {
    const { result } = renderHook(() => useAddressForm());

    act(() => {
      result.current.setFieldValue('receiverName', 'John Doe');
    });

    expect(result.current.values.receiverName).toBe('John Doe');
  });

  test('validateField returns true for valid input', () => {
    const { result } = renderHook(() => useAddressForm());

    let isValid = false;
    act(() => {
      isValid = result.current.validateField('receiverName', 'John Doe');
    });

    expect(isValid).toBe(true);
    expect(result.current.errors.receiverName).toBeNull();
  });

  test('validateField returns false and sets error for invalid input', () => {
    const { result } = renderHook(() => useAddressForm());

    let isValid = true;
    act(() => {
      isValid = result.current.validateField('receiverName', '');
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.receiverName).toBeTruthy();
  });

  test('validateAll returns false when required fields are empty', () => {
    const { result } = renderHook(() => useAddressForm());

    let isValid = true;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors.receiverName).toBeTruthy();
    expect(result.current.errors.phoneNumber).toBeTruthy();
    expect(result.current.errors.streetAddress).toBeTruthy();
    expect(result.current.errors.areaId).toBeTruthy();
  });

  test('validateAll returns true when all required fields are filled', () => {
    const { result } = renderHook(() => useAddressForm());

    act(() => {
      result.current.setFieldValue('receiverName', 'John Doe');
      result.current.setFieldValue('phoneNumber', '081234567890');
      result.current.setFieldValue('streetAddress', 'Jl. Sudirman');
      result.current.setFieldValue('areaId', 'AREA-123');
      result.current.setFieldValue('city', 'Jakarta');
      result.current.setFieldValue('postalCode', '12345');
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(true);
  });

  test('resetForm clears all values and errors', () => {
    const { result } = renderHook(() => useAddressForm());

    // Set some values and errors
    act(() => {
      result.current.setFieldValue('receiverName', 'John Doe');
      result.current.validateField('receiverName', '');
      result.current.setGeneralError('Some error');
    });

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values.receiverName).toBe('');
    expect(result.current.errors.receiverName).toBeNull();
    expect(result.current.generalError).toBeNull();
  });

  test('populateFromAddress fills form from Address object', () => {
    const { result } = renderHook(() => useAddressForm());

    const mockAddress = {
      id: 'addr-123',
      receiver_name: 'Jane Doe',
      phone_number: '089876543210',
      street_address: 'Jl. Thamrin',
      city: 'Jakarta Pusat',
      postal_code: '10110',
      province: 'DKI Jakarta',
      area_id: 'AREA-456',
      area_name: 'Menteng',
      is_default: true,
      latitude: null,
      longitude: null,
      created_at: '2024-01-01',
      user_id: 'user-123',
      city_id: null,
      country_code: null,
      profile_id: 'profile-123',
      province_id: null,
    };

    act(() => {
      result.current.populateFromAddress(mockAddress);
    });

    expect(result.current.values.receiverName).toBe('Jane Doe');
    expect(result.current.values.areaId).toBe('AREA-456');
    expect(result.current.values.areaName).toBe('Menteng');
  });

  test('handles legacy address with area_id but missing area_name', () => {
    const { result } = renderHook(() => useAddressForm());

    const legacyAddress = {
      id: 'addr-legacy',
      receiver_name: 'Legacy User',
      phone_number: '081111111111',
      street_address: 'Jl. Legacy No. 1',
      city: 'Jakarta Barat',
      postal_code: '11510',
      province: 'DKI Jakarta',
      area_id: 'AREA-LEGACY-123',
      area_name: null,
      is_default: false,
      latitude: null,
      longitude: null,
      created_at: '2024-01-01',
      user_id: 'user-123',
      city_id: null,
      country_code: null,
      profile_id: 'profile-123',
      province_id: null,
    };

    act(() => {
      result.current.populateFromAddress(legacyAddress);
    });

    expect(result.current.values.areaId).toBe('AREA-LEGACY-123');
    expect(result.current.values.areaName).toBe('');
    expect(result.current.values.receiverName).toBe('Legacy User');
    expect(result.current.values.city).toBe('Jakarta Barat');
  });
});
