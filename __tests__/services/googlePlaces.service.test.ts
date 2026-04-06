import { beforeEach, describe, expect, test } from '@jest/globals';
import type { SelectedAddressSuggestion } from '@/types/geocoding';
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

function createNearbySearchResponse(params: {
  places: Array<{
    id: string;
    displayName: string;
    formattedAddress: string;
    shortFormattedAddress?: string;
    primaryType?: string;
    primaryTypeDisplayName?: string;
    postalAddress?: {
      addressLines?: string[];
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
    };
    addressComponents?: Array<{
      longText?: string;
      shortText?: string;
      types?: string[];
    }>;
    latitude: number;
    longitude: number;
  }>;
}): Response {
  return {
    ok: true,
    json: async () => ({
      places: params.places.map(place => ({
        id: place.id,
        displayName: { text: place.displayName, languageCode: 'id' },
        formattedAddress: place.formattedAddress,
        shortFormattedAddress: place.shortFormattedAddress,
        primaryType: place.primaryType,
        primaryTypeDisplayName: place.primaryTypeDisplayName
          ? { text: place.primaryTypeDisplayName, languageCode: 'id' }
          : undefined,
        postalAddress: place.postalAddress,
        addressComponents: place.addressComponents,
        location: { latitude: place.latitude, longitude: place.longitude },
      })),
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

    test('filters autocomplete predictions when main text is a Plus Code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              placePrediction: {
                place: 'places/plus-1',
                placeId: 'plus-1',
                text: { text: 'V6FJ+Q3G, Pelawad, Ciruas' },
                structuredFormat: {
                  mainText: { text: 'V6FJ+Q3G' },
                  secondaryText: { text: 'Pelawad, Ciruas' },
                },
                types: ['geocode'],
              },
            },
            {
              placePrediction: {
                place: 'places/safe-1',
                placeId: 'safe-1',
                text: { text: 'Jalan Raya Serang, Ciruas' },
                structuredFormat: {
                  mainText: { text: 'Jalan Raya Serang' },
                  secondaryText: { text: 'Ciruas' },
                },
                types: ['route'],
              },
            },
          ],
        }),
      } as Response);

      const result = await getPlacePredictions('jalan', 'session-123');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.placeId).toBe('safe-1');
    });

    test('clears autocomplete secondary text when it starts with a Plus Code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          suggestions: [
            {
              placePrediction: {
                place: 'places/safe-2',
                placeId: 'safe-2',
                text: { text: 'Adismart Ciruas, V6FJ+R22' },
                structuredFormat: {
                  mainText: { text: 'Adismart Ciruas' },
                  secondaryText: { text: 'V6FJ+R22' },
                },
                types: ['establishment'],
              },
            },
          ],
        }),
      } as Response);

      const result = await getPlacePredictions('adis', 'session-123');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.mainText).toBe('Adismart Ciruas');
      expect(result.data[0]?.secondaryText).toBe('');
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
    test('searches nearby places and returns results with building names', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: 'Mie Gacoan Ciruas Serang',
              formattedAddress:
                'Mie Gacoan Ciruas Serang, Jalan Raya Serang Jkt, Pelawad, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-2',
              displayName: 'Adismart Ciruas',
              formattedAddress:
                'Adismart Ciruas, Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
            {
              id: 'place-3',
              displayName: 'Kantor Upt. Pengawasan Ketenagakerjaan',
              formattedAddress:
                'Kantor Upt. Pengawasan Ketenagakerjaan, Jalan Raya Serang Jakarta, Ranjeng, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.122,
              longitude: 106.172,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          placeId: 'place-1',
          name: 'Mie Gacoan Ciruas Serang',
          primaryText: 'Mie Gacoan Ciruas Serang',
          secondaryText: 'Jalan Raya Serang Jkt, Pelawad, Ciruas, Kab. Serang, Banten 42182',
          buildingName: 'Mie Gacoan Ciruas Serang',
        }),
      );
    });

    test('prefers shortFormattedAddress for secondary text', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: 'Adismart Ciruas',
              formattedAddress:
                'Adismart Ciruas, Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182, Indonesia',
              shortFormattedAddress:
                'Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data[0]?.secondaryText).toBe(
        'Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182',
      );
    });

    test('uses cached recommendations on repeated calls', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: 'Mie Gacoan',
              formattedAddress: 'Mie Gacoan, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-2',
              displayName: 'Adismart',
              formattedAddress: 'Adismart, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
          ],
        }),
      );

      const first = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });
      const second = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(first.error).toBeNull();
      expect(second.error).toBeNull();
      expect(second.data).toEqual(first.data);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('deduplicates nearby search results by address', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: 'Mie Gacoan',
              formattedAddress: 'Mie Gacoan, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-2',
              displayName: 'Mie Gacoan Cabang',
              formattedAddress: 'Mie Gacoan, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
            {
              id: 'place-3',
              displayName: 'Adismart',
              formattedAddress: 'Adismart, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.122,
              longitude: 106.172,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].placeId).toBe('place-1');
      expect(result.data[1].placeId).toBe('place-3');
    });

    test('falls back to primary type label when displayName is empty', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: '',
              formattedAddress: 'Jalan Raya Serang, Ciruas, Banten 42182',
              primaryType: 'restaurant',
              primaryTypeDisplayName: 'Restoran',
              latitude: -6.12,
              longitude: 106.17,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data[0]?.primaryText).toBe('Restoran');
      expect(result.data[0]?.secondaryText).toBe('Jalan Raya Serang, Ciruas, Banten 42182');
      expect(result.data[0]?.buildingName).toBeUndefined();
    });

    test('filters Nearby Search results when displayName is a Plus Code', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-plus-1',
              displayName: 'V6FJ+Q3G',
              formattedAddress: 'V6FJ+Q3G, Pelawad, Ciruas, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-plus-2',
              displayName: 'V6FJ+R22',
              formattedAddress: 'V6FJ+R22, Pelawad, Ciruas, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
            {
              id: 'place-good-1',
              displayName: 'Adismart Ciruas',
              formattedAddress: 'Adismart Ciruas, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.122,
              longitude: 106.172,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.placeId).toBe('place-good-1');
      expect(result.data.every(suggestion => !suggestion.primaryText.includes('+'))).toBe(true);
    });

    test('filters Nearby Search results when formattedAddress starts with a Plus Code', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-plus-address',
              displayName: 'Warung',
              formattedAddress: 'V6FJ+Q3G, Pelawad, Ciruas, Banten 42182',
              shortFormattedAddress: 'V6FJ+Q3G',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-safe',
              displayName: 'Apotek Sehat',
              formattedAddress: 'Apotek Sehat, Jalan Raya Serang, Ciruas, Banten 42182',
              shortFormattedAddress: 'Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.placeId).toBe('place-safe');
    });

    test('falls back to structured postal address when Google address strings are Plus Codes', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-structured-fallback',
              displayName: '',
              formattedAddress: 'V6FJ+R22, Pelawad, Ciruas, Banten 42182',
              shortFormattedAddress: 'V6FJ+R22',
              postalAddress: {
                addressLines: ['Jalan Raya Serang'],
                locality: 'Ciruas',
                administrativeArea: 'Banten',
                postalCode: '42182',
              },
              addressComponents: [
                { longText: 'Jalan Raya Serang', shortText: 'Jl. Raya Serang', types: ['route'] },
                { longText: 'Ciruas', shortText: 'Ciruas', types: ['locality'] },
                { longText: '42182', shortText: '42182', types: ['postal_code'] },
              ],
              latitude: -6.12,
              longitude: 106.17,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.primaryText).toBe('Jalan Raya Serang, Ciruas, Banten, 42182');
      expect(result.data[0]?.secondaryText).toBe('Jalan Raya Serang, Ciruas, 42182');
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

  describe('Nearby Search formatting', () => {
    test('Nearby Search returns displayName instead of Plus Codes', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-1',
              displayName: 'Mie Gacoan Ciruas',
              formattedAddress: 'Mie Gacoan Ciruas, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
            {
              id: 'place-2',
              displayName: 'Toko Kelontong',
              formattedAddress: 'Toko Kelontong, Jalan Raya Serang, Ciruas, Banten 42182',
              latitude: -6.121,
              longitude: 106.171,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.data.every(suggestion => !suggestion.primaryText.includes('+'))).toBe(true);
      expect(result.data[0].buildingName).toBe('Mie Gacoan Ciruas');
    });

    test('extracts building name from displayName in Nearby Search results', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-with-building',
              displayName: 'Adismart Ciruas',
              formattedAddress:
                'Adismart Ciruas, Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data[0].placeId).toBe('place-with-building');
      expect(result.data[0].buildingName).toBe('Adismart Ciruas');
      expect(result.data[0].fullAddress).toContain('Adismart Ciruas');
    });

    test('returns undefined buildingName when displayName is empty', async () => {
      mockFetch.mockResolvedValueOnce(
        createNearbySearchResponse({
          places: [
            {
              id: 'place-no-name',
              displayName: '',
              formattedAddress: 'Jalan Raya Serang, Citerep, Ciruas, Kab. Serang, Banten 42182',
              latitude: -6.12,
              longitude: 106.17,
            },
          ],
        }),
      );

      const result = await getAddressRecommendations({ latitude: -6.12, longitude: 106.17 });

      expect(result.error).toBeNull();
      expect(result.data[0].placeId).toBe('place-no-name');
      expect(result.data[0].buildingName).toBeUndefined();
    });
  });

  describe('reverseGeocodeCoordinates building name', () => {
    test('extracts building name from premise type in address_components', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              place_id: 'place-with-building',
              formatted_address:
                'Adismart Ciruas, Jalan Raya Serang Jkt, Citerep, Ciruas, Kab. Serang, Banten 42182',
              address_components: [
                {
                  long_name: 'Adismart Ciruas',
                  short_name: 'Adismart Ciruas',
                  types: ['premise'],
                },
                { long_name: 'Jalan Raya Serang', short_name: 'Jl. Raya Serang', types: ['route'] },
                {
                  long_name: 'Ciruas',
                  short_name: 'Ciruas',
                  types: ['administrative_area_level_3'],
                },
                {
                  long_name: 'Kabupaten Serang',
                  short_name: 'Serang',
                  types: ['administrative_area_level_2'],
                },
                {
                  long_name: 'Banten',
                  short_name: 'Banten',
                  types: ['administrative_area_level_1'],
                },
                { long_name: '42182', short_name: '42182', types: ['postal_code'] },
              ],
              types: ['premise'],
              geometry: { location: { lat: -6.12, lng: 106.17 } },
            },
          ],
          status: 'OK',
        }),
      } as Response);

      const result = await reverseGeocodeCoordinates({
        latitude: -6.12,
        longitude: 106.17,
      });

      expect(result.data?.placeId).toBe('place-with-building');
      expect(result.data?.buildingName).toBe('Adismart Ciruas');
      expect(result.data?.fullAddress).toContain('Adismart Ciruas');
    });

    test('returns undefined buildingName when no premise type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              place_id: 'street-only-place',
              formatted_address: 'Jalan Raya Serang, Citerep, Ciruas, Kab. Serang, Banten 42182',
              address_components: [
                { long_name: 'Jalan Raya Serang', short_name: 'Jl. Raya Serang', types: ['route'] },
                {
                  long_name: 'Ciruas',
                  short_name: 'Ciruas',
                  types: ['administrative_area_level_3'],
                },
              ],
              types: ['route'],
              geometry: { location: { lat: -6.12, lng: 106.17 } },
            },
          ],
          status: 'OK',
        }),
      } as Response);

      const result = await reverseGeocodeCoordinates({
        latitude: -6.12,
        longitude: 106.17,
      });

      expect(result.data?.placeId).toBe('street-only-place');
      expect(result.data?.buildingName).toBeUndefined();
    });

    test('includes buildingName in AddressSuggestion type', () => {
      const selectedAddress: SelectedAddressSuggestion = {
        id: 'test-id',
        placeId: 'test-place-id',
        fullAddress:
          'Adismart Ciruas, Jalan Raya Serang, Citerep, Ciruas, Kab. Serang, Banten 42182',
        streetAddress: 'Jalan Raya Serang',
        city: 'Ciruas',
        district: 'Ciruas',
        province: 'Banten',
        postalCode: '42182',
        countryCode: 'ID',
        latitude: -6.12,
        longitude: 106.17,
        accuracy: null,
        buildingName: 'Adismart Ciruas',
      };

      expect(selectedAddress.buildingName).toBe('Adismart Ciruas');
    });
  });
});
