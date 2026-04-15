import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { AddressSuggestion } from '@/types/geocoding';
import { useAddressSuggestions } from '@/hooks/useAddressSuggestions';
import {
  convertPlaceDetailsToAddress,
  getAddressRecommendations,
  getPlaceDetails,
} from '@/services/googlePlaces.service';

jest.mock('expo-crypto', () => ({
  __esModule: true,
  randomUUID: jest.fn(() => 'session-token'),
}));

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    googleApiKey: 'test-api-key',
  },
}));

jest.mock('@/hooks/useDebounce', () => ({
  __esModule: true,
  useDebounce: (value: string) => value,
}));

jest.mock('@/services/googlePlaces.service', () => ({
  getPlacePredictions: jest.fn(async () => ({ data: [], error: null })),
  getPlaceDetails: jest.fn(async () => ({ data: null, error: null })),
  convertPlaceDetailsToAddress: jest.fn(() => ({
    streetAddress: '',
    city: '',
    province: '',
    postalCode: '',
    latitude: 0,
    longitude: 0,
  })),
  sanitizeAddressCandidate: jest.fn((value?: string) => value?.trim() ?? ''),
  getAddressRecommendations: jest.fn(),
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

describe('useAddressSuggestions initial recommendations flow', () => {
  const mockedGetAddressRecommendations = jest.mocked(getAddressRecommendations);
  const mockedGetPlaceDetails = jest.mocked(getPlaceDetails);
  const mockedConvertPlaceDetailsToAddress = jest.mocked(convertPlaceDetailsToAddress);

  beforeEach(() => {
    jest.clearAllMocks();

    let now = 1;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      now += 1;
      return now;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads address recommendations directly without enrichment step', async () => {
    const recommendations: AddressSuggestion[] = [
      {
        id: '1',
        placeId: '1',
        name: 'Jalan Ciruas Petir',
        fullAddress:
          'Jalan Ciruas Petir, RT.14/RW.4, Kp. Ampian, Ds. Pipitan, Walantaka, Kota Serang, Banten 42183',
        primaryText: 'Jalan Ciruas Petir',
        secondaryText: 'RT.14/RW.4, Kp. Ampian, Ds. Pipitan, Walantaka, Kota Serang, Banten 42183',
      },
    ];

    mockedGetAddressRecommendations.mockResolvedValue({ data: recommendations, error: null });

    const { result } = renderHook(() =>
      useAddressSuggestions({
        latitude: -6.2,
        longitude: 106.8,
      }),
    );

    await act(async () => {
      await result.current.loadInitialSuggestions();
    });

    expect(mockedGetAddressRecommendations).toHaveBeenCalledWith(
      { latitude: -6.2, longitude: 106.8 },
      expect.any(AbortSignal),
    );
    expect(result.current.results).toEqual(recommendations);
    expect(result.current.error).toBeNull();
  });

  it('does not allow stale recommendation results to overwrite newer request results', async () => {
    const firstDeferred = createDeferred<{ data: AddressSuggestion[]; error: Error | null }>();
    const secondSuggestions: AddressSuggestion[] = [
      {
        id: 'b',
        placeId: 'b',
        name: 'Jalan Walantaka',
        fullAddress: 'Jalan Walantaka, Pipitan, Kota Serang, Banten 42183',
        primaryText: 'Jalan Walantaka',
        secondaryText: 'Pipitan, Kota Serang, Banten 42183',
      },
    ];

    mockedGetAddressRecommendations
      .mockReturnValueOnce(firstDeferred.promise)
      .mockResolvedValueOnce({ data: secondSuggestions, error: null });

    const { result } = renderHook(() =>
      useAddressSuggestions({
        latitude: -6.2,
        longitude: 106.8,
      }),
    );

    await act(async () => {
      void result.current.loadInitialSuggestions({ latitude: -6.2, longitude: 106.8 });
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.loadInitialSuggestions({ latitude: -6.21, longitude: 106.81 });
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(secondSuggestions);
    });

    await act(async () => {
      firstDeferred.resolve({
        data: [
          {
            id: 'a',
            placeId: 'a',
            name: 'Jalan Lama',
            fullAddress: 'Jalan Lama, Kota Serang, Banten 42183',
            primaryText: 'Jalan Lama',
            secondaryText: 'Kota Serang, Banten 42183',
          },
        ],
        error: null,
      });
      await Promise.resolve();
    });

    expect(result.current.results).toEqual(secondSuggestions);
  });

  it('surfaces recommendation errors', async () => {
    mockedGetAddressRecommendations.mockResolvedValue({
      data: [],
      error: new Error('Gagal mengambil alamat'),
    });

    const { result } = renderHook(() =>
      useAddressSuggestions({
        latitude: -6.2,
        longitude: 106.8,
      }),
    );

    await act(async () => {
      await result.current.loadInitialSuggestions();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe('Gagal mengambil alamat');
  });

  it('preserves the selected suggestion label when details fallback to Lokasi', async () => {
    mockedGetPlaceDetails.mockResolvedValue({
      data: {
        placeId: 'place-1',
        name: 'Lokasi',
        formattedAddress: 'Lokasi, Kota Serang, Banten',
        coordinates: { latitude: -6.2, longitude: 106.8 },
        addressComponents: [],
      },
      error: null,
    });
    mockedConvertPlaceDetailsToAddress.mockReturnValue({
      streetAddress: 'Lokasi',
      city: 'Kota Serang',
      district: 'Walantaka',
      province: 'Banten',
      postalCode: '42183',
      latitude: -6.2,
      longitude: 106.8,
    });

    const { result } = renderHook(() => useAddressSuggestions());

    const suggestion: AddressSuggestion = {
      id: 'place-1',
      placeId: 'place-1',
      name: 'Jl. Raya Ciruas',
      fullAddress: 'Jl. Raya Ciruas No. 12, Kota Serang, Banten 42183',
      primaryText: 'Jl. Raya Ciruas No. 12',
      secondaryText: 'Kota Serang, Banten 42183',
    };

    let selected = null;

    await act(async () => {
      selected = await result.current.selectSuggestion(suggestion);
    });

    expect(selected).toMatchObject({
      streetAddress: 'Jl. Raya Ciruas No. 12',
      city: 'Kota Serang',
      province: 'Banten',
      postalCode: '42183',
    });
  });

  it('keeps place-details street address when it is already specific', async () => {
    mockedGetPlaceDetails.mockResolvedValue({
      data: {
        placeId: 'place-2',
        name: 'Jl. Sudirman',
        formattedAddress: 'Jl. Sudirman No. 8, Jakarta',
        coordinates: { latitude: -6.2, longitude: 106.8 },
        addressComponents: [],
      },
      error: null,
    });
    mockedConvertPlaceDetailsToAddress.mockReturnValue({
      streetAddress: 'Jl. Sudirman No. 8',
      city: 'Jakarta',
      district: 'Menteng',
      province: 'DKI Jakarta',
      postalCode: '10310',
      latitude: -6.2,
      longitude: 106.8,
    });

    const { result } = renderHook(() => useAddressSuggestions());

    const suggestion: AddressSuggestion = {
      id: 'place-2',
      placeId: 'place-2',
      name: 'Jl. Sudirman',
      fullAddress: 'Jl. Sudirman No. 8, Jakarta',
      primaryText: 'Jl. Sudirman No. 8',
      secondaryText: 'Jakarta',
    };

    let selected = null;

    await act(async () => {
      selected = await result.current.selectSuggestion(suggestion);
    });

    expect(selected).toMatchObject({
      streetAddress: 'Jl. Sudirman No. 8',
    });
  });
});
