import { GooglePlacePredictionNew } from '@/types/geocoding';

const PLUS_CODE_REGEX = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

export function normalizeAddressText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getLeadingAddressSegment(value: string): string {
  return value.split(',')[0]?.trim() ?? '';
}

export function isPlusCode(value: string): boolean {
  return PLUS_CODE_REGEX.test(value.trim());
}

export function startsWithPlusCode(value: string): boolean {
  const leadingSegment = getLeadingAddressSegment(value);
  return Boolean(leadingSegment) && isPlusCode(leadingSegment);
}

export function sanitizeAddressCandidate(value?: string): string {
  const trimmedValue = value?.trim() ?? '';
  if (!trimmedValue || startsWithPlusCode(trimmedValue)) {
    return '';
  }

  return trimmedValue;
}

export function getFirstSafeCandidate(candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const sanitizedCandidate = sanitizeAddressCandidate(candidate);
    if (sanitizedCandidate) {
      return sanitizedCandidate;
    }
  }

  return '';
}

export function normalizePlaceId(value?: string): string {
  if (!value) {
    return '';
  }

  return value.startsWith('places/') ? value.replace('places/', '') : value;
}

export function getAutocompleteSuggestionDescription(
  suggestion: NonNullable<GooglePlacePredictionNew['suggestions']>[number],
): string {
  return suggestion.placePrediction?.text?.text ?? '';
}
