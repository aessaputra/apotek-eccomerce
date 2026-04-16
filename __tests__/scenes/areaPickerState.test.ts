import { describe, expect, test } from '@jest/globals';
import {
  filterNamedOptions,
  filterPostalOptions,
  findSelectedPostalOption,
  getStageTitle,
} from '@/scenes/profile/areaPickerState';

describe('areaPickerState', () => {
  test('filters named options with normalized query matching', () => {
    const options = [
      { code: '1', name: 'Kabupaten Serang' },
      { code: '2', name: 'Kota Cilegon' },
    ];

    expect(filterNamedOptions(options, 'serang')).toEqual([
      { code: '1', name: 'Kabupaten Serang' },
    ]);
    expect(filterNamedOptions(options, '')).toEqual(options);
  });

  test('filters postal options and resolves selected postal option', () => {
    const options = [{ label: '42183' }, { label: '42184' }];

    expect(filterPostalOptions(options, '2183')).toEqual([{ label: '42183' }]);
    expect(findSelectedPostalOption(options, '42184')).toEqual({ label: '42184' });
    expect(findSelectedPostalOption(options, '99999')).toBeNull();
  });

  test('returns user-facing title for each stage', () => {
    expect(getStageTitle('province')).toBe('Provinsi');
    expect(getStageTitle('city')).toBe('Kota / Kabupaten');
    expect(getStageTitle('district')).toBe('Kecamatan');
    expect(getStageTitle('postal')).toBe('Kode Pos');
  });
});
