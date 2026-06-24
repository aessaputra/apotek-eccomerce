import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';
import {
  getPostalCodesByDistrict,
  getRegionalDistrictsByRegency,
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
  reverseGeocodeCoordinates,
  searchBiteshipArea,
} from '@/services';
import { setPendingAreaSelection } from '@/utils/areaPickerSession';
import { adminNamesMatch } from '@/utils/areaNormalization';
import { normalizePostalCode } from '@/utils/postalCode';
import {
  buildPendingAreaSelection,
  buildPostalOptions,
  type PostalOption,
} from './areaPickerHelpers';
import { resolveCurrentLocationSelection } from './areaPickerCurrentLocation';
import {
  filterNamedOptions,
  filterPostalOptions,
  findSelectedPostalOption,
} from './areaPickerState';
import type { SelectionStage, StageStatus } from './areaPickerTypes';

const CURRENT_LOCATION_TIMEOUT_MS = Platform.OS === 'web' ? 25000 : 20000;

type UseAreaPickerFlowParams = {
  onComplete: () => void;
};

type AreaSelectionHierarchy = {
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  postalCode?: string;
};

type NavigateToStageOptions = {
  clearDescendants?: boolean;
};

export function useAreaPickerFlow({ onComplete }: UseAreaPickerFlowParams) {
  const requestIdRef = useRef(0);

  const [stage, setStage] = useState<SelectionStage>('province');
  const [query, setQuery] = useState('');
  const [isLoadingStage, setIsLoadingStage] = useState(false);
  const [stageStatus, setStageStatus] = useState<StageStatus>({ kind: 'idle' });
  const [provinceOptions, setProvinceOptions] = useState<RegionalProvince[]>([]);
  const [cityOptions, setCityOptions] = useState<RegionalRegency[]>([]);
  const [districtOptions, setDistrictOptions] = useState<RegionalDistrict[]>([]);
  const [postalOptions, setPostalOptions] = useState<PostalOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<RegionalProvince | null>(null);
  const [selectedCity, setSelectedCity] = useState<RegionalRegency | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<RegionalDistrict | null>(null);
  const [selectedPostalLabel, setSelectedPostalLabel] = useState<string | null>(null);
  const [currentLocationStatus, setCurrentLocationStatus] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStage('province');
    setQuery('');
    setStageStatus({ kind: 'idle' });
    setCityOptions([]);
    setDistrictOptions([]);
    setPostalOptions([]);
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedDistrict(null);
    setSelectedPostalLabel(null);
  }, []);

  useEffect(() => {
    resetState();

    const loadProvinces = async () => {
      setIsLoadingStage(true);
      const { data, error } = await getRegionalProvinces();
      setProvinceOptions(data);
      if (error) {
        setStageStatus({ kind: 'error', message: 'Gagal memuat daftar provinsi.' });
      }
      setIsLoadingStage(false);
    };

    void loadProvinces();
  }, [resetState]);

  const filteredProvinces = useMemo(
    () => filterNamedOptions(provinceOptions, query),
    [provinceOptions, query],
  );

  const filteredCities = useMemo(
    () => filterNamedOptions(cityOptions, query),
    [cityOptions, query],
  );

  const filteredDistricts = useMemo(
    () => filterNamedOptions(districtOptions, query),
    [districtOptions, query],
  );

  const filteredPostalOptions = useMemo(
    () => filterPostalOptions(postalOptions, query),
    [postalOptions, query],
  );

  const selectedPostalOption = useMemo(
    () => findSelectedPostalOption(postalOptions, selectedPostalLabel),
    [postalOptions, selectedPostalLabel],
  );

  const matchesHierarchy = useCallback(
    (area: BiteshipArea, provinceName: string, regencyName: string, districtName: string) => {
      return (
        adminNamesMatch(area.administrative_division_level_1_name, provinceName) &&
        adminNamesMatch(area.administrative_division_level_2_name, regencyName) &&
        adminNamesMatch(area.administrative_division_level_3_name, districtName)
      );
    },
    [],
  );

  const resolvePostalOptions = useCallback(
    async (
      province: RegionalProvince,
      regency: RegionalRegency,
      district: RegionalDistrict,
    ): Promise<PostalOption[]> => {
      const { data, error } = await getPostalCodesByDistrict(
        province.code,
        regency.code,
        district.name,
      );

      if (error || data.length === 0) {
        return [];
      }

      return buildPostalOptions(data);
    },
    [],
  );

  const resolveAreaByPostal = useCallback(
    async (
      province: RegionalProvince,
      regency: RegionalRegency,
      district: RegionalDistrict,
      postalCode: string,
    ): Promise<BiteshipArea | null> => {
      // Try the most specific search first
      const primaryInput = `${postalCode}, ${district.name}, ${regency.name}, ${province.name}`;
      const { data: primaryData, error: primaryError } = await searchBiteshipArea(primaryInput);

      if (!primaryError && primaryData.length > 0) {
        const exact = primaryData.find(area => {
          return (
            normalizePostalCode(area.postal_code) === normalizePostalCode(postalCode) &&
            matchesHierarchy(area, province.name, regency.name, district.name)
          );
        });

        if (exact) {
          return exact;
        }
      }

      // If primary search had a network error, don't retry with broader queries
      if (primaryError) {
        return null;
      }

      // Fallback: try progressively broader searches
      const fallbackAttempts = [
        `${postalCode}, ${regency.name}, ${province.name}`,
        `${postalCode}, ${district.name}`,
        postalCode,
      ];

      for (const input of fallbackAttempts) {
        const { data, error } = await searchBiteshipArea(input);
        if (error) break;

        const exact = data.find(area => {
          return (
            normalizePostalCode(area.postal_code) === normalizePostalCode(postalCode) &&
            matchesHierarchy(area, province.name, regency.name, district.name)
          );
        });

        if (exact) {
          return exact;
        }
      }

      return null;
    },
    [matchesHierarchy],
  );

  const handleAreaSelection = useCallback(
    (area: BiteshipArea, hierarchy?: AreaSelectionHierarchy) => {
      const pendingSelection = buildPendingAreaSelection(
        area,
        {
          provinceName: selectedProvince?.name,
          regencyName: selectedCity?.name,
          districtName: selectedDistrict?.name,
          postalCode: selectedPostalLabel ?? undefined,
        },
        hierarchy,
      );

      try {
        setPendingAreaSelection(pendingSelection);
      } catch {
        setStageStatus({
          kind: 'error',
          message: 'Gagal menyimpan pilihan area. Silakan coba lagi.',
        });
        return;
      }

      onComplete();
    },
    [
      onComplete,
      selectedCity?.name,
      selectedDistrict?.name,
      selectedPostalLabel,
      selectedProvince?.name,
    ],
  );

  const loadCities = useCallback(async (province: RegionalProvince) => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageStatus({ kind: 'idle' });
    const { data, error } = await getRegionalRegenciesByProvince(province.code);
    if (requestId !== requestIdRef.current) return;
    setCityOptions(data);
    if (error || data.length === 0) {
      setStageStatus({
        kind: 'error',
        message: 'Kota atau kabupaten untuk provinsi ini belum ditemukan.',
      });
    }
    setIsLoadingStage(false);
  }, []);

  const loadDistricts = useCallback(async (regency: RegionalRegency) => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageStatus({ kind: 'idle' });
    const { data, error } = await getRegionalDistrictsByRegency(regency.code);
    if (requestId !== requestIdRef.current) return;
    setDistrictOptions(data);
    if (error || data.length === 0) {
      setStageStatus({
        kind: 'error',
        message: 'Kecamatan untuk kota atau kabupaten ini belum ditemukan.',
      });
    }
    setIsLoadingStage(false);
  }, []);

  const loadPostalCodes = useCallback(
    async (province: RegionalProvince, regency: RegionalRegency, district: RegionalDistrict) => {
      const requestId = ++requestIdRef.current;
      setIsLoadingStage(true);
      setStageStatus({ kind: 'idle' });

      const options = await resolvePostalOptions(province, regency, district);

      if (requestId !== requestIdRef.current) return;
      setPostalOptions(options);
      if (options.length === 0) {
        setStageStatus({
          kind: 'error',
          message: 'Kode pos untuk kecamatan ini belum ditemukan. Silakan pilih kecamatan lain.',
        });
      }
      setIsLoadingStage(false);
    },
    [resolvePostalOptions],
  );

  const handleProvinceSelect = useCallback(
    async (province: RegionalProvince) => {
      setSelectedProvince(province);
      setSelectedCity(null);
      setSelectedDistrict(null);
      setPostalOptions([]);
      setSelectedPostalLabel(null);
      setQuery('');
      setStage('city');
      await loadCities(province);
    },
    [loadCities],
  );

  const handleCitySelect = useCallback(
    async (city: RegionalRegency) => {
      setSelectedCity(city);
      setSelectedDistrict(null);
      setPostalOptions([]);
      setSelectedPostalLabel(null);
      setQuery('');
      setStage('district');
      await loadDistricts(city);
    },
    [loadDistricts],
  );

  const handleDistrictSelect = useCallback(
    async (district: RegionalDistrict) => {
      if (!selectedProvince || !selectedCity) return;
      setSelectedDistrict(district);
      setQuery('');
      setStage('postal');
      await loadPostalCodes(selectedProvince, selectedCity, district);
    },
    [loadPostalCodes, selectedCity, selectedProvince],
  );

  const handlePostalSelect = useCallback(
    async (option: PostalOption) => {
      if (!selectedProvince || !selectedCity || !selectedDistrict) {
        return;
      }

      const requestId = ++requestIdRef.current;
      setIsLoadingStage(true);
      setStageStatus({ kind: 'idle' });
      setSelectedPostalLabel(option.label);
      let resolvedArea: BiteshipArea | null = null;

      try {
        resolvedArea = await resolveAreaByPostal(
          selectedProvince,
          selectedCity,
          selectedDistrict,
          option.label,
        );
      } catch {
        if (requestId === requestIdRef.current) {
          setStageStatus({
            kind: 'error',
            message:
              'Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.',
          });
        }
        return;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingStage(false);
        }
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!resolvedArea) {
        setStageStatus({
          kind: 'error',
          message:
            'Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.',
        });
        return;
      }

      handleAreaSelection(resolvedArea, {
        provinceName: selectedProvince.name,
        regencyName: selectedCity.name,
        districtName: selectedDistrict.name,
        postalCode: option.label,
      });
    },
    [handleAreaSelection, resolveAreaByPostal, selectedCity, selectedDistrict, selectedProvince],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageStatus({ kind: 'idle' });
    setCurrentLocationStatus('Mendapatkan lokasi GPS...');

    try {
      const locationPromise = resolveCurrentLocationSelection({
        provinceOptions,
        fetchProvinces: async () => (await getRegionalProvinces()).data,
        fetchRegencies: getRegionalRegenciesByProvince,
        fetchDistricts: getRegionalDistrictsByRegency,
        reverseGeocode: async coords => {
          setCurrentLocationStatus('Mengenali alamat dari titik lokasi...');
          const { data, error } = await reverseGeocodeCoordinates(coords);
          if (!error && data) {
            setCurrentLocationStatus('Mencocokkan alamat dengan database wilayah...');
          }
          return {
            data: data
              ? {
                  province: data.province,
                  city: data.city,
                  district: data.district,
                  postalCode: data.postalCode,
                  fullAddress: data.fullAddress,
                }
              : null,
            error,
          };
        },
        resolvePostalOptions,
        resolveAreaByPostal,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), CURRENT_LOCATION_TIMEOUT_MS),
      );

      const result = await Promise.race([locationPromise, timeoutPromise]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCurrentLocationStatus(null);

      if ('provinceOptions' in result && result.provinceOptions && provinceOptions.length === 0) {
        setProvinceOptions(result.provinceOptions);
      }

      if (result.kind === 'error') {
        setStageStatus({ kind: 'error', message: result.errorMessage });
        return;
      }

      if (result.kind === 'manual') {
        setSelectedProvince(result.province ?? null);
        setSelectedCity(result.regency ?? null);
        setSelectedDistrict(result.district ?? null);
        setSelectedPostalLabel(null);
        setQuery('');
        setStage(result.stage);

        if (result.stage === 'city') {
          setDistrictOptions([]);
          setPostalOptions([]);
        }

        if (result.stage === 'district') {
          setPostalOptions([]);
        }

        if (result.cityOptions) {
          setCityOptions(result.cityOptions);
        }

        if (result.districtOptions) {
          setDistrictOptions(result.districtOptions);
        }

        if (result.postalOptions) {
          setPostalOptions(result.postalOptions);
        }

        setStageStatus({ kind: 'guidance', message: result.errorMessage });
        return;
      }

      setSelectedProvince(result.province);
      setSelectedCity(result.regency);
      setSelectedDistrict(result.district);
      setPostalOptions(result.postalOptions);
      setSelectedPostalLabel(result.selectedPostalLabel);
      setStage('postal');
      setQuery('');
      handleAreaSelection(result.area, result.hierarchy);
    } catch (error) {
      if (__DEV__) {
        console.error('handleUseCurrentLocation error:', error);
      }
      const isTimeout = error instanceof Error && error.message === 'LOCATION_TIMEOUT';
      setStageStatus({
        kind: 'error',
        message: isTimeout
          ? 'Pencarian lokasi membutuhkan waktu terlalu lama. Silakan pilih area secara manual.'
          : 'Gagal mendapatkan lokasi saat ini. Silakan coba lagi.',
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingStage(false);
        setCurrentLocationStatus(null);
      }
    }
  }, [handleAreaSelection, provinceOptions, resolveAreaByPostal, resolvePostalOptions]);

  const navigateToStage = useCallback(
    (targetStage: SelectionStage, options?: NavigateToStageOptions) => {
      const { clearDescendants = true } = options ?? {};

      setQuery('');
      setStageStatus({ kind: 'idle' });
      setStage(targetStage);

      if (clearDescendants) {
        if (targetStage === 'province') {
          setSelectedCity(null);
          setSelectedDistrict(null);
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        } else if (targetStage === 'city') {
          setSelectedDistrict(null);
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        } else if (targetStage === 'district') {
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        }
      }
    },
    [],
  );

  const handleBack = useCallback(() => {
    if (stage === 'postal') {
      navigateToStage('district');
      return;
    }
    if (stage === 'district') {
      navigateToStage('city');
      return;
    }
    if (stage === 'city') {
      navigateToStage('province');
      return;
    }

    onComplete();
  }, [navigateToStage, onComplete, stage]);

  return {
    stage,
    query,
    setQuery,
    isLoadingStage,
    stageStatus,
    currentLocationStatus,
    selectedProvince,
    selectedCity,
    selectedDistrict,
    selectedPostalLabel,
    selectedPostalOption,
    filteredProvinces,
    filteredCities,
    filteredDistricts,
    filteredPostalOptions,
    resetState,
    navigateToStage,
    handleBack,
    handleProvinceSelect,
    handleCitySelect,
    handleDistrictSelect,
    handlePostalSelect,
    handleUseCurrentLocation,
  };
}
