import { beforeEach, describe, expect, test } from '@jest/globals';
import { consumePendingAreaSelection, setPendingAreaSelection } from '@/utils/areaPickerSession';
import { useAreaPickerStore } from '@/stores/areaPickerStore';

describe('areaPickerSession', () => {
  beforeEach(() => {
    useAreaPickerStore.getState().reset();
  });

  test('consumePendingAreaSelection returns the stored selection once', () => {
    setPendingAreaSelection({
      area: {
        id: 'area-1',
        name: 'Walantaka',
        postal_code: 42183,
      },
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
    });

    const first = consumePendingAreaSelection();
    const second = consumePendingAreaSelection();

    expect(first).toEqual({
      area: {
        id: 'area-1',
        name: 'Walantaka',
        postal_code: 42183,
      },
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
      postalCode: '42183',
    });
    expect(second).toBeNull();
  });

  test('consumePendingAreaSelection resets area picker store state', () => {
    setPendingAreaSelection({
      area: {
        id: 'area-2',
        name: 'Ciruas',
        postal_code: 42182,
      },
      provinceName: 'Banten',
      regencyName: 'Kabupaten Serang',
      districtName: 'Ciruas',
    });

    consumePendingAreaSelection();

    expect(useAreaPickerStore.getState()).toMatchObject({
      stage: 'province',
      selectedProvince: null,
      selectedCity: null,
      selectedDistrict: null,
      selectedArea: null,
      selectedPostalCode: null,
    });
  });

  test('consumePendingAreaSelection preserves explicit postal code override from session state', () => {
    setPendingAreaSelection({
      area: {
        id: 'area-3',
        name: 'Walantaka',
        postal_code: 42183,
      },
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
      postalCode: ' 421-83 ',
    });

    expect(consumePendingAreaSelection()).toMatchObject({
      postalCode: ' 421-83 ',
    });
  });

  test('consumePendingAreaSelection normalizes string and null Biteship postal codes', () => {
    setPendingAreaSelection({
      area: {
        id: 'area-4',
        name: 'Walantaka',
        postal_code: '42183',
      },
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
    });

    expect(consumePendingAreaSelection()).toMatchObject({
      postalCode: '42183',
    });

    setPendingAreaSelection({
      area: {
        id: 'area-5',
        name: 'Walantaka',
        postal_code: null,
      },
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
    });

    expect(consumePendingAreaSelection()).toMatchObject({
      postalCode: undefined,
    });
  });
});
