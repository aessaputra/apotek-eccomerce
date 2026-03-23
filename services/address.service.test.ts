import { describe, expect, test } from '@jest/globals';
import { toByteshipShippingAddress } from './address.service';
import type { Address } from '@/types/address';

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const baseAddress: Address = {
  id: 'addr-1',
  profile_id: 'profile-1',
  receiver_name: '  John Doe  ',
  phone_number: ' 081234567890 ',
  street_address: ' Jl. Sudirman No. 1 ',
  city: ' Jakarta ',
  city_id: null,
  province: ' DKI Jakarta ',
  province_id: null,
  district_id: null,
  subdistrict_id: null,
  area_name: null,
  postal_code: ' 12345 ',
  is_default: false,
  country_code: null,
  latitude: null,
  longitude: null,
  created_at: '2025-01-01T00:00:00Z',
};

describe('toByteshipShippingAddress', () => {
  test('maps existing address fields into Byteship destination shape', () => {
    const result = toByteshipShippingAddress(baseAddress);

    expect(result).toEqual({
      recipient_name: 'John Doe',
      phone_number: '081234567890',
      street_address: 'Jl. Sudirman No. 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postal_code: '12345',
      country_code: 'ID',
    });
  });

  test('includes coordinates when address row has latitude and longitude', () => {
    const result = toByteshipShippingAddress({
      ...baseAddress,
      country_code: 'id',
      latitude: -6.2,
      longitude: 106.8,
    });

    expect(result.latitude).toBe(-6.2);
    expect(result.longitude).toBe(106.8);
    expect(result.country_code).toBe('ID');
  });

  test('omits coordinates when only one coordinate value exists', () => {
    const result = toByteshipShippingAddress({
      ...baseAddress,
      latitude: -6.2,
      longitude: null,
    });

    expect(result.latitude).toBeUndefined();
    expect(result.longitude).toBeUndefined();
  });

  test('throws when province is missing because shipping payload requires province', () => {
    expect(() =>
      toByteshipShippingAddress({
        ...baseAddress,
        province: null,
      }),
    ).toThrow('Address is missing required field: province');
  });
});
