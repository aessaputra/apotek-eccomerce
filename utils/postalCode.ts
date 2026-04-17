export function normalizePostalCode(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\D/g, '');
}

export function toPostalCodeString(value: string | number | null | undefined): string | undefined {
  const normalized = normalizePostalCode(value);
  return normalized || undefined;
}

export function parsePostalCode(value: string | number | null | undefined): number | null {
  const normalized = normalizePostalCode(value);
  if (normalized.length !== 5) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
