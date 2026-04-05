import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  __clearPlaceDetailsCache,
  __clearRecommendationCache,
  convertPlaceDetailsToAddress,
  getAddressRecommendations,
  getPlaceDetails,
  getPlacePredictions,
  reverseGeocodeCoordinates,
} from '@/services/googlePlaces.service';

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    googleApiKey: 'test-api-key',
  },
}));

function createReverseGeocodeResponse(params: {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}): Response {
  return {
    ok: true,
    json: async () => ({
      results: [
        {
          place_id: params.placeId,
          formatted_address: params.formattedAddress,
          address_components: [
            { long_name: 'Jalan Test', short_name: 'Jl. Test', types: ['route'] },
            { long_name: 'Kota Serang', short_name: 'Serang', types: ['locality'] },
            {
              long_name: 'Banten',
              short_name: 'Banten',
              types: ['administrative_area_level_1'],
            },
            { long_name: '42183', short_name: '42183', types: ['postal_code'] },
          ],
          geometry: { location: { lat: params.latitude, lng: params.longitude } },
        },
      ],
      status: 'OK',
    }),
  } as Response;
}

describe('googlePlaces.service', () => {
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  global.fetch = mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    __clearPlaceDetailsCache();
    __clearRecommendationCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPlacePredictions', () => {
    test('makes POST request to New API endpoint with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: [] }),
      } as Response);

      await getPlacePredictions('jalan sudirman', 'session-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:autocomplete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': 'test-api-key',
          }),
        }),
      );
    });

    test('includes correct request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: [] }),
      } as Response);

      await getPlacePredictions('jalan sudirman', 'session-123');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse((callArgs[1] as RequestInit).body as string);

      expect(body.input).toBe('jalan sudirman');
      expect(body.sessionToken).toBe('session-123');
      expect(body.languageCode).toBe('id');
      expect(body.includedRegionCodes).toEqual(['id']);
    });

    test('maps New API response correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              placePrediction: {
                place: 'places/ChIJ123',
                placeId: 'ChIJ123',
                text: { text: 'Jalan Sudirman, Jakarta' },
                structuredFormat: {
                  mainText: { text: 'Jalan Sudirman' },
                  secondaryText: { text: 'Jakarta' },
                },
                types: ['route'],
              },
            },
          ],
        }),
      } as Response);

      const result = await getPlacePredictions('jalan', 'session-123');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].placeId).toBe('ChIJ123');
      expect(result.data[0].description).toBe('Jalan Sudirman, Jakarta');
      expect(result.data[0].mainText).toBe('Jalan Sudirman');
    });

    test('handles API error correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'API not enabled' } }),
      } as Response);

      const result = await getPlacePredictions('test', 'session-123');

      expect(result.error).toBeDefined();
      expect(result.data).toEqual([]);
    });
  });

  describe('getPlaceDetails', () => {
    test('makes GET request with sessionToken query param', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'places/ChIJ123',
          formattedAddress: 'Test Address',
          addressComponents: [],
          location: { latitude: -6.2, longitude: 106.8 },
          types: [],
        }),
      } as Response);

      await getPlaceDetails('ChIJ123', 'session-123');

      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0] as string;

      expect(url).toContain('sessionToken=session-123');
      expect(url).toContain('languageCode=id');
    });

    test('maps response to GooglePlaceDetails format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'places/ChIJ123',
          formattedAddress: 'Jl. Sudirman, Jakarta',
          addressComponents: [{ longText: 'Jakarta', shortText: 'Jakarta', types: ['locality'] }],
          location: { latitude: -6.2088, longitude: 106.8456 },
          types: ['pharmacy'],
        }),
      } as Response);

      const result = await getPlaceDetails('ChIJ123', 'session-123');

      expect(result.data?.placeId).toBe('ChIJ123');
      expect(result.data?.name).toBe('Jl. Sudirman');
      expect(result.data?.coordinates.latitude).toBe(-6.2088);
    });

    test('uses cached result on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'places/ChIJ123',
          formattedAddress: 'Jl. Sudirman, Jakarta',
          addressComponents: [],
          location: { latitude: -6.2, longitude: 106.8 },
          types: [],
        }),
      } as Response);

      const result1 = await getPlaceDetails('ChIJ123', 'session-123');
      expect(result1.data?.placeId).toBe('ChIJ123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const result2 = await getPlaceDetails('ChIJ123', '');
      expect(result2.data?.placeId).toBe('ChIJ123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAddressRecommendations', () => {
    test('reverse geocodes center + 6 hex ring points and returns deduplicated results', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-1',
            formattedAddress:
              'Jalan Ciruas Petir, RT.14/RW.4, Kp. Ampian, Ds. Pipitan, Walantaka, Kota Serang, Banten 42183',
            latitude: -6.12,
            longitude: 106.17,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-1',
            formattedAddress:
              'Jalan Ciruas Petir, RT.14/RW.4, Kp. Ampian, Ds. Pipitan, Walantaka, Kota Serang, Banten 42183',
            latitude: -6.1201,
            longitude: 106.1701,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-2',
            formattedAddress: 'Jalan Raya Serang, Walantaka, Kota Serang, Banten 42183',
            latitude: -6.121,
            longitude: 106.171,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-3',
            formattedAddress: 'Jalan Raya Serang Barat, Walantaka, Kota Serang, Banten 42183',
            latitude: -6.122,
            longitude: 106.172,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-4',
            formattedAddress: 'Jalan Walantaka, Pipitan, Kota Serang, Banten 42183',
            latitude: -6.123,
            longitude: 106.173,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-5',
            formattedAddress: 'Jalan Pipitan, Walantaka, Kota Serang, Banten 42183',
            latitude: -6.124,
            longitude: 106.174,
          }),
        )
        .mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: 'place-6',
            formattedAddress: 'Jalan Ampian, Pipitan, Kota Serang, Banten 42183',
            latitude: -6.125,
            longitude: 106.175,
          }),
        );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(6);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          placeId: 'place-1',
          name: 'Jalan Ciruas Petir',
          primaryText: 'Jalan Ciruas Petir',
        }),
      );
      expect(mockFetch).toHaveBeenCalledTimes(7);
    });

    test('uses cached recommendations on repeated calls', async () => {
      for (let index = 0; index < 7; index += 1) {
        mockFetch.mockResolvedValueOnce(
          createReverseGeocodeResponse({
            placeId: `place-${index + 1}`,
            formattedAddress: `Jalan ${index + 1}, Walantaka, Kota Serang, Banten 42183`,
            latitude: -6.12 + index * 0.001,
            longitude: 106.17 + index * 0.001,
          }),
        );
      }

      const first = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });
      const second = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
      expect(second.data).toEqual(first.data);
      expect(mockFetch).toHaveBeenCalledTimes(7);
    });

    test('tries second ring at 80m when first ring yields fewer than 4 unique results', async () => {
      const firstRingResponses = [
        createReverseGeocodeResponse({
          placeId: 'place-1',
          formattedAddress: 'Jalan Ciruas Petir, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.12,
          longitude: 106.17,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-1',
          formattedAddress: 'Jalan Ciruas Petir, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.1201,
          longitude: 106.1701,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-2',
          formattedAddress: 'Jalan Pipitan, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.121,
          longitude: 106.171,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-2',
          formattedAddress: 'Jalan Pipitan, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.1211,
          longitude: 106.1711,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-1',
          formattedAddress: 'Jalan Ciruas Petir, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.1202,
          longitude: 106.1702,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-2',
          formattedAddress: 'Jalan Pipitan, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.1212,
          longitude: 106.1712,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-1',
          formattedAddress: 'Jalan Ciruas Petir, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.1203,
          longitude: 106.1703,
        }),
      ];

      const secondRingResponses = [
        createReverseGeocodeResponse({
          placeId: 'place-3',
          formattedAddress: 'Jalan Ampian, Pipitan, Kota Serang, Banten 42183',
          latitude: -6.13,
          longitude: 106.18,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-4',
          formattedAddress: 'Jalan Walantaka, Pipitan, Kota Serang, Banten 42183',
          latitude: -6.131,
          longitude: 106.181,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-5',
          formattedAddress: 'Jalan Ciruas Baru, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.132,
          longitude: 106.182,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-6',
          formattedAddress: 'Jalan Serang Timur, Pipitan, Kota Serang, Banten 42183',
          latitude: -6.133,
          longitude: 106.183,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-7',
          formattedAddress: 'Jalan Pipitan Selatan, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.134,
          longitude: 106.184,
        }),
        createReverseGeocodeResponse({
          placeId: 'place-8',
          formattedAddress: 'Jalan Cibanten, Walantaka, Kota Serang, Banten 42183',
          latitude: -6.135,
          longitude: 106.185,
        }),
      ];

      [...firstRingResponses, ...secondRingResponses].forEach(response => {
        mockFetch.mockResolvedValueOnce(response);
      });

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(6);
      expect(mockFetch).toHaveBeenCalledTimes(13);
    });
  });

  describe('convertPlaceDetailsToAddress', () => {
    test('extracts street address correctly', () => {
      const details = {
        placeId: 'ChIJ123',
        name: 'Test Location',
        formattedAddress: 'Jl. Sudirman No. 1, Jakarta',
        coordinates: { latitude: -6.2, longitude: 106.8 },
        addressComponents: [
          { longName: '1', shortName: '1', types: ['street_number'] },
          { longName: 'Jalan Sudirman', shortName: 'Jl. Sudirman', types: ['route'] },
          { longName: 'Jakarta', shortName: 'Jakarta', types: ['locality'] },
          {
            longName: 'DKI Jakarta',
            shortName: 'DKI Jakarta',
            types: ['administrative_area_level_1'],
          },
          { longName: '12345', shortName: '12345', types: ['postal_code'] },
        ],
      };

      const result = convertPlaceDetailsToAddress(details);

      expect(result.streetAddress).toBe('Jalan Sudirman 1');
      expect(result.city).toBe('Jakarta');
      expect(result.province).toBe('DKI Jakarta');
      expect(result.postalCode).toBe('12345');
    });

    test('uses fallback chain for city', () => {
      const details = {
        placeId: 'ChIJ123',
        name: 'Test',
        formattedAddress: 'Test Address',
        coordinates: { latitude: 0, longitude: 0 },
        addressComponents: [
          {
            longName: 'Kota Tangerang',
            shortName: 'Tangerang',
            types: ['administrative_area_level_2'],
          },
        ],
      };

      const result = convertPlaceDetailsToAddress(details);

      expect(result.city).toBe('Kota Tangerang');
    });
  });

  describe('reverseGeocodeCoordinates', () => {
    test('makes request to Legacy Geocoding API and returns fullAddress', async () => {
      mockFetch.mockResolvedValueOnce(
        createReverseGeocodeResponse({
          placeId: 'ChIJ123',
          formattedAddress: 'Jl. Sudirman, Jakarta',
          latitude: -6.2,
          longitude: 106.8,
        }),
      );

      const result = await reverseGeocodeCoordinates({
        latitude: -6.2,
        longitude: 106.8,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('maps.googleapis.com/maps/api/geocode/json'),
        expect.anything(),
      );
      expect(result.data?.placeId).toBe('ChIJ123');
      expect(result.data?.latitude).toBe(-6.2);
      expect(result.data?.fullAddress).toBe('Jl. Sudirman, Jakarta');
    });

    test('returns error when no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], status: 'ZERO_RESULTS' }),
      } as Response);

      const result = await reverseGeocodeCoordinates({
        latitude: -6.2,
        longitude: 106.8,
      });

      expect(result.error?.message).toContain('Alamat dari titik peta tidak ditemukan');
    });
  });
});
