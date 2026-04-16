import { describe, expect, test } from '@jest/globals';
import {
  adminNamesMatch,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/utils/areaNormalization';

describe('areaNormalization', () => {
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
});
