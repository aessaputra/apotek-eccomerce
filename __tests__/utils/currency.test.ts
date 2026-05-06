import { describe, expect, test } from '@jest/globals';
import { formatRupiah } from '@/utils/currency';

describe('formatRupiah', () => {
  test('formats Indonesian Rupiah with app-standard spacing', () => {
    expect(formatRupiah(56000)).toBe('Rp 56.000');
    expect(formatRupiah(115000)).toBe('Rp 115.000');
  });

  test('rounds fractional and invalid values safely', () => {
    expect(formatRupiah(12500.5)).toBe('Rp 12.501');
    expect(formatRupiah(Number.NaN)).toBe('Rp 0');
  });
});
