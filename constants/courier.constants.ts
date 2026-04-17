/**
 * Courier service name mappings for Indonesian shipping providers.
 * Maps courier codes and service codes to human-readable display names.
 */

/**
 * Courier company display names in Indonesian.
 * Maps lowercase courier codes to their full display names.
 */
export const COURIER_NAMES: Record<string, string> = {
  jne: 'JNE',
  jnt: 'J&T Express',
  sicepat: 'SiCepat',
  pos: 'POS Indonesia',
  tiki: 'TIKI',
  wahana: 'Wahana',
  ninja: 'Ninja Xpress',
  anteraja: 'AnterAja',
  idexpress: 'ID Express',
  rpx: 'RPX',
  lion: 'Lion Parcel',
  pcp: 'PCP Express',
  star: 'Star Cargo',
  first: 'First Logistics',
  // Instant/delivery couriers
  gojek: 'Gojek',
  grab: 'Grab Express',
  lalamove: 'Lalamove',
  borzo: 'Borzo',
};

/**
 * Service type display names for common courier services.
 * Maps lowercase service codes to their Indonesian display names.
 */
export const SERVICE_NAMES: Record<string, string> = {
  // JNE services
  reg: 'Reguler',
  oke: 'OKE',
  yes: 'YES',
  // J&T services
  ez: 'EZ',
  // SiCepat services
  best: 'BEST',
  reguler: 'Reguler',
  // TIKI services
  eco: 'ECO',
  // POS services
  paketpos: 'Paket Pos',
  // Instant delivery
  instant: 'Instant',
  same_day: 'Same Day',
  same: 'Same Day',
  // General
  standard: 'Standar',
  express: 'Express',
  economy: 'Ekonomi',
};

/**
 * Formats a courier service display name from courier code and service code.
 *
 * @param courierCode - The courier company code (e.g., "jne", "sicepat")
 * @param serviceCode - The service type code (e.g., "reg", "best")
 * @returns Formatted display name (e.g., "JNE Reguler", "SiCepat BEST")
 *
 * @example
 * formatCourierServiceName('jne', 'reg') // Returns: "JNE Reguler"
 * formatCourierServiceName('sicepat', 'best') // Returns: "SiCepat BEST"
 * formatCourierServiceName('jnt', 'ez') // Returns: "J&T Express EZ"
 * formatCourierServiceName('gojek', 'instant') // Returns: "Gojek Instant"
 */
export function formatCourierServiceName(
  courierCode: string | null | undefined,
  serviceCode: string | null | undefined,
): string {
  // Handle missing data
  if (!courierCode && !serviceCode) {
    return 'Metode Pengiriman';
  }

  if (!courierCode) {
    // Only service code available
    const serviceName = serviceCode
      ? SERVICE_NAMES[serviceCode.toLowerCase()] || serviceCode.toUpperCase()
      : '';
    return serviceName || 'Metode Pengiriman';
  }

  if (!serviceCode) {
    // Only courier code available
    const courierName = COURIER_NAMES[courierCode.toLowerCase()] || courierCode.toUpperCase();
    return courierName;
  }

  // Both codes available - combine them
  const courierName = COURIER_NAMES[courierCode.toLowerCase()] || courierCode.toUpperCase();
  const serviceName = SERVICE_NAMES[serviceCode.toLowerCase()] || serviceCode.toUpperCase();

  return `${courierName} ${serviceName}`;
}

/**
 * Gets just the courier company name from a courier code.
 *
 * @param courierCode - The courier company code (e.g., "jne", "sicepat")
 * @returns Courier display name (e.g., "JNE", "SiCepat")
 */
export function getCourierName(courierCode: string | null | undefined): string {
  if (!courierCode) {
    return 'Kurir';
  }

  return COURIER_NAMES[courierCode.toLowerCase()] || courierCode.toUpperCase();
}

/**
 * Gets just the service name from a service code.
 *
 * @param serviceCode - The service type code (e.g., "reg", "best")
 * @returns Service display name (e.g., "Reguler", "BEST")
 */
export function getServiceName(serviceCode: string | null | undefined): string {
  if (!serviceCode) {
    return '';
  }

  return SERVICE_NAMES[serviceCode.toLowerCase()] || serviceCode.toUpperCase();
}
