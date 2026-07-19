import type { Address } from '@/types/address';

export function cleanStreetAddress(
  street: string,
  city: string,
  province: string,
  postal: string,
  district?: string,
): string {
  let cleaned = (street ?? '').trim();

  cleaned = cleaned.replace(/,\s*(indonesia|id)$/i, '');

  const removeTrailingToken = (token: string) => {
    if (!token) return;
    const normToken = token
      .replace(/^(kota|kabupaten|kab\.|kecamatan|kec\.|provinsi|prov\.)\s+/i, '')
      .trim();
    if (!normToken) return;

    const escaped = normToken.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`,?\\s*(kota|kabupaten|kab\\.|kecamatan|kec\\.)?\\s*${escaped}$`, 'i');
    cleaned = cleaned.replace(regex, '').trim();
  };

  removeTrailingToken(postal);
  removeTrailingToken(province);
  removeTrailingToken(city);
  if (district) {
    removeTrailingToken(district);
  }

  return cleaned;
}

export function formatAddress(address: Address): string {
  const street = address.street_address || '';
  const note = address.address_note || '';
  const city = address.city || '';
  const province = address.province || '';
  const postal = address.postal_code || '';
  const district = address.area_name ? address.area_name.split(',')[0].trim() : undefined;

  const cleanedStreet = cleanStreetAddress(street, city, province, postal, district);

  return [cleanedStreet, note, city, province, postal].filter(Boolean).join(', ');
}

export function resolveBadgeText(address: Address): string | null {
  if (address.is_default) {
    return 'Utama';
  }

  const label = (address as { label?: string }).label;
  if (typeof label === 'string' && label.trim().length > 0) {
    return label.trim();
  }

  return null;
}
