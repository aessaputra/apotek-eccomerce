import { describe, expect, test } from '@jest/globals';
import type { Address } from '@/types/address';
import { getShippingRatesForAddress, searchBiteshipArea } from './shipping.service';

const mockInvoke = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    biteshipOriginAreaId: 'ORIGIN-AREA-ID',
    biteshipCouriers: 'jne,sicepat',
  },
}));

const baseAddress: Address = {
  id: 'address-1',
  profile_id: 'profile-1',
  receiver_name: 'John Doe',
  phone_number: '081234567890',
  street_address: 'Jl. Sudirman No. 1',
  city: 'Jakarta',
  city_id: 'DEST-AREA-ID',
  province: 'DKI Jakarta',
  province_id: null,
  district_id: null,
  subdistrict_id: null,
  postal_code: '12345',
  is_default: true,
  country_code: 'ID',
  latitude: null,
  longitude: null,
  created_at: '2025-01-01T00:00:00Z',
};

describe('shipping.service', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  test('maps rates response into shipping options', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        pricing: [
          {
            courier_name: 'JNE',
            courier_code: 'jne',
            courier_service_name: 'REG',
            courier_service_code: 'reg',
            shipping_type: 'parcel',
            price: 15000,
            currency: 'IDR',
            duration: '2-3 days',
          },
        ],
      },
      error: null,
    });

    const { data, error } = await getShippingRatesForAddress({
      address: baseAddress,
      package_weight_grams: 500,
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.destination_area_id).toBe('DEST-AREA-ID');
    expect(data?.destination_postal_code).toBeUndefined();
    expect(data?.options).toHaveLength(1);
    expect(data?.options[0]).toMatchObject({
      courier_name: 'JNE',
      courier_code: 'jne',
      service_name: 'REG',
      service_code: 'reg',
      price: 15000,
      estimated_delivery: '2-3 days',
    });

    const invokePayload = mockInvoke.mock.calls[0]?.[1] as {
      body?: { payload?: { items?: { quantity?: number }[] } };
    };
    expect(invokePayload.body?.payload?.items?.[0]?.quantity).toBe(1);
  });

  test('uses destination_postal_code when selected address has no area id mapping', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        pricing: [
          {
            courier_name: 'SiCepat',
            courier_code: 'sicepat',
            courier_service_name: 'BEST',
            courier_service_code: 'best',
            price: 18000,
            duration: '1-2 days',
          },
        ],
      },
      error: null,
    });

    const { data, error } = await getShippingRatesForAddress({
      address: { ...baseAddress, city_id: null, district_id: null, subdistrict_id: null },
      package_weight_grams: 700,
    });

    expect(error).toBeNull();
    expect(data?.options[0].courier_code).toBe('sicepat');
    expect(data?.destination_area_id).toBeUndefined();
    expect(data?.destination_postal_code).toBe(12345);

    const invokePayload = mockInvoke.mock.calls[0]?.[1] as {
      body?: { payload?: { destination_postal_code?: number; destination_area_id?: string } };
    };
    expect(invokePayload.body?.payload?.destination_postal_code).toBe(12345);
    expect(invokePayload.body?.payload?.destination_area_id).toBeUndefined();
  });

  test('returns validation error for invalid package weight', async () => {
    const { data, error } = await getShippingRatesForAddress({
      address: baseAddress,
      package_weight_grams: 0,
    });

    expect(data).toBeNull();
    expect(error?.message).toContain('Package weight must be greater than 0 grams.');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  test('searchBiteshipArea returns parsed area list', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        areas: [{ id: 'ID-1', name: 'Kemang, Jakarta' }],
      },
      error: null,
    });

    const { data, error } = await searchBiteshipArea('Kemang Jakarta');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('ID-1');
  });
});
