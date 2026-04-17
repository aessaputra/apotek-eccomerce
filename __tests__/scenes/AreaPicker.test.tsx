import { describe, expect, test } from '@jest/globals';
import {
  adminNamesMatch,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/utils/areaNormalization';
import {
  buildPendingAreaSelection,
  findDistrictCandidateByPostalCode,
} from '@/scenes/profile/areaPickerHelpers';

describe('AreaPicker helper behavior', () => {
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

  test('findDistrictCandidateByPostalCode prefers a district whose postal options contain the current-location postal code', async () => {
    const province = { code: '36', name: 'Banten' };
    const regency = { code: '36.73', name: 'Kota Serang' };
    const districts = [
      { code: '36.73.01', name: 'Serang' },
      { code: '36.73.03', name: 'Walantaka' },
    ];

    const resolvePostalOptions = jest.fn(async (_province, _regency, district) => {
      if (district.code === '36.73.01') {
        return [{ label: '42111' }, { label: '42112' }];
      }

      return [{ label: '42135' }, { label: '42136' }, { label: '42183' }];
    });

    const match = await findDistrictCandidateByPostalCode(
      districts,
      province,
      regency,
      '42183',
      resolvePostalOptions,
    );

    expect(match?.district).toEqual({ code: '36.73.03', name: 'Walantaka' });
    expect(match?.options).toEqual([{ label: '42135' }, { label: '42136' }, { label: '42183' }]);
  });

  test('findDistrictCandidateByPostalCode returns null when multiple districts share the same postal code', async () => {
    const province = { code: '36', name: 'Banten' };
    const regency = { code: '36.73', name: 'Kota Serang' };
    const districts = [
      { code: '36.73.01', name: 'Serang' },
      { code: '36.73.03', name: 'Walantaka' },
    ];

    const resolvePostalOptions = jest.fn(async () => [{ label: '42183' }]);

    const match = await findDistrictCandidateByPostalCode(
      districts,
      province,
      regency,
      '42183',
      resolvePostalOptions,
    );

    expect(match).toBeNull();
  });

  test('canonical normalization helpers still match city and regency names consistently', () => {
    expect(normalizeAdminName('Kabupaten Serang')).toBe('SERANG');
    expect(normalizeExactAdminName('Kota Serang')).toBe('KOTA SERANG');
    expect(adminNamesMatch('Serang', 'Kabupaten Serang')).toBe(true);
  });
});
