import { describe, expect, test } from '@jest/globals';
import { cleanStreetAddress, formatAddress } from '@/utils/address';
import { formatLevel3Display } from '@/utils/areaFormatters';
import type { Address } from '@/types/address';

describe('address utilities', () => {
  describe('cleanStreetAddress', () => {
    test('removes trailing postal code, province, city, district, and country', () => {
      const street = 'JCO DONUTS & COFFEE - SERANG 2, Serang, Kota Serang, Banten, 42111';
      const cleaned = cleanStreetAddress(
        street,
        'Kota Serang',
        'Banten',
        '42111',
        'Kecamatan Serang',
      );
      expect(cleaned).toBe('JCO DONUTS & COFFEE - SERANG 2');
    });

    test('removes trailing city and province correctly with variations', () => {
      const street = 'Jalan Jendral Sudirman, Serang, Kota Serang, Banten, 42118';
      const cleaned = cleanStreetAddress(street, 'Kota Serang', 'Banten', '42118', 'Serang');
      expect(cleaned).toBe('Jalan Jendral Sudirman');
    });

    test('handles addresses without trailing duplicates without altering them', () => {
      const street = 'Jalan Jendral Sudirman No. 24';
      const cleaned = cleanStreetAddress(street, 'Kota Serang', 'Banten', '42118', 'Serang');
      expect(cleaned).toBe('Jalan Jendral Sudirman No. 24');
    });

    test('ignores case differences during removal', () => {
      const street = 'Grand City Mall, SURABAYA, Jawa Timur, 60272, Indonesia';
      const cleaned = cleanStreetAddress(street, 'Surabaya', 'Jawa Timur', '60272', 'Genteng');
      expect(cleaned).toBe('Grand City Mall');
    });

    test('handles suffix-only address with city at end and no district', () => {
      const street = 'Jl. Pemuda No. 10, Surabaya';
      const cleaned = cleanStreetAddress(street, 'Surabaya', 'Jawa Timur', '60271');
      expect(cleaned).toBe('Jl. Pemuda No. 10');
    });

    test('handles multi-line address using newline as separator', () => {
      const street = 'Jl. Jendral Sudirman No. 5\nSurabaya\nJawa Timur\n60271';
      const cleaned = cleanStreetAddress(street, 'Surabaya', 'Jawa Timur', '60271', 'Genteng');
      expect(cleaned).toBe('Jl. Jendral Sudirman No. 5');
    });

    test('handles various kecamatan prefix variations (Kec., KEC., kecamatan)', () => {
      expect(
        cleanStreetAddress('Jl. Mawar, Kec. Serang', 'Serang', 'Banten', '42111', 'Serang'),
      ).toBe('Jl. Mawar');
      expect(
        cleanStreetAddress('Jl. Mawar, KEC. SERANG', 'Serang', 'Banten', '42111', 'Serang'),
      ).toBe('Jl. Mawar');
      expect(
        cleanStreetAddress('Jl. Mawar, kecamatan serang', 'Serang', 'Banten', '42111', 'serang'),
      ).toBe('Jl. Mawar');
    });

    test('returns clean address unchanged if no trailing location info exists', () => {
      const street = 'Jl. Diponegoro No. 123 Blok B';
      const cleaned = cleanStreetAddress(street, 'Bandung', 'Jawa Barat', '40115', 'Coblong');
      expect(cleaned).toBe('Jl. Diponegoro No. 123 Blok B');
    });

    test('handles empty or null fields gracefully without crashing', () => {
      expect(cleanStreetAddress('Jl. Merdeka No. 1', '', '', '')).toBe('Jl. Merdeka No. 1');
      expect(cleanStreetAddress('', '', '', '')).toBe('');
      expect(
        cleanStreetAddress(
          null as unknown as string,
          undefined as unknown as string,
          null as unknown as string,
          undefined as unknown as string,
        ),
      ).toBe('');
    });
  });

  describe('formatAddress', () => {
    test('defensively formats address details by deduplicating components', () => {
      const address: Address = {
        id: 'addr-1',
        profile_id: 'prof-1',
        receiver_name: 'John Doe',
        phone_number: '08123456789',
        street_address: 'JCO DONUTS & COFFEE - SERANG 2, Serang, Kota Serang, Banten, 42111',
        address_note: 'Dekat lobby',
        city: 'Kota Serang',
        province: 'Banten',
        postal_code: '42111',
        area_id: 'area-1',
        area_name: 'Serang, Kota Serang, Banten, 42111',
        latitude: -6.12,
        longitude: 106.15,
        country_code: 'ID',
        is_default: true,
        city_id: 'city-1',
        province_id: 'prov-1',
        created_at: new Date().toISOString(),
      };

      const result = formatAddress(address);
      expect(result).toBe(
        'JCO DONUTS & COFFEE - SERANG 2, Kecamatan Serang, Kota Serang, Banten, 42111',
      );
    });
  });

  describe('formatLevel3Display (Kecamatan)', () => {
    test('adds Kecamatan prefix if not present', () => {
      expect(formatLevel3Display('Serang')).toBe('Kecamatan Serang');
    });

    test('standardizes existing Kecamatan / Kec prefix', () => {
      expect(formatLevel3Display('Kec. Serang')).toBe('Kecamatan Serang');
      expect(formatLevel3Display('Kecamatan Serang')).toBe('Kecamatan Serang');
      expect(formatLevel3Display('kecamatan serang')).toBe('Kecamatan serang');
    });

    test('returns empty string for empty input', () => {
      expect(formatLevel3Display('')).toBe('');
    });
  });
});
