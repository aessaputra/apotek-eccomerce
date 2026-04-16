import config from '@/utils/config';
import type {
  AddressSuggestion,
  GooglePlaceDetails,
  GooglePlaceDetailsNew,
  GooglePlacePrediction,
  GooglePlacePredictionNew,
  SelectedAddressSuggestion,
} from '@/types/geocoding';
import {
  convertPlaceDetailsToAddressValue,
  deduplicateSuggestions,
  mapAutocompleteSuggestionToPrediction,
  mapNearbyPlaceToSuggestion,
  mapPlaceDetailsResponseToDetails,
  mapReverseGeocodeResultToAddress,
  NearbyPlaceResult,
  ReverseGeocodeResponse,
} from './googlePlaces.mappers';
import { normalizePlaceId, sanitizeAddressCandidate } from './googlePlaces.shared';

const GOOGLE_PLACES_API_BASE = 'https://places.googleapis.com/v1';
const GOOGLE_GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api';

// Cache configuration for cost optimization
// Place IDs are permanent - safe to cache for extended periods
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RECOMMENDATION_CACHE_TTL_MS = 10 * 60 * 1000;
const RECOMMENDATION_TARGET_COUNT = 6;

interface CachedPlaceDetails {
  data: GooglePlaceDetails;
  cachedAt: number;
}

interface CachedAddressRecommendations {
  data: AddressSuggestion[];
  cachedAt: number;
}

interface CachedReverseGeocodeResult {
  data: SelectedAddressSuggestion;
  cachedAt: number;
}

const placeDetailsCache = new Map<string, CachedPlaceDetails>();
const reverseGeocodeCache = new Map<string, CachedReverseGeocodeResult>();
const recommendationCache = new Map<string, CachedAddressRecommendations>();

function getRecommendationCacheKey(lat: number, lng: number): string {
  return `rec:${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function getReverseGeocodeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export { sanitizeAddressCandidate };

async function searchNearbyPlaces(
  location: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<{ data: AddressSuggestion[]; error: Error | null }> {
  const configurationError = ensureConfigured();
  if (configurationError) {
    return { data: [], error: configurationError };
  }

  const requestBody = {
    locationRestriction: {
      circle: {
        center: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        radius: 500.0,
      },
    },
    maxResultCount: 10,
    rankPreference: 'DISTANCE',
    languageCode: 'id',
    regionCode: 'ID',
  };

  const url = `${GOOGLE_PLACES_API_BASE}/places:searchNearby`;

  if (__DEV__) {
    console.log('[GooglePlaces] Nearby search for location:', location);
  }

  const { data, error } = await fetchPlacesJson<NearbyPlaceResult>({
    url,
    method: 'POST',
    body: requestBody,
    signal,
    fieldMask: NEARBY_SEARCH_FIELD_MASK,
  });

  if (error) {
    return { data: [], error };
  }

  if (!data?.places || data.places.length === 0) {
    return { data: [], error: null };
  }

  const suggestions = data.places
    .map(mapNearbyPlaceToSuggestion)
    .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null);

  if (__DEV__) {
    console.log('[GooglePlaces] Nearby search results:', suggestions.length);
  }

  return { data: suggestions, error: null };
}

export async function getAddressRecommendations(
  location: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<{ data: AddressSuggestion[]; error: Error | null }> {
  const configurationError = ensureConfigured();
  if (configurationError) {
    return { data: [], error: configurationError };
  }

  const cacheKey = getRecommendationCacheKey(location.latitude, location.longitude);
  const cached = recommendationCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < RECOMMENDATION_CACHE_TTL_MS) {
    if (__DEV__) {
      console.log('[GooglePlaces] Address recommendation cache hit');
    }
    return { data: cached.data, error: null };
  }

  const { data: nearbyResults, error: nearbyError } = await searchNearbyPlaces(location, signal);

  if (nearbyError) {
    return { data: [], error: nearbyError };
  }

  const finalResults = deduplicateSuggestions(nearbyResults).slice(0, RECOMMENDATION_TARGET_COUNT);
  recommendationCache.set(cacheKey, { data: finalResults, cachedAt: Date.now() });

  if (__DEV__) {
    console.log('[GooglePlaces] Address recommendations:', finalResults.length);
  }

  return { data: finalResults, error: null };
}

function getCachedPlaceDetails(placeId: string): GooglePlaceDetails | null {
  const cached = placeDetailsCache.get(placeId);
  if (!cached) return null;

  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL_MS) {
    placeDetailsCache.delete(placeId);
    return null;
  }

  if (__DEV__) {
    console.log('[GooglePlaces] Cache hit for place:', placeId);
  }
  return cached.data;
}

function setCachedPlaceDetails(placeId: string, data: GooglePlaceDetails): void {
  placeDetailsCache.set(placeId, { data, cachedAt: Date.now() });
}

// Exported for testing only
export function __clearPlaceDetailsCache(): void {
  placeDetailsCache.clear();
}

// Exported for testing only
export function __clearRecommendationCache(): void {
  recommendationCache.clear();
  reverseGeocodeCache.clear();
}

const AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types';
// Essentials SKU fields only (excluding displayName which triggers Pro SKU)
// Cost: $0.007/request vs $0.015/request with displayName
const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,addressComponents,location,types';
const NEARBY_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.primaryType,places.primaryTypeDisplayName,places.postalAddress,places.addressComponents,places.location';

function getGoogleApiKey(): string {
  return config.googleApiKey?.trim() ?? '';
}

function ensureConfigured(): Error | null {
  return getGoogleApiKey() ? null : new Error('Google Places API belum dikonfigurasi.');
}

async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return { data: null, error: new Error(`HTTP ${response.status}: ${response.statusText}`) };
    }
    const data = await response.json();
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        data: null,
        error: new Error(`Google API Error: ${data.status} - ${data.error_message || ''}`),
      };
    }
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error };
    }
    return { data: null, error: new Error('Network error') };
  }
}

async function fetchPlacesJson<T>(params: {
  url: string;
  signal?: AbortSignal;
  method?: 'GET' | 'POST';
  body?: unknown;
  fieldMask: string;
}): Promise<{ data: T | null; error: Error | null }> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getGoogleApiKey(),
      'X-Goog-FieldMask': params.fieldMask,
    };

    const response = await fetch(params.url, {
      method: params.method ?? 'GET',
      headers,
      signal: params.signal,
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorPayload = (await response.json()) as {
          error?: { message?: string; status?: string };
        };
        const apiMessage = errorPayload.error?.message;
        if (apiMessage) {
          message = `Google Places API Error: ${apiMessage}`;
        }
      } catch {}
      return { data: null, error: new Error(message) };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error };
    }
    return { data: null, error: new Error('Network error') };
  }
}

export async function getPlacePredictions(
  input: string,
  sessionToken: string,
  options?: {
    country?: string;
    locationBias?: { latitude: number; longitude: number; radius: number };
    types?: string[];
    signal?: AbortSignal;
  },
): Promise<{ data: GooglePlacePrediction[]; error: Error | null }> {
  const configurationError = ensureConfigured();
  if (configurationError) {
    return { data: [], error: configurationError };
  }

  const requestBody: {
    input: string;
    sessionToken: string;
    languageCode: string;
    includedRegionCodes?: string[];
    locationBias?: {
      circle: {
        center: { latitude: number; longitude: number };
        radius: number;
      };
    };
    includedPrimaryTypes?: string[];
  } = {
    input,
    sessionToken,
    languageCode: 'id',
  };

  const countryCode = (options?.country ?? 'id').trim().toLowerCase();
  if (countryCode) {
    requestBody.includedRegionCodes = [countryCode];
  }

  if (options?.locationBias) {
    const { latitude, longitude, radius } = options.locationBias;
    requestBody.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius,
      },
    };
  }

  if (options?.types?.length) {
    requestBody.includedPrimaryTypes = options.types;
  }

  const url = `${GOOGLE_PLACES_API_BASE}/places:autocomplete`;

  if (__DEV__) {
    console.log('[GooglePlaces] Autocomplete endpoint:', url);
  }

  const { data, error } = await fetchPlacesJson<GooglePlacePredictionNew>({
    url,
    method: 'POST',
    body: requestBody,
    signal: options?.signal,
    fieldMask: AUTOCOMPLETE_FIELD_MASK,
  });

  if (error) {
    return { data: [], error };
  }

  if (!data?.suggestions) {
    return { data: [], error: null };
  }

  const predictions = data.suggestions
    .map(mapAutocompleteSuggestionToPrediction)
    .filter((prediction): prediction is GooglePlacePrediction => prediction !== null);

  if (__DEV__) {
    console.log('[GooglePlaces] Predictions found:', predictions.length);
  }

  return { data: predictions, error: null };
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<{ data: GooglePlaceDetails | null; error: Error | null }> {
  const configurationError = ensureConfigured();
  if (configurationError) {
    return { data: null, error: configurationError };
  }

  const normalizedPlaceId = normalizePlaceId(placeId);

  // Skip cache when sessionToken is present — Google requires the Place Details
  // request to close an autocomplete billing session. Returning cached data would
  // leave the session open and defeat session-token cost optimization.
  if (!sessionToken) {
    const cached = getCachedPlaceDetails(normalizedPlaceId);
    if (cached) {
      return { data: cached, error: null };
    }
  }

  const params = new URLSearchParams({
    languageCode: 'id',
    sessionToken: sessionToken,
  });

  const url = `${GOOGLE_PLACES_API_BASE}/places/${encodeURIComponent(normalizedPlaceId)}?${params.toString()}`;

  if (__DEV__) {
    console.log('[GooglePlaces] Details endpoint:', url);
  }

  const { data, error } = await fetchPlacesJson<GooglePlaceDetailsNew>({
    url,
    signal,
    fieldMask: PLACE_DETAILS_FIELD_MASK,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: new Error('Detail tempat tidak ditemukan.') };
  }

  const placeDetails = mapPlaceDetailsResponseToDetails(data, normalizedPlaceId);

  // Cache the result for future requests (cost optimization)
  setCachedPlaceDetails(normalizedPlaceId, placeDetails);

  if (__DEV__) {
    console.log('[GooglePlaces] Place details:', {
      name: placeDetails.name,
      coordinates: placeDetails.coordinates,
    });
  }

  return { data: placeDetails, error: null };
}

export function convertPlaceDetailsToAddress(placeDetails: GooglePlaceDetails): {
  streetAddress: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
} {
  return convertPlaceDetailsToAddressValue(placeDetails);
}

export async function reverseGeocodeCoordinates(params: {
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}): Promise<{ data: SelectedAddressSuggestion | null; error: Error | null }> {
  const configurationError = ensureConfigured();
  if (configurationError) {
    return { data: null, error: configurationError };
  }

  const cacheKey = getReverseGeocodeCacheKey(params.latitude, params.longitude);
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    if (__DEV__) {
      console.log('[GooglePlaces] Reverse geocode cache hit');
    }
    return { data: cached.data, error: null };
  }

  const urlParams = new URLSearchParams({
    latlng: `${params.latitude},${params.longitude}`,
    key: getGoogleApiKey(),
    language: 'id',
  });

  const url = `${GOOGLE_GEOCODING_API_BASE}/geocode/json?${urlParams.toString()}`;

  if (__DEV__) {
    const logParams = new URLSearchParams({
      latlng: `${params.latitude},${params.longitude}`,
      key: '[REDACTED]',
      language: 'id',
    });
    const logUrl = `${GOOGLE_GEOCODING_API_BASE}/geocode/json?${logParams.toString()}`;
    console.log('[GooglePlaces] Reverse geocode URL:', logUrl);
  }

  const { data, error } = await fetchJson<ReverseGeocodeResponse>(url, params.signal);

  if (error) {
    return { data: null, error };
  }

  if (!data?.results || data.results.length === 0) {
    return { data: null, error: new Error('Alamat dari titik peta tidak ditemukan.') };
  }

  const address = mapReverseGeocodeResultToAddress(data.results[0]);

  reverseGeocodeCache.set(cacheKey, { data: address, cachedAt: Date.now() });

  return { data: address, error: null };
}
