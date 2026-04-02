import config from '@/utils/config';
import type {
  GooglePlaceDetails,
  GooglePlaceDetailsNew,
  GooglePlacePrediction,
  GooglePlacePredictionNew,
  SelectedAddressSuggestion,
} from '@/types/geocoding';

const GOOGLE_PLACES_API_BASE = 'https://places.googleapis.com/v1';
const GOOGLE_GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api';

// Cache configuration for cost optimization
// Place IDs are permanent - safe to cache for extended periods
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedPlaceDetails {
  data: GooglePlaceDetails;
  cachedAt: number;
}

const placeDetailsCache = new Map<string, CachedPlaceDetails>();

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

const AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types';
// Essentials SKU fields only (excluding displayName which triggers Pro SKU)
// Cost: $0.007/request vs $0.015/request with displayName
const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,addressComponents,location,types';

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

function normalizePlaceId(value?: string): string {
  if (!value) {
    return '';
  }

  return value.startsWith('places/') ? value.replace('places/', '') : value;
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
    .map(suggestion => {
      const prediction = suggestion.placePrediction;
      const placeId = normalizePlaceId(prediction?.placeId ?? prediction?.place);
      const description = prediction?.text?.text ?? '';
      const mainText =
        prediction?.structuredFormat?.mainText?.text ?? description.split(',')[0] ?? '';
      const secondaryText =
        prediction?.structuredFormat?.secondaryText?.text ??
        description.split(',').slice(1).join(',').trim();

      if (!prediction || !placeId || !description) {
        return null;
      }

      const mappedPrediction: GooglePlacePrediction = {
        placeId,
        description,
        mainText,
        secondaryText,
        types: prediction.types ?? [],
      };

      return mappedPrediction;
    })
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

  // Check cache first (cost optimization: avoid API call if cached)
  const cached = getCachedPlaceDetails(normalizedPlaceId);
  if (cached) {
    return { data: cached, error: null };
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

  const placeDetails: GooglePlaceDetails = {
    placeId: normalizePlaceId(data.id) || placeId,
    name: data.formattedAddress?.split(',')[0] ?? 'Lokasi',
    formattedAddress: data.formattedAddress ?? '',
    coordinates: {
      latitude: data.location?.latitude ?? 0,
      longitude: data.location?.longitude ?? 0,
    },
    addressComponents: (data.addressComponents ?? []).map(component => ({
      longName: component.longText ?? '',
      shortName: component.shortText ?? '',
      types: component.types ?? [],
    })),
  };

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
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
} {
  const components = placeDetails.addressComponents;

  const streetNumber = components.find(c => c.types.includes('street_number'))?.longName ?? '';
  const route = components.find(c => c.types.includes('route'))?.longName ?? '';
  const subLocality =
    components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))
      ?.longName ?? '';

  // Fallback chain for city (Indonesian addresses vary in structure)
  const city =
    components.find(c => c.types.includes('locality'))?.longName ??
    components.find(c => c.types.includes('administrative_area_level_2'))?.longName ??
    components.find(c => c.types.includes('administrative_area_level_3'))?.longName ??
    components.find(c => c.types.includes('sublocality'))?.longName ??
    '';

  const administrativeArea =
    components.find(c => c.types.includes('administrative_area_level_1'))?.longName ?? '';
  const postalCode = components.find(c => c.types.includes('postal_code'))?.longName ?? '';

  const streetParts = [route, streetNumber].filter(Boolean);
  const streetAddress = streetParts.length > 0 ? streetParts.join(' ') : placeDetails.name;

  return {
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city,
    province: administrativeArea,
    postalCode,
    latitude: placeDetails.coordinates.latitude,
    longitude: placeDetails.coordinates.longitude,
  };
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

  const { data, error } = await fetchJson<{
    results: Array<{
      place_id: string;
      formatted_address: string;
      address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      geometry: {
        location: {
          lat: number;
          lng: number;
        };
      };
    }>;
    status: string;
  }>(url, params.signal);

  if (error) {
    return { data: null, error };
  }

  if (!data?.results || data.results.length === 0) {
    return { data: null, error: new Error('Alamat dari titik peta tidak ditemukan.') };
  }

  const result = data.results[0];
  const components = result.address_components;

  const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
  const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const locality = components.find(c => c.types.includes('locality'))?.long_name ?? '';
  const subLocality =
    components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))
      ?.long_name ?? '';
  const administrativeArea =
    components.find(c => c.types.includes('administrative_area_level_1'))?.long_name ?? '';
  const postalCode = components.find(c => c.types.includes('postal_code'))?.long_name ?? '';

  const streetParts = [route, streetNumber].filter(Boolean);
  const streetAddress =
    streetParts.length > 0 ? streetParts.join(' ') : result.formatted_address.split(',')[0];

  const address: SelectedAddressSuggestion = {
    id: result.place_id,
    placeId: result.place_id,
    fullAddress: result.formatted_address,
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city: locality,
    province: administrativeArea,
    postalCode,
    countryCode: 'ID',
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    accuracy: null,
  };

  return { data: address, error: null };
}
