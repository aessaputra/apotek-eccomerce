import config from '@/utils/config';
import type {
  AddressSuggestion,
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

interface NearbyPlaceResult {
  places?: Array<{
    id?: string;
    displayName?: {
      text?: string;
      languageCode?: string;
    };
    formattedAddress?: string;
    shortFormattedAddress?: string;
    primaryType?: string;
    primaryTypeDisplayName?: {
      text?: string;
      languageCode?: string;
    };
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
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
}

type NearbyPlace = NonNullable<NearbyPlaceResult['places']>[number];

const PLUS_CODE_REGEX = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

function normalizeAddressText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLeadingAddressSegment(value: string): string {
  return value.split(',')[0]?.trim() ?? '';
}

function isPlusCode(value: string): boolean {
  return PLUS_CODE_REGEX.test(value.trim());
}

function startsWithPlusCode(value: string): boolean {
  const leadingSegment = getLeadingAddressSegment(value);
  return Boolean(leadingSegment) && isPlusCode(leadingSegment);
}

function sanitizeAddressCandidate(value?: string): string {
  const trimmedValue = value?.trim() ?? '';
  if (!trimmedValue || startsWithPlusCode(trimmedValue)) {
    return '';
  }
  return trimmedValue;
}

function buildPostalAddressText(place: NearbyPlace): string {
  const parts = [
    ...(place.postalAddress?.addressLines ?? []),
    place.postalAddress?.locality,
    place.postalAddress?.administrativeArea,
    place.postalAddress?.postalCode,
  ]
    .map(part => part?.trim() ?? '')
    .filter(Boolean);

  return sanitizeAddressCandidate(parts.join(', '));
}

function buildAddressComponentsText(place: NearbyPlace): string {
  const components = place.addressComponents ?? [];
  const route =
    components.find(component => component.types?.includes('route'))?.longText?.trim() ?? '';
  const locality =
    components.find(component => component.types?.includes('locality'))?.longText?.trim() ?? '';
  const administrativeArea =
    components
      .find(component => component.types?.includes('administrative_area_level_2'))
      ?.longText?.trim() ?? '';
  const postalCode =
    components.find(component => component.types?.includes('postal_code'))?.longText?.trim() ?? '';

  return sanitizeAddressCandidate(
    [route, locality, administrativeArea, postalCode].filter(Boolean).join(', '),
  );
}

function getFirstSafeCandidate(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const sanitizedCandidate = sanitizeAddressCandidate(candidate);
    if (sanitizedCandidate) {
      return sanitizedCandidate;
    }
  }

  return '';
}

function getNearbyPrimaryText(place: NearbyPlace): string {
  return (
    getFirstSafeCandidate([
      place.displayName?.text,
      place.primaryTypeDisplayName?.text,
      place.primaryType,
      place.shortFormattedAddress,
      place.formattedAddress,
      buildPostalAddressText(place),
      buildAddressComponentsText(place),
    ]) || 'Lokasi'
  );
}

function getNearbySecondaryText(place: NearbyPlace, primaryText: string): string {
  const shortFormattedAddress = sanitizeAddressCandidate(place.shortFormattedAddress);
  if (
    shortFormattedAddress &&
    normalizeAddressText(shortFormattedAddress) !== normalizeAddressText(primaryText)
  ) {
    return shortFormattedAddress;
  }

  const formattedAddress = sanitizeAddressCandidate(place.formattedAddress);
  if (formattedAddress) {
    const segments = formattedAddress
      .split(',')
      .map(segment => segment.trim())
      .filter(Boolean);

    if (
      segments.length > 0 &&
      normalizeAddressText(segments[0] ?? '') === normalizeAddressText(primaryText)
    ) {
      const remainder = sanitizeAddressCandidate(segments.slice(1).join(', '));
      if (remainder) {
        return remainder;
      }
    }

    if (normalizeAddressText(formattedAddress) !== normalizeAddressText(primaryText)) {
      return formattedAddress;
    }
  }

  const postalAddress = buildPostalAddressText(place);
  if (postalAddress && normalizeAddressText(postalAddress) !== normalizeAddressText(primaryText)) {
    return postalAddress;
  }

  const addressComponents = buildAddressComponentsText(place);
  if (
    addressComponents &&
    normalizeAddressText(addressComponents) !== normalizeAddressText(primaryText)
  ) {
    return addressComponents;
  }

  return '';
}

function mapNearbyPlaceToSuggestion(place: NearbyPlace): AddressSuggestion | null {
  const placeId = place.id ?? '';
  const fullAddress = getFirstSafeCandidate([
    place.formattedAddress,
    place.shortFormattedAddress,
    buildPostalAddressText(place),
    buildAddressComponentsText(place),
  ]);
  if (!placeId || !fullAddress) {
    return null;
  }

  const primaryText = getNearbyPrimaryText(place);
  if (primaryText === 'Lokasi' || startsWithPlusCode(primaryText)) {
    return null;
  }

  return {
    id: placeId,
    placeId,
    name: primaryText,
    fullAddress,
    primaryText,
    secondaryText: getNearbySecondaryText(place, primaryText),
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    buildingName: place.displayName?.text?.trim() || undefined,
  };
}

function deduplicateSuggestions(results: AddressSuggestion[]): AddressSuggestion[] {
  const seenPlaceIds = new Set<string>();
  const seenNormalizedAddresses = new Set<string>();
  const unique: AddressSuggestion[] = [];

  for (const suggestion of results) {
    if (seenPlaceIds.has(suggestion.placeId)) {
      continue;
    }
    seenPlaceIds.add(suggestion.placeId);

    const normalizedAddress = normalizeAddressText(suggestion.fullAddress);
    if (seenNormalizedAddresses.has(normalizedAddress)) {
      continue;
    }
    seenNormalizedAddresses.add(normalizedAddress);

    unique.push(suggestion);
  }

  return unique;
}

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
      const mainText = sanitizeAddressCandidate(
        prediction?.structuredFormat?.mainText?.text ?? description.split(',')[0] ?? '',
      );
      const secondaryText = sanitizeAddressCandidate(
        prediction?.structuredFormat?.secondaryText?.text ??
          description.split(',').slice(1).join(',').trim(),
      );

      if (!prediction || !placeId || !description) {
        return null;
      }

      if (!mainText || startsWithPlusCode(description)) {
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
  district: string;
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
  const neighborhood = components.find(c => c.types.includes('neighborhood'))?.longName ?? '';
  const adminArea2 =
    components.find(c => c.types.includes('administrative_area_level_2'))?.longName ?? '';
  const adminArea3 =
    components.find(c => c.types.includes('administrative_area_level_3'))?.longName ?? '';
  const adminArea4 =
    components.find(c => c.types.includes('administrative_area_level_4'))?.longName ?? '';

  const city =
    components.find(c => c.types.includes('locality'))?.longName ??
    adminArea2 ??
    adminArea3 ??
    subLocality ??
    '';

  const district = adminArea3 || adminArea4 || subLocality || neighborhood || '';

  const administrativeArea =
    components.find(c => c.types.includes('administrative_area_level_1'))?.longName ?? '';
  const postalCode = components.find(c => c.types.includes('postal_code'))?.longName ?? '';

  const streetParts = [route, streetNumber].filter(Boolean);
  const streetAddress = streetParts.length > 0 ? streetParts.join(' ') : placeDetails.name;

  return {
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city,
    district,
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

  const { data, error } = await fetchJson<{
    results: Array<{
      place_id: string;
      formatted_address: string;
      address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
      types: string[];
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

  // Extract building name from premise type (e.g., "Adismart Ciruas", "Gedung X")
  const premise = components.find(c => c.types.includes('premise'))?.long_name ?? '';

  const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
  const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const locality = components.find(c => c.types.includes('locality'))?.long_name ?? '';
  const subLocality =
    components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))
      ?.long_name ?? '';
  const adminArea1 =
    components.find(c => c.types.includes('administrative_area_level_1'))?.long_name ?? '';
  const adminArea2 =
    components.find(c => c.types.includes('administrative_area_level_2'))?.long_name ?? '';
  const adminArea3 =
    components.find(c => c.types.includes('administrative_area_level_3'))?.long_name ?? '';
  const adminArea4 =
    components.find(c => c.types.includes('administrative_area_level_4'))?.long_name ?? '';
  const neighborhood = components.find(c => c.types.includes('neighborhood'))?.long_name ?? '';
  const postalCode = components.find(c => c.types.includes('postal_code'))?.long_name ?? '';

  const streetParts = [route, streetNumber].filter(Boolean);
  const streetAddress =
    streetParts.length > 0 ? streetParts.join(' ') : result.formatted_address.split(',')[0];

  const city = locality || adminArea2 || adminArea3 || '';
  const district = adminArea3 || adminArea4 || subLocality || neighborhood || '';

  const address: SelectedAddressSuggestion = {
    id: result.place_id,
    placeId: result.place_id,
    fullAddress: result.formatted_address,
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city,
    province: adminArea1,
    postalCode,
    district,
    countryCode: 'ID',
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    accuracy: null,
    buildingName: premise || undefined,
  };

  reverseGeocodeCache.set(cacheKey, { data: address, cachedAt: Date.now() });

  return { data: address, error: null };
}
