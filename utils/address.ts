import type { Address } from '@/types/address';

/**
 * Format address fields into a single readable string.
 * Joins street, city, province, and postal code with comma separation.
 */
export function formatAddress(address: Address): string {
  return [address.street_address, address.city, address.province, address.postal_code]
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolve the badge text for an address ("Utama" for default, or custom label).
 * Returns null if no badge should be shown.
 */
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
