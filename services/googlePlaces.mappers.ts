import type {
  AddressSuggestion,
  GooglePlaceDetails,
  GooglePlaceDetailsNew,
  GooglePlacePrediction,
  GooglePlacePredictionNew,
  SelectedAddressSuggestion,
} from '@/types/geocoding';
import {
  getAutocompleteSuggestionDescription,
  getFirstSafeCandidate,
  normalizeAddressText,
  normalizePlaceId,
  sanitizeAddressCandidate,
  startsWithPlusCode,
} from './googlePlaces.shared';

export interface NearbyPlaceResult {
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

export interface ReverseGeocodeResponse {
  results: ReverseGeocodeResult[];
  status: string;
}

export interface ReverseGeocodeResult {
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
  const streetNumber =
    components.find(component => component.types?.includes('street_number'))?.longText?.trim() ??
    '';
  const route =
    components.find(component => component.types?.includes('route'))?.longText?.trim() ?? '';
  const subLocality =
    components.find(component => component.types?.includes('sublocality'))?.longText?.trim() ?? '';
  const locality =
    components.find(component => component.types?.includes('locality'))?.longText?.trim() ?? '';
  const adminArea2 =
    components
      .find(component => component.types?.includes('administrative_area_level_2'))
      ?.longText?.trim() ?? '';
  const postalCode =
    components.find(component => component.types?.includes('postal_code'))?.longText?.trim() ?? '';
  const streetParts = [route, streetNumber].filter(Boolean);
  const streetAddress = streetParts.length > 0 ? streetParts.join(' ') : '';

  return sanitizeAddressCandidate(
    [streetAddress, subLocality, locality, adminArea2, postalCode].filter(Boolean).join(', '),
  );
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

export function mapNearbyPlaceToSuggestion(place: NearbyPlace): AddressSuggestion | null {
  const placeId = place.id ?? '';
  if (!placeId) {
    return null;
  }

  const fullAddress = getFirstSafeCandidate([
    place.shortFormattedAddress,
    place.formattedAddress,
    buildPostalAddressText(place),
    buildAddressComponentsText(place),
  ]);

  if (!fullAddress) {
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

export function deduplicateSuggestions(results: AddressSuggestion[]): AddressSuggestion[] {
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

export function mapAutocompleteSuggestionToPrediction(
  suggestion: NonNullable<GooglePlacePredictionNew['suggestions']>[number],
): GooglePlacePrediction | null {
  const prediction = suggestion.placePrediction;
  const placeId = normalizePlaceId(prediction?.placeId ?? prediction?.place);
  const description = getAutocompleteSuggestionDescription(suggestion);
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

  return {
    placeId,
    description,
    mainText,
    secondaryText,
    types: prediction.types ?? [],
  };
}

export function mapPlaceDetailsResponseToDetails(
  data: GooglePlaceDetailsNew,
  fallbackPlaceId: string,
): GooglePlaceDetails {
  return {
    placeId: normalizePlaceId(data.id) || fallbackPlaceId,
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
}

export function convertPlaceDetailsToAddressValue(placeDetails: GooglePlaceDetails): {
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
  const province =
    components.find(c => c.types.includes('administrative_area_level_1'))?.longName ?? '';
  const postalCode = components.find(c => c.types.includes('postal_code'))?.longName ?? '';
  const streetParts = [route, streetNumber].filter(Boolean);
  const rawStreetAddress = streetParts.length > 0 ? streetParts.join(' ') : placeDetails.name;
  const sanitizedRaw = sanitizeAddressCandidate(rawStreetAddress);
  const sanitizedFallback = sanitizeAddressCandidate(placeDetails.formattedAddress.split(',')[0]);
  const streetAddress = sanitizedRaw || sanitizedFallback || 'Lokasi';

  return {
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city,
    district,
    province,
    postalCode,
    latitude: placeDetails.coordinates.latitude,
    longitude: placeDetails.coordinates.longitude,
  };
}

export function mapReverseGeocodeResultToAddress(
  result: ReverseGeocodeResult,
): SelectedAddressSuggestion {
  const components = result.address_components;
  const premise = components.find(c => c.types.includes('premise'))?.long_name ?? '';
  const route = components.find(c => c.types.includes('route'))?.long_name ?? '';
  const streetNumber = components.find(c => c.types.includes('street_number'))?.long_name ?? '';
  const locality = components.find(c => c.types.includes('locality'))?.long_name ?? '';
  const subLocality =
    components.find(c => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))
      ?.long_name ?? '';
  const province =
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
  const sanitizedFromParts = sanitizeAddressCandidate(streetParts.join(' '));
  const sanitizedFallback = sanitizeAddressCandidate(result.formatted_address.split(',')[0]);
  const streetAddress = sanitizedFromParts || sanitizedFallback || 'Lokasi';
  const city = locality || adminArea2 || adminArea3 || subLocality || '';
  const district = adminArea3 || adminArea4 || subLocality || neighborhood || '';

  return {
    id: result.place_id,
    placeId: result.place_id,
    fullAddress: result.formatted_address,
    streetAddress: subLocality ? `${streetAddress}, ${subLocality}` : streetAddress,
    city,
    province,
    postalCode,
    district,
    countryCode: 'ID',
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    accuracy: null,
    buildingName: premise || undefined,
  };
}
