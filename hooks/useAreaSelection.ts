import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
  getRegionalDistrictsByRegency,
  searchBiteshipArea,
} from '@/services';
import { normalize } from '@/utils/areaNormalization';
import type { RegionalProvince, RegionalRegency, RegionalDistrict } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';

const ONE_DAY = 1000 * 60 * 60 * 24;

const retryConfig = {
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

export type SelectionStage = 'province' | 'city' | 'district' | 'postal';

interface AreaSelectionState {
  stage: SelectionStage;
  query: string;
  selectedProvince: RegionalProvince | null;
  selectedCity: RegionalRegency | null;
  selectedDistrict: RegionalDistrict | null;
  selectedArea: BiteshipArea | null;
  isLoading: boolean;
  error: string | null;
}

export function useAreaSelection() {
  const router = useRouter();
  const requestIdRef = useRef(0);

  const [state, setState] = useState<AreaSelectionState>({
    stage: 'province',
    query: '',
    selectedProvince: null,
    selectedCity: null,
    selectedDistrict: null,
    selectedArea: null,
    isLoading: false,
    error: null,
  });

  const currentRequestId = useCallback(() => {
    return ++requestIdRef.current;
  }, []);

  const isStaleRequest = useCallback((requestId: number) => {
    return requestId !== requestIdRef.current;
  }, []);

  const { data: provinces = [], isLoading: isLoadingProvinces } = useQuery<
    RegionalProvince[],
    Error
  >({
    queryKey: ['provinces'],
    queryFn: async () => {
      const { data, error } = await getRegionalProvinces();
      if (error) throw error;
      return data;
    },
    staleTime: ONE_DAY,
    gcTime: ONE_DAY * 7,
    ...retryConfig,
  });

  const { data: cities = [], isLoading: isLoadingCities } = useQuery<RegionalRegency[], Error>({
    queryKey: ['regencies', state.selectedProvince?.code],
    queryFn: async () => {
      if (!state.selectedProvince) return [];
      const { data, error } = await getRegionalRegenciesByProvince(state.selectedProvince.code);
      if (error) throw error;
      return data;
    },
    enabled: !!state.selectedProvince,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY * 7,
    ...retryConfig,
  });

  const { data: districts = [], isLoading: isLoadingDistricts } = useQuery<
    RegionalDistrict[],
    Error
  >({
    queryKey: ['districts', state.selectedCity?.code],
    queryFn: async () => {
      if (!state.selectedCity) return [];
      const { data, error } = await getRegionalDistrictsByRegency(state.selectedCity.code);
      if (error) throw error;
      return data;
    },
    enabled: !!state.selectedCity,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY * 7,
    ...retryConfig,
  });

  const filteredProvinces = useMemo(() => {
    const trimmed = normalize(state.query);
    return provinces.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [provinces, state.query]);

  const filteredCities = useMemo(() => {
    const trimmed = normalize(state.query);
    return cities.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [cities, state.query]);

  const filteredDistricts = useMemo(() => {
    const trimmed = normalize(state.query);
    return districts.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [districts, state.query]);

  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const selectProvince = useCallback(
    async (province: RegionalProvince) => {
      const requestId = currentRequestId();

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        selectedProvince: province,
        selectedCity: null,
        selectedDistrict: null,
        selectedArea: null,
      }));

      try {
        const { data, error } = await getRegionalRegenciesByProvince(province.code);

        if (isStaleRequest(requestId)) return;

        if (error) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Gagal memuat daftar kota/kabupaten',
            selectedProvince: null,
          }));
          return;
        }

        if (data.length === 0) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Tidak ada kota/kabupaten untuk provinsi ini',
            selectedProvince: null,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          stage: 'city',
        }));
      } catch {
        if (!isStaleRequest(requestId)) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Terjadi kesalahan saat memuat data',
            selectedProvince: null,
          }));
        }
      }
    },
    [currentRequestId, isStaleRequest],
  );

  const selectCity = useCallback(
    async (city: RegionalRegency) => {
      const requestId = currentRequestId();

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        selectedCity: city,
        selectedDistrict: null,
        selectedArea: null,
      }));

      try {
        const { data, error } = await getRegionalDistrictsByRegency(city.code);

        if (isStaleRequest(requestId)) return;

        if (error) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Gagal memuat daftar kecamatan',
            selectedCity: null,
          }));
          return;
        }

        if (data.length === 0) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Tidak ada kecamatan untuk kota/kabupaten ini',
            selectedCity: null,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          stage: 'district',
        }));
      } catch {
        if (!isStaleRequest(requestId)) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Terjadi kesalahan saat memuat data',
            selectedCity: null,
          }));
        }
      }
    },
    [currentRequestId, isStaleRequest],
  );

  const selectDistrict = useCallback(
    async (district: RegionalDistrict) => {
      if (!state.selectedProvince || !state.selectedCity) return;

      const requestId = currentRequestId();

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        selectedDistrict: district,
        selectedArea: null,
      }));

      try {
        const { data, error } = await searchBiteshipArea(
          `${district.name}, ${state.selectedCity.name}, ${state.selectedProvince.name}`,
        );

        if (isStaleRequest(requestId)) return;

        if (error) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Gagal memuat kode pos',
            selectedDistrict: null,
          }));
          return;
        }

        if (data.length === 0) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Tidak ada kode pos untuk kecamatan ini',
            selectedDistrict: null,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          stage: 'postal',
        }));
      } catch {
        if (!isStaleRequest(requestId)) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Terjadi kesalahan saat memuat data',
            selectedDistrict: null,
          }));
        }
      }
    },
    [currentRequestId, isStaleRequest, state.selectedProvince, state.selectedCity],
  );

  const selectPostal = useCallback((area: BiteshipArea) => {
    setState(prev => ({
      ...prev,
      selectedArea: area,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.stage === 'postal') {
        return { ...prev, stage: 'district', selectedArea: null, error: null };
      } else if (prev.stage === 'district') {
        return { ...prev, stage: 'city', selectedDistrict: null, error: null };
      } else if (prev.stage === 'city') {
        return { ...prev, stage: 'province', selectedCity: null, error: null };
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      stage: 'province',
      query: '',
      selectedProvince: null,
      selectedCity: null,
      selectedDistrict: null,
      selectedArea: null,
      isLoading: false,
      error: null,
    });
    requestIdRef.current = 0;
  }, []);

  const isLoading = isLoadingProvinces || isLoadingCities || isLoadingDistricts || state.isLoading;

  return {
    stage: state.stage,
    query: state.query,
    provinces: filteredProvinces,
    cities: filteredCities,
    districts: filteredDistricts,
    postalOptions: state.selectedDistrict ? undefined : undefined,
    selectedProvince: state.selectedProvince,
    selectedCity: state.selectedCity,
    selectedDistrict: state.selectedDistrict,
    selectedArea: state.selectedArea,
    isLoading,
    error: state.error,
    setQuery,
    selectProvince,
    selectCity,
    selectDistrict,
    selectPostal,
    goBack,
    reset,
  };
}
