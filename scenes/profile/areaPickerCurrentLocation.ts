import * as Location from 'expo-location';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';
import {
  adminNamesMatch,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/utils/areaNormalization';
import { normalizePostalCode } from '@/utils/postalCode';
import type { SelectionStage } from './areaPickerTypes';
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
  stage: Exclude<SelectionStage, 'province'>;
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
): Promise<{ location: Location.LocationObject | null; usedLastKnown: boolean }> {
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
    return { location: current, usedLastKnown: false };
  }

  return {
    location: await locationModule.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }),
    usedLastKnown: true,
  };
}

async function resolveAddressFromCoordinates(
  locationModule: LocationModule,
  reverseGeocode: ResolveCurrentLocationSelectionParams['reverseGeocode'],
  latitude: number,
  longitude: number,
): Promise<{ resolvedAddress: CurrentLocationAddress | null }> {
  const { data: reversed, error: reverseError } = await reverseGeocode({ latitude, longitude });

  if (reversed && !reverseError) {
    return {
      resolvedAddress: normalizeCurrentLocationAddress(reversed),
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

type CurrentLocationErrorOptions = {
  errorMessage: string;
  provinceOptions?: RegionalProvince[];
};

type ManualCityFallbackOptions = {
  province: RegionalProvince;
  cityOptions: RegionalRegency[];
};

type ManualDistrictFallbackOptions = {
  province: RegionalProvince;
  regency: RegionalRegency;
  districtOptions: RegionalDistrict[];
};

type ManualPostalFallbackOptions = {
  errorMessage: string;
  province: RegionalProvince;
  regency: RegionalRegency;
  district: RegionalDistrict;
  postalOptions: PostalOption[];
};

type DistrictSearchResult = {
  regency: RegionalRegency;
  districts: RegionalDistrict[];
};

type LocatedAddress = {
  address: CurrentLocationAddress;
  usedLastKnown: boolean;
};

type ProvinceResolution =
  | { matchedProvince: RegionalProvince; fallback?: never }
  | { matchedProvince?: never; fallback: FailedCurrentLocationSelection };

type RegencyResolution =
  | { matchedRegency: RegionalRegency; fallback?: never }
  | {
      matchedRegency?: never;
      fallback: FailedCurrentLocationSelection | ManualCurrentLocationSelection;
    };

type DistrictPostalResolution =
  | { district: RegionalDistrict; postalOptions: PostalOption[]; fallback?: never }
  | {
      district?: never;
      postalOptions?: never;
      fallback: FailedCurrentLocationSelection | ManualCurrentLocationSelection;
    };

type AreaResolution = ResolvedCurrentLocationSelection | ManualCurrentLocationSelection;

function shapeCurrentLocationError({
  errorMessage,
  provinceOptions,
}: CurrentLocationErrorOptions): FailedCurrentLocationSelection {
  return provinceOptions
    ? { kind: 'error', errorMessage, provinceOptions }
    : { kind: 'error', errorMessage };
}

function shapeManualCityFallback({
  province,
  cityOptions,
}: ManualCityFallbackOptions): ManualCurrentLocationSelection {
  return {
    kind: 'manual',
    stage: 'city',
    errorMessage: 'Kota atau kabupaten tidak cocok otomatis. Silakan pilih manual.',
    province,
    cityOptions,
  };
}

function shapeManualDistrictFallback({
  province,
  regency,
  districtOptions,
}: ManualDistrictFallbackOptions): ManualCurrentLocationSelection {
  return {
    kind: 'manual',
    stage: 'district',
    errorMessage: 'Kecamatan tidak cocok otomatis. Silakan pilih manual.',
    province,
    regency,
    districtOptions,
  };
}

function shapeManualPostalFallback({
  errorMessage,
  province,
  regency,
  district,
  postalOptions,
}: ManualPostalFallbackOptions): ManualCurrentLocationSelection {
  return {
    kind: 'manual',
    stage: 'postal',
    errorMessage,
    province,
    regency,
    district,
    postalOptions,
  };
}

async function loadAvailableProvinces(
  params: ResolveCurrentLocationSelectionParams,
): Promise<RegionalProvince[]> {
  return params.provinceOptions.length > 0 ? params.provinceOptions : await params.fetchProvinces();
}

async function ensureLocationPermission(
  locationModule: LocationModule,
  availableProvinces: RegionalProvince[],
): Promise<FailedCurrentLocationSelection | null> {
  const permission = await locationModule.requestForegroundPermissionsAsync();

  if (permission.status === 'granted') {
    return null;
  }

  return shapeCurrentLocationError({
    errorMessage: 'Izin lokasi diperlukan untuk menggunakan lokasi saat ini.',
    provinceOptions: availableProvinces,
  });
}

async function resolveLocatedAddress(
  params: ResolveCurrentLocationSelectionParams,
  locationModule: LocationModule,
  availableProvinces: RegionalProvince[],
): Promise<LocatedAddress | FailedCurrentLocationSelection> {
  const { location: current, usedLastKnown } = await resolveCurrentCoordinates(locationModule);

  if (!current) {
    return shapeCurrentLocationError({
      errorMessage:
        'Lokasi saat ini tidak tersedia. Pastikan GPS aktif lalu coba lagi, atau pilih manual.',
      provinceOptions: availableProvinces,
    });
  }

  const { resolvedAddress } = await resolveAddressFromCoordinates(
    locationModule,
    params.reverseGeocode,
    current.coords.latitude,
    current.coords.longitude,
  );

  if (!resolvedAddress) {
    return shapeCurrentLocationError({
      errorMessage:
        'Alamat dari lokasi saat ini tidak dapat dikenali. Silakan pilih area secara manual.',
      provinceOptions: availableProvinces,
    });
  }

  return { address: resolvedAddress, usedLastKnown };
}

function resolveProvincePhase(
  address: CurrentLocationAddress,
  availableProvinces: RegionalProvince[],
): ProvinceResolution {
  const matchedProvince = availableProvinces.find(option => {
    return normalizeAdminName(option.name) === normalizeAdminName(address.province);
  });

  if (!matchedProvince) {
    return {
      fallback: shapeCurrentLocationError({
        errorMessage: 'Provinsi dari lokasi saat ini tidak ditemukan. Silakan pilih manual.',
        provinceOptions: availableProvinces,
      }),
    };
  }

  return { matchedProvince };
}

async function fetchDistrictsForRegencies(
  regencies: RegionalRegency[],
  fetchDistricts: ResolveCurrentLocationSelectionParams['fetchDistricts'],
): Promise<DistrictSearchResult[]> {
  return Promise.all(
    regencies.map(async regency => {
      const { data: districts } = await fetchDistricts(regency.code);
      return { regency, districts: districts || [] };
    }),
  );
}

function findCorroboratedFuzzyRegency(
  fuzzyMatchedRegencies: RegionalRegency[],
  districtSearchResults: DistrictSearchResult[],
  districtName: string,
): RegionalRegency | undefined {
  const corroboratedRegency = districtSearchResults.find(({ regency, districts }) => {
    return (
      regency.code === fuzzyMatchedRegencies[0]?.code &&
      districts.some(district => adminNamesMatch(district.name, districtName))
    );
  });

  return corroboratedRegency?.regency;
}

function disambiguateRegencyByDistrict(
  fuzzyMatchedRegencies: RegionalRegency[],
  districtSearchResults: DistrictSearchResult[],
  districtName: string,
): RegionalRegency | undefined {
  const disambiguatedRegency = districtSearchResults.find(({ regency, districts }) => {
    return (
      fuzzyMatchedRegencies.some(match => match.code === regency.code) &&
      districts.some(district => adminNamesMatch(district.name, districtName))
    );
  });

  return disambiguatedRegency?.regency;
}

function selectRegencyFromCitySignal(
  regencies: RegionalRegency[],
  districtSearchResults: DistrictSearchResult[],
  address: CurrentLocationAddress,
): RegionalRegency | undefined {
  const exactMatchedRegency = regencies.find(option => {
    return normalizeExactAdminName(option.name) === normalizeExactAdminName(address.city);
  });

  if (exactMatchedRegency) {
    return exactMatchedRegency;
  }

  const fuzzyMatchedRegencies = regencies.filter(option =>
    adminNamesMatch(option.name, address.city),
  );
  const hasStrongDistrictSignal = Boolean(address.district);

  if (fuzzyMatchedRegencies.length === 1 && hasStrongDistrictSignal) {
    return findCorroboratedFuzzyRegency(
      fuzzyMatchedRegencies,
      districtSearchResults,
      address.district,
    );
  }

  if (fuzzyMatchedRegencies.length > 1) {
    return disambiguateRegencyByDistrict(
      fuzzyMatchedRegencies,
      districtSearchResults,
      address.district,
    );
  }

  return undefined;
}

async function resolveCityPhase(
  params: ResolveCurrentLocationSelectionParams,
  province: RegionalProvince,
  address: CurrentLocationAddress,
  availableProvinces: RegionalProvince[],
): Promise<RegencyResolution> {
  const { data: regencies, error: regencyError } = await params.fetchRegencies(province.code);

  if (regencyError || regencies.length === 0) {
    return {
      fallback: shapeCurrentLocationError({
        errorMessage: 'Kota atau kabupaten dari lokasi saat ini tidak ditemukan.',
        provinceOptions: availableProvinces,
      }),
    };
  }

  const districtSearchResults = await fetchDistrictsForRegencies(regencies, params.fetchDistricts);
  const matchedRegency = selectRegencyFromCitySignal(regencies, districtSearchResults, address);

  if (!matchedRegency) {
    return { fallback: shapeManualCityFallback({ province, cityOptions: regencies }) };
  }

  return { matchedRegency };
}

function findDistrictByName(
  districts: RegionalDistrict[],
  address: CurrentLocationAddress,
): RegionalDistrict | undefined {
  if (!address.district) {
    return undefined;
  }

  return districts.find(option => {
    return normalizeAdminName(option.name) === normalizeAdminName(address.district);
  });
}

async function resolveInitialPostalOptions(
  params: ResolveCurrentLocationSelectionParams,
  province: RegionalProvince,
  regency: RegionalRegency,
  district: RegionalDistrict | undefined,
  usedLastKnown: boolean,
): Promise<PostalOption[]> {
  if (!district || usedLastKnown) {
    return [];
  }

  return params.resolvePostalOptions(province, regency, district);
}

function postalOptionsIncludeDetectedCode(
  options: PostalOption[],
  normalizedPostalCode: string,
): boolean {
  return options.some(option => normalizePostalCode(option.label) === normalizedPostalCode);
}

async function resolveDistrictFromPostalCode(
  params: ResolveCurrentLocationSelectionParams,
  districts: RegionalDistrict[],
  province: RegionalProvince,
  regency: RegionalRegency,
  normalizedPostalCode: string,
): Promise<{ district: RegionalDistrict; postalOptions: PostalOption[] } | null> {
  const postalMatchedDistrict = await findDistrictCandidateByPostalCode(
    districts,
    province,
    regency,
    normalizedPostalCode,
    params.resolvePostalOptions,
  );

  return postalMatchedDistrict
    ? { district: postalMatchedDistrict.district, postalOptions: postalMatchedDistrict.options }
    : null;
}

async function resolveDistrictPostalPhase(
  params: ResolveCurrentLocationSelectionParams,
  province: RegionalProvince,
  regency: RegionalRegency,
  address: CurrentLocationAddress,
  usedLastKnown: boolean,
): Promise<DistrictPostalResolution> {
  const { data: districts, error: districtError } = await params.fetchDistricts(regency.code);

  if (districtError || districts.length === 0) {
    return {
      fallback: shapeCurrentLocationError({
        errorMessage: 'Kecamatan dari lokasi saat ini tidak ditemukan.',
      }),
    };
  }

  const normalizedResolvedPostalCode = normalizePostalCode(address.postalCode);
  let finalDistrictCandidate = findDistrictByName(districts, address);
  let postalOptions = await resolveInitialPostalOptions(
    params,
    province,
    regency,
    finalDistrictCandidate,
    usedLastKnown,
  );

  if (
    normalizedResolvedPostalCode &&
    (!finalDistrictCandidate ||
      !postalOptionsIncludeDetectedCode(postalOptions, normalizedResolvedPostalCode))
  ) {
    const postalMatchedDistrict = await resolveDistrictFromPostalCode(
      params,
      districts,
      province,
      regency,
      normalizedResolvedPostalCode,
    );

    if (postalMatchedDistrict) {
      finalDistrictCandidate = postalMatchedDistrict.district;
      postalOptions = postalMatchedDistrict.postalOptions;
    }
  }

  if (!finalDistrictCandidate) {
    return {
      fallback: shapeManualDistrictFallback({
        province,
        regency,
        districtOptions: districts,
      }),
    };
  }

  if (postalOptions.length === 0) {
    postalOptions = await params.resolvePostalOptions(province, regency, finalDistrictCandidate);
  }

  if (postalOptions.length === 0) {
    return {
      fallback: shapeManualPostalFallback({
        errorMessage: 'Kode pos untuk lokasi saat ini belum ditemukan. Silakan pilih manual.',
        province,
        regency,
        district: finalDistrictCandidate,
        postalOptions,
      }),
    };
  }

  return { district: finalDistrictCandidate, postalOptions };
}

function selectDetectedPostalOption(
  options: PostalOption[],
  address: CurrentLocationAddress,
): PostalOption | null {
  const normalizedResolvedPostalCode = normalizePostalCode(address.postalCode);

  return (
    options.find(option => normalizePostalCode(option.label) === normalizedResolvedPostalCode) ??
    null
  );
}

async function resolveFinalAreaPhase(
  params: ResolveCurrentLocationSelectionParams,
  province: RegionalProvince,
  regency: RegionalRegency,
  district: RegionalDistrict,
  postalOptions: PostalOption[],
  address: CurrentLocationAddress,
): Promise<AreaResolution> {
  const selectedOption = selectDetectedPostalOption(postalOptions, address);

  if (!selectedOption) {
    return shapeManualPostalFallback({
      errorMessage: 'Pilih kode pos yang paling sesuai dengan lokasi saat ini.',
      province,
      regency,
      district,
      postalOptions,
    });
  }

  const resolvedArea = await params.resolveAreaByPostal(
    province,
    regency,
    district,
    selectedOption.label,
  );

  if (!resolvedArea) {
    return shapeManualPostalFallback({
      errorMessage: 'Pilih kode pos yang paling sesuai dengan lokasi saat ini.',
      province,
      regency,
      district,
      postalOptions,
    });
  }

  return {
    kind: 'resolved',
    province,
    regency,
    district,
    postalOptions,
    selectedPostalLabel: selectedOption.label,
    area: resolvedArea,
    hierarchy: {
      provinceName: province.name,
      regencyName: regency.name,
      districtName: district.name,
      postalCode: selectedOption.label,
    },
  };
}

export async function resolveCurrentLocationSelection(
  params: ResolveCurrentLocationSelectionParams,
): Promise<CurrentLocationSelectionResult> {
  const locationModule = params.locationModule ?? Location;
  const availableProvinces = await loadAvailableProvinces(params);

  if (availableProvinces.length === 0) {
    return shapeCurrentLocationError({
      errorMessage: 'Daftar provinsi belum siap. Silakan coba lagi.',
    });
  }

  const permissionFallback = await ensureLocationPermission(locationModule, availableProvinces);
  if (permissionFallback) {
    return permissionFallback;
  }

  const locatedAddress = await resolveLocatedAddress(params, locationModule, availableProvinces);
  if ('kind' in locatedAddress) {
    return locatedAddress;
  }

  const provinceResolution = resolveProvincePhase(locatedAddress.address, availableProvinces);
  if (provinceResolution.fallback) {
    return provinceResolution.fallback;
  }

  const cityResolution = await resolveCityPhase(
    params,
    provinceResolution.matchedProvince,
    locatedAddress.address,
    availableProvinces,
  );
  if (cityResolution.fallback) {
    return cityResolution.fallback;
  }

  const districtPostalResolution = await resolveDistrictPostalPhase(
    params,
    provinceResolution.matchedProvince,
    cityResolution.matchedRegency,
    locatedAddress.address,
    locatedAddress.usedLastKnown,
  );
  if (districtPostalResolution.fallback) {
    return districtPostalResolution.fallback;
  }

  return resolveFinalAreaPhase(
    params,
    provinceResolution.matchedProvince,
    cityResolution.matchedRegency,
    districtPostalResolution.district,
    districtPostalResolution.postalOptions,
    locatedAddress.address,
  );
}
