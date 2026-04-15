import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCartShipping } from '@/hooks/useCartShipping';
import type { Address } from '@/types/address';
import type { CartSnapshot } from '@/types/cart';

const mockGetShippingRatesForAddress = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/services/shipping.service', () => ({
  getShippingRatesForAddress: (...args: unknown[]) => mockGetShippingRatesForAddress(...args),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const baseAddress: Address = {
  id: 'address-1',
  profile_id: 'profile-1',
  receiver_name: 'User',
  phone_number: '08123456789',
  street_address: 'Jl. Test 1',
  city: 'Jakarta',
  city_id: 'CITY-1',
  province: 'DKI Jakarta',
  province_id: 'PROV-1',
  area_id: 'AREA-1',
  area_name: 'Jakarta',
  postal_code: '12345',
  is_default: true,
  country_code: 'ID',
  latitude: -6.2,
  longitude: 106.8,
  created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
};

const snapshot: CartSnapshot = {
  itemCount: 2,
  estimatedWeightGrams: 400,
  packageValue: 50000,
};

describe('useCartShipping', () => {
  beforeEach(() => {
    mockGetShippingRatesForAddress.mockReset();
  });

  it('recalculates shipping when the same address id gets new coordinates', async () => {
    mockGetShippingRatesForAddress
      .mockResolvedValueOnce({
        data: {
          destination_area_id: 'AREA-1',
          options: [
            {
              courier_name: 'Grab',
              courier_code: 'grab',
              service_name: 'Instant',
              service_code: 'instant',
              shipping_type: 'parcel',
              price: 18000,
              currency: 'IDR',
              estimated_delivery: '1 jam',
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          destination_area_id: 'AREA-1',
          options: [
            {
              courier_name: 'Grab',
              courier_code: 'grab',
              service_name: 'Instant',
              service_code: 'instant',
              shipping_type: 'parcel',
              price: 22000,
              currency: 'IDR',
              estimated_delivery: '45 menit',
            },
          ],
        },
        error: null,
      });

    const { result, rerender } = renderHook(
      ({ selectedAddress }: { selectedAddress: Address | null }) =>
        useCartShipping({
          selectedAddress,
          selectedAddressId: selectedAddress?.id ?? null,
          snapshot,
          isOffline: false,
        }),
      {
        initialProps: { selectedAddress: baseAddress },
      },
    );

    await waitFor(() => {
      expect(result.current.shippingOptions[0]?.price).toBe(18000);
    });

    rerender({
      selectedAddress: {
        ...baseAddress,
        latitude: -6.25,
        longitude: 106.85,
      },
    });

    await waitFor(() => {
      expect(mockGetShippingRatesForAddress).toHaveBeenCalledTimes(2);
      expect(result.current.shippingOptions[0]?.price).toBe(22000);
    });

    expect(mockGetShippingRatesForAddress.mock.calls[1]?.[0]).toMatchObject({
      address: expect.objectContaining({
        id: 'address-1',
        latitude: -6.25,
        longitude: 106.85,
      }),
    });
  });

  it('ignores stale quote responses after coordinates change on the same address', async () => {
    const firstRequest = createDeferred<{
      data: {
        destination_area_id: string;
        options: Record<string, unknown>[];
      };
      error: null;
    }>();
    const secondRequest = createDeferred<{
      data: {
        destination_area_id: string;
        options: Record<string, unknown>[];
      };
      error: null;
    }>();

    mockGetShippingRatesForAddress
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ selectedAddress }: { selectedAddress: Address | null }) =>
        useCartShipping({
          selectedAddress,
          selectedAddressId: selectedAddress?.id ?? null,
          snapshot,
          isOffline: false,
        }),
      {
        initialProps: { selectedAddress: baseAddress },
      },
    );

    await waitFor(() => {
      expect(mockGetShippingRatesForAddress).toHaveBeenCalledTimes(1);
    });

    rerender({
      selectedAddress: {
        ...baseAddress,
        latitude: -6.3,
        longitude: 106.9,
      },
    });

    await waitFor(() => {
      expect(mockGetShippingRatesForAddress).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      secondRequest.resolve({
        data: {
          destination_area_id: 'AREA-1',
          options: [
            {
              courier_name: 'Gojek',
              courier_code: 'gojek',
              service_name: 'Instant',
              service_code: 'instant',
              shipping_type: 'parcel',
              price: 26000,
              currency: 'IDR',
              estimated_delivery: '30 menit',
            },
          ],
        },
        error: null,
      });
      await secondRequest.promise;
    });

    await waitFor(() => {
      expect(result.current.shippingOptions[0]?.courier_code).toBe('gojek');
      expect(result.current.shippingOptions[0]?.price).toBe(26000);
    });

    await act(async () => {
      firstRequest.resolve({
        data: {
          destination_area_id: 'AREA-1',
          options: [
            {
              courier_name: 'Grab',
              courier_code: 'grab',
              service_name: 'Instant',
              service_code: 'instant',
              shipping_type: 'parcel',
              price: 18000,
              currency: 'IDR',
              estimated_delivery: '1 jam',
            },
          ],
        },
        error: null,
      });
      await firstRequest.promise;
    });

    await waitFor(() => {
      expect(result.current.shippingOptions[0]?.courier_code).toBe('gojek');
      expect(result.current.shippingOptions[0]?.price).toBe(26000);
    });
  });
});
