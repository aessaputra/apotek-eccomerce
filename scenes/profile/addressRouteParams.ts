import type { MapCoords } from '@/components/MapPin';
import type { GeocodingProximity } from '@/types/geocoding';
import { sanitizeAddressCandidate } from '@/services/googlePlaces.service';

type CoordinateParams = {
  latitude?: unknown;
  longitude?: unknown;
};

type AddressSummaryParams = CoordinateParams & {
  streetAddress?: unknown;
  areaName?: unknown;
  city?: unknown;
  province?: unknown;
  postalCode?: unknown;
};

function parseFiniteCoordinate(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseAddressSearchInitialLocation(
  params: CoordinateParams,
): GeocodingProximity | null {
  const latitude = parseFiniteCoordinate(params.latitude);
  const longitude = parseFiniteCoordinate(params.longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return { latitude, longitude };
}

export function parseAddressMapInitialCoords(params: CoordinateParams): MapCoords | undefined {
  const parsedLocation = parseAddressSearchInitialLocation(params);
  return parsedLocation ?? undefined;
}

export function buildSelectedAddressSummary(params: AddressSummaryParams): string | undefined {
  const parts = [
    sanitizeAddressCandidate(normalizeOptionalText(params.streetAddress)),
    normalizeOptionalText(params.areaName),
    normalizeOptionalText(params.city),
    normalizeOptionalText(params.province),
    normalizeOptionalText(params.postalCode),
  ].filter(Boolean);

  return parts.join(', ') || undefined;
}

export function shouldShowInitialAddressRecommendations(query: string): boolean {
  return query.trim().length < 2;
}
