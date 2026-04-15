import { describe, expect, test } from '@jest/globals';
import type { AddressInsert } from '@/types/address';

describe('AddressForm Save Payload', () => {
  test('save payload includes all area fields when area is selected', () => {
    // Simulate the payload construction from AddressForm.tsx
    const values = {
      receiverName: 'John Doe',
      phoneNumber: '081234567890',
      streetAddress: 'Jl. Sudirman No. 1',
      addressNote: 'Blok A2',
      areaId: 'AREA-123',
      areaName: 'Kemang, Jakarta Selatan',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      province: 'DKI Jakarta',
      isDefault: true,
    };

    const payload: AddressInsert = {
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

    expect(payload.area_id).toBe('AREA-123');
    expect(payload.area_name).toBe('Kemang, Jakarta Selatan');
    expect(payload.address_note).toBe('Blok A2');
  });

  test('save payload keeps area_id as the persisted shipping area identifier', () => {
    const values = {
      receiverName: 'Legacy User',
      phoneNumber: '081111111111',
      streetAddress: 'Jl. Legacy No. 1',
      addressNote: '',
      areaId: 'AREA-LEGACY-123',
      areaName: '',
      city: 'Jakarta Barat',
      postalCode: '11510',
      province: 'DKI Jakarta',
      isDefault: false,
    };

    const payload: AddressInsert = {
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

    expect(payload.area_id).toBe('AREA-LEGACY-123');
    expect(payload.address_note).toBeNull();
  });

  test('save payload trims user-editable string fields', () => {
    const values = {
      receiverName: '  John Doe  ',
      phoneNumber: '  081234567890  ',
      streetAddress: '  Jl. Sudirman No. 1  ',
      addressNote: '  Blok A2 dekat satpam  ',
      areaId: 'AREA-123',
      areaName: 'Kemang',
      city: '  Jakarta Selatan  ',
      postalCode: '  12345  ',
      province: '  DKI Jakarta  ',
      isDefault: true,
    };

    const payload: AddressInsert = {
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

    expect(payload.receiver_name).toBe('John Doe');
    expect(payload.phone_number).toBe('081234567890');
    expect(payload.street_address).toBe('Jl. Sudirman No. 1');
    expect(payload.address_note).toBe('Blok A2 dekat satpam');
    expect(payload.area_name).toBe('Kemang');
    expect(payload.city).toBe('Jakarta Selatan');
    expect(payload.postal_code).toBe('12345');
    expect(payload.province).toBe('DKI Jakarta');
  });

  test('save payload includes latitude and longitude when coordinates are set', () => {
    const values = {
      receiverName: 'John Doe',
      phoneNumber: '081234567890',
      streetAddress: 'Jl. Sudirman No. 1',
      addressNote: '',
      areaId: 'AREA-123',
      areaName: 'Kemang, Jakarta Selatan',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      province: 'DKI Jakarta',
      isDefault: true,
      latitude: -6.2088,
      longitude: 106.8456,
    };

    const payload: AddressInsert = {
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
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    };

    expect(payload.latitude).toBe(-6.2088);
    expect(payload.longitude).toBe(106.8456);
  });

  test('save payload excludes coordinates when not set', () => {
    const values = {
      receiverName: 'John Doe',
      phoneNumber: '081234567890',
      streetAddress: 'Jl. Sudirman No. 1',
      addressNote: '',
      areaId: 'AREA-123',
      areaName: 'Kemang, Jakarta Selatan',
      city: 'Jakarta Selatan',
      postalCode: '12345',
      province: 'DKI Jakarta',
      isDefault: true,
      latitude: null,
      longitude: null,
    };

    const payload: AddressInsert = {
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
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    };

    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
  });
});
