export function normalize(text: string | undefined | null): string {
  return (text || '').trim().toUpperCase();
}

export function normalizeAdminName(text: string | undefined | null): string {
  return normalize(text)
    .replace(/^KABUPATEN\s+/, '')
    .replace(/^KOTA\s+/, '')
    .replace(/^KAB\.\s*/, '')
    .replace(/^KAB\s+/, '')
    .replace(/ADM\.?/g, '')
    .replace(/ADMINISTRASI/g, '')
    .replace(/KEPULAUAN/g, 'KEP')
    .replace(/DAERAH ISTIMEWA YOGYAKARTA/g, 'DI YOGYAKARTA')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExactAdminName(text: string | undefined | null): string {
  return normalize(text).replace(/\s+/g, ' ').trim();
}

export type AdminAreaType = 'kabupaten' | 'kota' | 'unknown';

export function getAdminAreaType(text: string | undefined | null): AdminAreaType {
  const normalized = normalizeExactAdminName(text);

  if (/^(KABUPATEN|KAB\.?)/.test(normalized)) {
    return 'kabupaten';
  }

  if (/^KOTA\s+/.test(normalized)) {
    return 'kota';
  }

  return 'unknown';
}

export function adminNamesMatch(
  candidate: string | undefined | null,
  target: string | undefined | null,
): boolean {
  const normalizedCandidate = normalizeExactAdminName(candidate);
  const normalizedTarget = normalizeExactAdminName(target);
  const candidateType = getAdminAreaType(candidate);
  const targetType = getAdminAreaType(target);

  if (normalizedCandidate && normalizedTarget && normalizedCandidate === normalizedTarget) {
    return true;
  }

  if (candidateType !== 'unknown' && targetType !== 'unknown' && candidateType !== targetType) {
    return false;
  }

  return normalizeAdminName(candidate) === normalizeAdminName(target);
}

export function normalizeAreaNameForApi(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^KABUPATEN\s+/, '')
    .replace(/^KOTA\s+/, '')
    .replace(/\s+/g, ' ');
}
