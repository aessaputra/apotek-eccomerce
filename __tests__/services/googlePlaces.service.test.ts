import { describe, expect, test, beforeEach } from '@jest/globals';
import {
  getPlacePredictions,
  getPlaceDetails,
  convertPlaceDetailsToAddress,
  reverseGeocodeCoordinates,
  __clearPlaceDetailsCache,
} from '@/services/googlePlaces.service';

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    googleApiKey: 'test-api-key',
  },
}));

describe('googlePlaces.service', () => {
  const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
    __clearPlaceDetailsCache();
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

      const result2 = await getPlaceDetails('ChIJ123', 'session-456');
      expect(result2.data?.placeId).toBe('ChIJ123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
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
    test('makes request to Legacy Geocoding API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              place_id: 'ChIJ123',
              formatted_address: 'Jl. Sudirman, Jakarta',
              address_components: [
                { long_name: 'Jakarta', short_name: 'Jakarta', types: ['locality'] },
              ],
              geometry: { location: { lat: -6.2, lng: 106.8 } },
            },
          ],
          status: 'OK',
        }),
      } as Response);

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
