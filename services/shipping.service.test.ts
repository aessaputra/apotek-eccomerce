import { describe, expect, test } from '@jest/globals';
import type { Address } from '@/types/address';
import { getShippingRatesForAddress, searchBiteshipArea, getAreaById } from './shipping.service';

const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
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
  area_name: null,
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
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();

    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-access-token',
          expires_at: futureExpiry,
        },
      },
    });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'refreshed-test-access-token',
          expires_at: futureExpiry,
        },
      },
      error: null,
    });
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
      body?: {
        payload?: {
          items?: { quantity?: number }[];
          origin_area_id?: string;
          couriers?: string;
        };
      };
    };
    expect(invokePayload.body?.payload?.items?.[0]?.quantity).toBe(1);
    expect(invokePayload.body?.payload?.origin_area_id).toBeUndefined();
    expect(invokePayload.body?.payload?.couriers).toBeUndefined();
    expect(
      (mockInvoke.mock.calls[0]?.[1] as { headers?: { Authorization?: string } }).headers,
    ).toEqual({ Authorization: 'Bearer test-access-token' });
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

  test('returns validation error for non-5-digit postal code when area ids are missing', async () => {
    const { data, error } = await getShippingRatesForAddress({
      address: {
        ...baseAddress,
        city_id: null,
        district_id: null,
        subdistrict_id: null,
        postal_code: '421831',
      },
      package_weight_grams: 500,
    });

    expect(data).toBeNull();
    expect(error?.message).toContain(
      'Selected address is missing destination area mapping and valid postal code.',
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  test('sends coordinates to Biteship when address has lat/lng for instant couriers', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        pricing: [
          {
            courier_name: 'Gojek',
            courier_code: 'gojek',
            courier_service_name: 'Instant',
            courier_service_code: 'instant',
            shipping_type: 'parcel',
            price: 25000,
            currency: 'IDR',
            duration: '1-2 hours',
          },
          {
            courier_name: 'Grab',
            courier_code: 'grab',
            courier_service_name: 'Same Day',
            courier_service_code: 'same_day',
            shipping_type: 'parcel',
            price: 28000,
            currency: 'IDR',
            duration: '2-4 hours',
          },
        ],
      },
      error: null,
    });

    const addressWithCoords: Address = {
      ...baseAddress,
      latitude: -6.2088,
      longitude: 106.8456,
    };

    const { data, error } = await getShippingRatesForAddress({
      address: addressWithCoords,
      package_weight_grams: 500,
      couriers: 'gojek,grab,lalamove',
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.options).toHaveLength(2);
    expect(data?.options[0].courier_code).toBe('gojek');
    expect(data?.options[1].courier_code).toBe('grab');

    const invokePayload = mockInvoke.mock.calls[0]?.[1] as {
      body?: {
        payload?: {
          destination_latitude?: number;
          destination_longitude?: number;
          origin_latitude?: number;
          origin_longitude?: number;
          couriers?: string;
        };
      };
    };

    expect(invokePayload.body?.payload?.destination_latitude).toBe(-6.2088);
    expect(invokePayload.body?.payload?.destination_longitude).toBe(106.8456);
    expect(invokePayload.body?.payload?.origin_latitude).toBeDefined();
    expect(invokePayload.body?.payload?.origin_longitude).toBeDefined();
    expect(invokePayload.body?.payload?.couriers).toBe('gojek,grab,lalamove');
  });

  test('does not send coordinates when address lat/lng is null', async () => {
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

    const invokePayload = mockInvoke.mock.calls[0]?.[1] as {
      body?: {
        payload?: {
          destination_latitude?: number;
          destination_longitude?: number;
          origin_latitude?: number;
          origin_longitude?: number;
        };
      };
    };

    expect(invokePayload.body?.payload?.destination_latitude).toBeUndefined();
    expect(invokePayload.body?.payload?.destination_longitude).toBeUndefined();
    expect(invokePayload.body?.payload?.origin_latitude).toBeUndefined();
    expect(invokePayload.body?.payload?.origin_longitude).toBeUndefined();
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

  test('getAreaById returns area by ID', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        areas: [
          {
            id: 'AREA-123',
            name: 'Kemang',
            administrative_division_level_2_name: 'Jakarta Selatan',
          },
        ],
      },
      error: null,
    });

    const { data, error } = await getAreaById('AREA-123');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.id).toBe('AREA-123');
    expect(data?.name).toBe('Kemang');
  });

  test('getAreaById returns null when exact ID match not found', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        areas: [
          {
            id: 'AREA-456',
            name: 'Kebayoran',
            administrative_division_level_2_name: 'Jakarta Selatan',
          },
        ],
      },
      error: null,
    });

    const { data, error } = await getAreaById('AREA-123');

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  test('getAreaById returns null when no areas found', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { areas: [] },
      error: null,
    });

    const { data, error } = await getAreaById('NON-EXISTENT');

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
