import { useState, useCallback, useEffect, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import { useDebounce } from './useDebounce';
import config from '@/utils/config';
import {
  getPlacePredictions,
  getPlaceDetails,
  convertPlaceDetailsToAddress,
  getAddressRecommendations,
} from '@/services/googlePlaces.service';
import type {
  AddressSuggestion,
  GeocodingProximity,
  SelectedAddressSuggestion,
} from '@/types/geocoding';

export interface UseAddressSuggestionsReturn {
  query: string;
  setQuery: (query: string) => void;
  results: AddressSuggestion[];
  isLoading: boolean;
  isRetrieving: boolean;
  error: string | null;
  hasConfiguredToken: boolean;
  clearAll: () => void;
  search: (input: string, locationBias?: GeocodingProximity | null) => Promise<void>;
  loadInitialSuggestions: (locationBias?: GeocodingProximity | null) => Promise<void>;
  selectSuggestion: (suggestion: AddressSuggestion) => Promise<SelectedAddressSuggestion | null>;
}

export function useAddressSuggestions(
  initialLocationBias?: GeocodingProximity | null,
): UseAddressSuggestionsReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const currentRequestRef = useRef(0);
  const currentAbortController = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const locationBiasRef = useRef<GeocodingProximity | null>(initialLocationBias ?? null);

  const hasConfiguredToken = config.googleApiKey.trim().length > 0;

  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = Crypto.randomUUID();
    }
    return sessionTokenRef.current;
  }, []);

  const clearAll = useCallback(() => {
    currentRequestRef.current += 1;
    currentAbortController.current?.abort();
    currentAbortController.current = null;
    sessionTokenRef.current = null;
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
    setIsRetrieving(false);
  }, []);

  const nextRequestId = useCallback(() => {
    const requestId = currentRequestRef.current + 1;
    currentRequestRef.current = requestId;
    return requestId;
  }, []);

  const search = useCallback(
    async (input: string, locationBias?: GeocodingProximity | null) => {
      const trimmed = input.trim();

      if (locationBias !== undefined) {
        locationBiasRef.current = locationBias;
      }

      if (trimmed.length < 2) {
        nextRequestId();
        currentAbortController.current?.abort();
        currentAbortController.current = null;
        setResults([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!hasConfiguredToken) {
        setResults([]);
        setError('Fitur pencarian alamat belum tersedia.');
        setIsLoading(false);
        return;
      }

      const requestId = nextRequestId();
      currentAbortController.current?.abort();

      const controller = new AbortController();
      currentAbortController.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: searchError } = await getPlacePredictions(trimmed, getSessionToken(), {
          country: 'id',
          locationBias: locationBiasRef.current
            ? {
                latitude: locationBiasRef.current.latitude,
                longitude: locationBiasRef.current.longitude,
                radius: 10000,
              }
            : undefined,
          signal: controller.signal,
        });

        if (currentRequestRef.current !== requestId) {
          return;
        }

        if (searchError) {
          setResults([]);
          setError(searchError.message);
          return;
        }

        const suggestions: AddressSuggestion[] = data.map(prediction => ({
          id: prediction.placeId,
          placeId: prediction.placeId,
          name: prediction.mainText,
          fullAddress: prediction.description,
          primaryText: prediction.mainText,
          secondaryText: prediction.secondaryText,
        }));

        setResults(suggestions);
        setError(null);
      } catch (searchError) {
        if (currentRequestRef.current === requestId) {
          if (__DEV__) {
            console.warn('[useAddressSuggestions] search failed', searchError);
          }
          setResults([]);
          setError('Gagal mencari rekomendasi alamat.');
        }
      } finally {
        if (currentRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [getSessionToken, hasConfiguredToken, nextRequestId],
  );

  const loadInitialSuggestions = useCallback(
    async (locationBias?: GeocodingProximity | null) => {
      if (locationBias !== undefined) {
        locationBiasRef.current = locationBias;
      }

      if (!locationBiasRef.current) {
        return;
      }

      if (!hasConfiguredToken) {
        setResults([]);
        setError('Fitur pencarian alamat belum tersedia.');
        return;
      }

      const requestId = nextRequestId();
      currentAbortController.current?.abort();

      const controller = new AbortController();
      currentAbortController.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: searchError } = await getAddressRecommendations(
          {
            latitude: locationBiasRef.current.latitude,
            longitude: locationBiasRef.current.longitude,
          },
          controller.signal,
        );

        if (currentRequestRef.current !== requestId) {
          return;
        }

        if (searchError) {
          setResults([]);
          setError(searchError.message);
          return;
        }

        setResults(data);
        setError(null);
      } catch (searchError) {
        if (__DEV__) {
          console.warn('[useAddressSuggestions] initial recommendations failed', searchError);
        }
        if (currentRequestRef.current === requestId) {
          setResults([]);
          setError('Gagal memuat rekomendasi alamat.');
        }
      } finally {
        if (currentRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [hasConfiguredToken, nextRequestId],
  );

  const selectSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      if (!hasConfiguredToken) {
        setError('Fitur pencarian alamat belum tersedia.');
        return null;
      }

      setIsRetrieving(true);
      setError(null);

      try {
        const { data, error: detailsError } = await getPlaceDetails(
          suggestion.placeId,
          getSessionToken(),
        );

        if (detailsError || !data) {
          setError(detailsError?.message ?? 'Detail alamat tidak ditemukan.');
          return null;
        }

        const address = convertPlaceDetailsToAddress(data);

        setQuery('');
        setResults([]);
        setError(null);
        sessionTokenRef.current = null;

        return {
          id: suggestion.id,
          placeId: suggestion.placeId,
          fullAddress: data.formattedAddress,
          streetAddress: address.streetAddress,
          city: address.city,
          district: address.district,
          province: address.province,
          postalCode: address.postalCode,
          countryCode: 'ID',
          latitude: address.latitude,
          longitude: address.longitude,
          accuracy: null,
        };
      } catch (retrieveFailure) {
        if (__DEV__) {
          console.warn('[useAddressSuggestions] retrieve failed', retrieveFailure);
        }
        setError('Gagal mengambil detail alamat.');
        return null;
      } finally {
        setIsRetrieving(false);
      }
    },
    [getSessionToken, hasConfiguredToken],
  );

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      search(debouncedQuery);
    } else {
      nextRequestId();
      currentAbortController.current?.abort();
      currentAbortController.current = null;
      sessionTokenRef.current = null;
      setError(null);

      if (debouncedQuery.trim().length > 0) {
        setResults([]);
        setIsLoading(false);
      }
    }
  }, [debouncedQuery, nextRequestId, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isRetrieving,
    error,
    hasConfiguredToken,
    clearAll,
    search,
    loadInitialSuggestions,
    selectSuggestion,
  };
}
