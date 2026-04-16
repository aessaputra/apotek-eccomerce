import * as Location from 'expo-location';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';
import {
  adminNamesMatch,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/utils/areaNormalization';
import { normalizePostalCode } from '@/utils/postalCode';
import type {
  CurrentLocationAddress,
  PostalOption,
  ResolvePostalOptions,
} from './areaPickerHelpers';
import {
  findDistrictCandidateByPostalCode,
  normalizeCurrentLocationAddress,
} from './areaPickerHelpers';

type HierarchySelection = {
  provinceName: string;
  regencyName: string;
  districtName: string;
  postalCode?: string;
};

type ResolvedCurrentLocationSelection = {
  kind: 'resolved';
  province: RegionalProvince;
  regency: RegionalRegency;
  district: RegionalDistrict;
  postalOptions: PostalOption[];
  selectedPostalLabel: string;
  area: BiteshipArea;
  hierarchy: HierarchySelection;
};

type ManualCurrentLocationSelection = {
  kind: 'manual';
  stage: 'city' | 'district' | 'postal';
  errorMessage: string;
  province?: RegionalProvince;
  regency?: RegionalRegency;
  district?: RegionalDistrict;
  cityOptions?: RegionalRegency[];
  districtOptions?: RegionalDistrict[];
  postalOptions?: PostalOption[];
};

type FailedCurrentLocationSelection = {
  kind: 'error';
  errorMessage: string;
  provinceOptions?: RegionalProvince[];
};

export type CurrentLocationSelectionResult =
  | ResolvedCurrentLocationSelection
  | ManualCurrentLocationSelection
  | FailedCurrentLocationSelection;

type ReverseGeocodeResult = {
  data: {
    province: string;
    city: string;
    district: string;
    postalCode: string;
    fullAddress?: string;
  } | null;
  error: Error | null;
};

type LocationModule = Pick<
  typeof Location,
  | 'requestForegroundPermissionsAsync'
  | 'getCurrentPositionAsync'
  | 'getLastKnownPositionAsync'
  | 'reverseGeocodeAsync'
  | 'Accuracy'
>;

type ResolveCurrentLocationSelectionParams = {
  provinceOptions: RegionalProvince[];
  fetchProvinces: () => Promise<RegionalProvince[]>;
  fetchRegencies: (
    provinceCode: string,
  ) => Promise<{ data: RegionalRegency[]; error: Error | null }>;
  fetchDistricts: (
    regencyCode: string,
  ) => Promise<{ data: RegionalDistrict[]; error: Error | null }>;
  reverseGeocode: (coords: {
    latitude: number;
    longitude: number;
  }) => Promise<ReverseGeocodeResult>;
  resolvePostalOptions: ResolvePostalOptions;
  resolveAreaByPostal: (
    province: RegionalProvince,
    regency: RegionalRegency,
    district: RegionalDistrict,
    postalCode: string,
  ) => Promise<BiteshipArea | null>;
  locationModule?: LocationModule;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Location request timeout')), ms),
    ),
  ]);
}

async function resolveCurrentCoordinates(
  locationModule: LocationModule,
): Promise<Location.LocationObject | null> {
  let current: Location.LocationObject | null = null;

  try {
    current = await withTimeout(
      locationModule.getCurrentPositionAsync({
        accuracy: locationModule.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }),
      15000,
    );
  } catch {
    current = null;
  }

  if (current) {
    return current;
  }

  return locationModule.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
}

async function resolveAddressFromCoordinates(
  locationModule: LocationModule,
  reverseGeocode: ResolveCurrentLocationSelectionParams['reverseGeocode'],
  latitude: number,
  longitude: number,
): Promise<{ resolvedAddress: CurrentLocationAddress | null; fullAddress?: string }> {
  const { data: reversed, error: reverseError } = await reverseGeocode({ latitude, longitude });

  if (reversed && !reverseError) {
    return {
      resolvedAddress: normalizeCurrentLocationAddress(reversed),
      fullAddress: reversed.fullAddress,
    };
  }

  const expoReverse = await locationModule.reverseGeocodeAsync({ latitude, longitude });
  const fallbackAddress = expoReverse[0]
    ? {
        province: expoReverse[0].region ?? '',
        city: expoReverse[0].city ?? expoReverse[0].subregion ?? '',
        district: expoReverse[0].district ?? expoReverse[0].subregion ?? expoReverse[0].city ?? '',
        postalCode: expoReverse[0].postalCode ?? '',
      }
    : undefined;

  return {
    resolvedAddress: fallbackAddress ? normalizeCurrentLocationAddress(fallbackAddress) : null,
  };
}

export async function resolveCurrentLocationSelection(
  params: ResolveCurrentLocationSelectionParams,
): Promise<CurrentLocationSelectionResult> {
  const locationModule = params.locationModule ?? Location;
  const availableProvinces =
    params.provinceOptions.length > 0 ? params.provinceOptions : await params.fetchProvinces();

  if (availableProvinces.length === 0) {
    return {
      kind: 'error',
      errorMessage: 'Daftar provinsi belum siap. Silakan coba lagi.',
    };
  }

  const permission = await locationModule.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      kind: 'error',
      errorMessage: 'Izin lokasi diperlukan untuk menggunakan lokasi saat ini.',
      provinceOptions: availableProvinces,
    };
  }

  const current = await resolveCurrentCoordinates(locationModule);
  if (!current) {
    return {
      kind: 'error',
      errorMessage:
        'Lokasi saat ini tidak tersedia. Pastikan GPS aktif lalu coba lagi, atau pilih manual.',
      provinceOptions: availableProvinces,
    };
  }

  const { resolvedAddress, fullAddress } = await resolveAddressFromCoordinates(
    locationModule,
    params.reverseGeocode,
    current.coords.latitude,
    current.coords.longitude,
  );

  if (!resolvedAddress) {
    return {
      kind: 'error',
      errorMessage:
        'Alamat dari lokasi saat ini tidak dapat dikenali. Silakan pilih area secara manual.',
      provinceOptions: availableProvinces,
    };
  }

  const matchedProvince = availableProvinces.find(option => {
    return normalizeAdminName(option.name) === normalizeAdminName(resolvedAddress.province);
  });

  if (!matchedProvince) {
    return {
      kind: 'error',
      errorMessage: 'Provinsi dari lokasi saat ini tidak ditemukan. Silakan pilih manual.',
      provinceOptions: availableProvinces,
    };
  }

  const { data: regencies, error: regencyError } = await params.fetchRegencies(
    matchedProvince.code,
  );
  if (regencyError || regencies.length === 0) {
    return {
      kind: 'error',
      errorMessage: 'Kota atau kabupaten dari lokasi saat ini tidak ditemukan.',
      provinceOptions: availableProvinces,
    };
  }

  const districtSearchResults = await Promise.all(
    regencies.map(async regency => {
      const { data: districts } = await params.fetchDistricts(regency.code);
      return { regency, districts: districts || [] };
    }),
  );

  const exactMatchedRegency = regencies.find(option => {
    return normalizeExactAdminName(option.name) === normalizeExactAdminName(resolvedAddress.city);
  });

  const fuzzyMatchedRegencies = regencies.filter(option =>
    adminNamesMatch(option.name, resolvedAddress.city),
  );

  let finalMatchedRegency = exactMatchedRegency;

  if (!finalMatchedRegency && fuzzyMatchedRegencies.length === 1) {
    finalMatchedRegency = fuzzyMatchedRegencies[0];
  }

  if (!finalMatchedRegency && fuzzyMatchedRegencies.length > 1) {
    const disambiguatedRegency = districtSearchResults.find(({ regency, districts }) => {
      return (
        fuzzyMatchedRegencies.some(match => match.code === regency.code) &&
        districts.some(d => adminNamesMatch(d.name, resolvedAddress.district))
      );
    });

    if (disambiguatedRegency) {
      finalMatchedRegency = disambiguatedRegency.regency;
    }
  }

  if (!finalMatchedRegency) {
    const foundDistrict = districtSearchResults.find(({ districts }) =>
      districts.some(d => adminNamesMatch(d.name, resolvedAddress.city)),
    );

    if (foundDistrict) {
      finalMatchedRegency = foundDistrict.regency;
    }
  }

  if (!finalMatchedRegency) {
    return {
      kind: 'manual',
      stage: 'city',
      errorMessage: 'Kota atau kabupaten tidak cocok otomatis. Silakan pilih manual.',
      province: matchedProvince,
      cityOptions: regencies,
    };
  }

  const { data: districts, error: districtError } = await params.fetchDistricts(
    finalMatchedRegency.code,
  );
  if (districtError || districts.length === 0) {
    return {
      kind: 'error',
      errorMessage: 'Kecamatan dari lokasi saat ini tidak ditemukan.',
    };
  }

  const matchedDistrict = districts.find(option => {
    return normalizeAdminName(option.name) === normalizeAdminName(resolvedAddress.district);
  });

  const districtCandidate =
    matchedDistrict ||
    districts.find(option =>
      normalizeAdminName(
        fullAddress ??
          `${resolvedAddress.district}, ${resolvedAddress.city}, ${resolvedAddress.province}`,
      ).includes(normalizeAdminName(option.name)),
    );

  if (!districtCandidate) {
    return {
      kind: 'manual',
      stage: 'district',
      errorMessage: 'Kecamatan tidak cocok otomatis. Silakan pilih manual.',
      province: matchedProvince,
      regency: finalMatchedRegency,
      districtOptions: districts,
    };
  }

  let finalDistrictCandidate = districtCandidate;
  let options = await params.resolvePostalOptions(
    matchedProvince,
    finalMatchedRegency,
    finalDistrictCandidate,
  );
  const normalizedResolvedPostalCode = normalizePostalCode(resolvedAddress.postalCode);

  if (
    normalizedResolvedPostalCode &&
    !options.some(option => normalizePostalCode(option.label) === normalizedResolvedPostalCode)
  ) {
    const postalMatchedDistrict = await findDistrictCandidateByPostalCode(
      districts,
      matchedProvince,
      finalMatchedRegency,
      normalizedResolvedPostalCode,
      params.resolvePostalOptions,
    );

    if (postalMatchedDistrict) {
      finalDistrictCandidate = postalMatchedDistrict.district;
      options = postalMatchedDistrict.options;
    }
  }

  if (options.length === 0) {
    return {
      kind: 'manual',
      stage: 'postal',
      errorMessage: 'Kode pos untuk lokasi saat ini belum ditemukan. Silakan pilih manual.',
      province: matchedProvince,
      regency: finalMatchedRegency,
      district: finalDistrictCandidate,
      postalOptions: options,
    };
  }

  const exactPostal = options.find(
    option => normalizePostalCode(option.label) === normalizedResolvedPostalCode,
  );
  const fallbackPostal = options.length === 1 ? options[0] : null;
  const selectedOption = exactPostal ?? fallbackPostal;

  if (!selectedOption) {
    return {
      kind: 'manual',
      stage: 'postal',
      errorMessage: 'Pilih kode pos yang paling sesuai dengan lokasi saat ini.',
      province: matchedProvince,
      regency: finalMatchedRegency,
      district: finalDistrictCandidate,
      postalOptions: options,
    };
  }

  const resolvedArea = await params.resolveAreaByPostal(
    matchedProvince,
    finalMatchedRegency,
    finalDistrictCandidate,
    selectedOption.label,
  );

  if (!resolvedArea) {
    return {
      kind: 'manual',
      stage: 'postal',
      errorMessage: 'Pilih kode pos yang paling sesuai dengan lokasi saat ini.',
      province: matchedProvince,
      regency: finalMatchedRegency,
      district: finalDistrictCandidate,
      postalOptions: options,
    };
  }

  return {
    kind: 'resolved',
    province: matchedProvince,
    regency: finalMatchedRegency,
    district: finalDistrictCandidate,
    postalOptions: options,
    selectedPostalLabel: selectedOption.label,
    area: resolvedArea,
    hierarchy: {
      provinceName: matchedProvince.name,
      regencyName: finalMatchedRegency.name,
      districtName: finalDistrictCandidate.name,
      postalCode: selectedOption.label,
    },
  };
}
