import { describe, expect, test } from '@jest/globals';
import * as Location from 'expo-location';
import { resolveCurrentLocationSelection } from '@/scenes/profile/areaPickerCurrentLocation';
import type { RegionalDistrict } from '@/types/regional';

describe('areaPickerCurrentLocation', () => {
  test('resolves the district that owns the detected postal code before selecting the final area', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districtMap: Record<string, RegionalDistrict[]> = {
      '36.73': [
        { code: '36.73.01', name: 'Serang' },
        { code: '36.73.03', name: 'Walantaka' },
      ],
    };

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: {
            latitude: -6.14875,
            longitude: 106.225426,
          },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async regencyCode => ({
        data: districtMap[regencyCode as '36.73'] ?? [],
        error: null,
      }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: 'Serang',
          postalCode: '42183',
          fullAddress: 'Walantaka, Kota Serang, Banten 42183',
        },
        error: null,
      }),
      resolvePostalOptions: async (_province, _regency, district) => {
        if (district.code === '36.73.01') {
          return [{ label: '42111' }, { label: '42112' }];
        }

        return [{ label: '42135' }, { label: '42136' }, { label: '42183' }];
      },
      resolveAreaByPostal: async (_province, _regency, district, postalCode) => ({
        id: 'area-42183',
        name: district.name,
        administrative_division_level_1_name: 'Banten',
        administrative_division_level_2_name: 'Kota Serang',
        administrative_division_level_3_name: district.name,
        postal_code: Number(postalCode),
      }),
      locationModule,
    });

    expect(result.kind).toBe('resolved');

    if (result.kind !== 'resolved') {
      throw new Error('expected resolved current-location selection');
    }

    expect(result.district.name).toBe('Walantaka');
    expect(result.selectedPostalLabel).toBe('42183');
    expect(result.hierarchy).toMatchObject({
      provinceName: 'Banten',
      regencyName: 'Kota Serang',
      districtName: 'Walantaka',
      postalCode: '42183',
    });
  });

  test('matches postal codes using normalized digits during current-location resolution', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districts: RegionalDistrict[] = [{ code: '36.73.03', name: 'Walantaka' }];

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async () => ({ data: districts, error: null }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: 'Walantaka',
          postalCode: '421-83',
          fullAddress: 'Walantaka, Kota Serang, Banten 42183',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [{ label: '42183' }],
      resolveAreaByPostal: async (_province, _regency, district, postalCode) => ({
        id: 'area-normalized-postal',
        name: district.name,
        postal_code: Number(postalCode.replace(/\D/g, '')),
      }),
      locationModule,
    });

    expect(result.kind).toBe('resolved');

    if (result.kind !== 'resolved') {
      throw new Error('expected resolved current-location selection with normalized postal code');
    }

    expect(result.selectedPostalLabel).toBe('42183');
  });

  test('returns manual district selection when reverse geocode omits district and city cannot safely stand in for it', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districts: RegionalDistrict[] = [{ code: '36.73.03', name: 'Walantaka' }];

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async () => ({ data: districts, error: null }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: '',
          postalCode: '',
          fullAddress: 'Kota Serang, Banten',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [{ label: '42183' }, { label: '42184' }],
      resolveAreaByPostal: async () => null,
      locationModule,
    });

    expect(result).toMatchObject({ kind: 'manual', stage: 'district' });
  });

  test('returns manual city selection when fuzzy regency matches remain ambiguous', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [
      { code: '36.71', name: 'Kota Serang' },
      { code: '36.72', name: 'Kabupaten Serang' },
    ];

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async () => ({ data: [], error: null }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Serang',
          district: '',
          postalCode: '',
          fullAddress: 'Serang, Banten',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [],
      resolveAreaByPostal: async () => null,
      locationModule,
    });

    expect(result).toMatchObject({ kind: 'manual', stage: 'city' });
  });

  test('returns manual district selection when postal code matches multiple districts', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districtMap: Record<string, RegionalDistrict[]> = {
      '36.73': [
        { code: '36.73.01', name: 'Serang' },
        { code: '36.73.03', name: 'Walantaka' },
      ],
    };

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async regencyCode => ({
        data: districtMap[regencyCode as '36.73'] ?? [],
        error: null,
      }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: '',
          postalCode: '42183',
          fullAddress: 'Kota Serang, Banten 42183',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [{ label: '42183' }],
      resolveAreaByPostal: async () => null,
      locationModule,
    });

    expect(result).toMatchObject({ kind: 'manual', stage: 'district' });
  });

  test('returns manual postal selection when district is exact but postal is missing and multiple options exist', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districts: RegionalDistrict[] = [{ code: '36.73.03', name: 'Walantaka' }];

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async () => ({ data: districts, error: null }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: 'Walantaka',
          postalCode: '',
          fullAddress: 'Walantaka, Kota Serang, Banten',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [{ label: '42183' }, { label: '42184' }],
      resolveAreaByPostal: async () => null,
      locationModule,
    });

    expect(result).toMatchObject({ kind: 'manual', stage: 'postal' });
  });

  test('returns manual postal selection when district is exact but detected postal code is missing even with one postal option', async () => {
    const provinces = [{ code: '36', name: 'Banten' }];
    const regencies = [{ code: '36.73', name: 'Kota Serang' }];
    const districts: RegionalDistrict[] = [{ code: '36.73.03', name: 'Walantaka' }];

    const locationModule = {
      Accuracy: Location.Accuracy,
      requestForegroundPermissionsAsync: async () =>
        ({
          status: Location.PermissionStatus.GRANTED,
          expires: 'never',
          granted: true,
          canAskAgain: true,
        }) as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>,
      getCurrentPositionAsync: async () =>
        ({
          coords: { latitude: -6.14875, longitude: 106.225426 },
          timestamp: Date.now(),
        }) as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>,
      getLastKnownPositionAsync: async () => null,
      reverseGeocodeAsync: async () => [],
    };

    const result = await resolveCurrentLocationSelection({
      provinceOptions: provinces,
      fetchProvinces: async () => provinces,
      fetchRegencies: async () => ({ data: regencies, error: null }),
      fetchDistricts: async () => ({ data: districts, error: null }),
      reverseGeocode: async () => ({
        data: {
          province: 'Banten',
          city: 'Kota Serang',
          district: 'Walantaka',
          postalCode: '',
          fullAddress: 'Walantaka, Kota Serang, Banten',
        },
        error: null,
      }),
      resolvePostalOptions: async () => [{ label: '42183' }],
      resolveAreaByPostal: async () => ({
        id: 'area-42183',
        name: 'Walantaka',
        postal_code: 42183,
      }),
      locationModule,
    });

    expect(result).toMatchObject({ kind: 'manual', stage: 'postal' });
  });
});
