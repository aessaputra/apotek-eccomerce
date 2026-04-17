export function parseCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function hasValidCoordinates(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): boolean {
  return parseCoordinate(latitude) !== null && parseCoordinate(longitude) !== null;
}

export function parseCoordinates(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): { latitude: number | null; longitude: number | null } {
  return {
    latitude: parseCoordinate(latitude),
    longitude: parseCoordinate(longitude),
  };
}
