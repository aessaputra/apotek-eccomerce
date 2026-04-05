import { describe, expect, test } from '@jest/globals';
import {
  adminNamesMatch,
  buildPendingAreaSelection,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/scenes/profile/AreaPicker';

describe('AreaPicker admin name matching', () => {
  test('normalizeAdminName removes city and regency prefixes for fuzzy matching', () => {
    expect(normalizeAdminName('Kabupaten Serang')).toBe('SERANG');
    expect(normalizeAdminName('Kota Serang')).toBe('SERANG');
    expect(normalizeAdminName('Kab. Serang')).toBe('SERANG');
  });

  test('normalizeExactAdminName preserves city and regency distinction', () => {
    expect(normalizeExactAdminName('Kabupaten Serang')).toBe('KABUPATEN SERANG');
    expect(normalizeExactAdminName('Kota Serang')).toBe('KOTA SERANG');
  });

  test('adminNamesMatch prefers exact typed match before fuzzy fallback', () => {
    expect(adminNamesMatch('Kabupaten Serang', 'Kabupaten Serang')).toBe(true);
    expect(adminNamesMatch('Kota Serang', 'Kabupaten Serang')).toBe(false);
    expect(adminNamesMatch('Serang', 'Kabupaten Serang')).toBe(true);
  });

  test('buildPendingAreaSelection prefers explicit auto-detected hierarchy over stale fallback state', () => {
    const selection = buildPendingAreaSelection(
      {
        id: 'area-1',
        name: 'Serang',
        administrative_division_level_2_name: 'Serang',
        administrative_division_level_2_type: 'city',
        postal_code: 42182,
      },
      {
        provinceName: 'Banten',
        regencyName: 'Kota Serang',
        districtName: 'Taktakan',
      },
      {
        provinceName: 'Banten',
        regencyName: 'Kabupaten Serang',
        districtName: 'Ciruas',
        postalCode: '42182',
      },
    );

    expect(selection.regencyName).toBe('Kabupaten Serang');
    expect(selection.districtName).toBe('Ciruas');
    expect(selection.postalCode).toBe('42182');
  });
});
