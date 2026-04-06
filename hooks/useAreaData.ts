import { useQuery, useQueries } from '@tanstack/react-query';
import {
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
  getRegionalDistrictsByRegency,
} from '@/services';
import type { RegionalProvince, RegionalRegency, RegionalDistrict } from '@/types/regional';

const STALE_TIME = 1000 * 60 * 60;

export function useProvinces() {
  return useQuery<RegionalProvince[], Error>({
    queryKey: ['provinces'],
    queryFn: async () => {
      const { data, error } = await getRegionalProvinces();
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });
}

export function useRegencies(provinceCode: string | undefined) {
  return useQuery<RegionalRegency[], Error>({
    queryKey: ['regencies', provinceCode],
    queryFn: async () => {
      if (!provinceCode) return [];
      const { data, error } = await getRegionalRegenciesByProvince(provinceCode);
      if (error) throw error;
      return data;
    },
    enabled: !!provinceCode,
    staleTime: STALE_TIME,
  });
}

export function useDistricts(regencyCode: string | undefined) {
  return useQuery<RegionalDistrict[], Error>({
    queryKey: ['districts', regencyCode],
    queryFn: async () => {
      if (!regencyCode) return [];
      const { data, error } = await getRegionalDistrictsByRegency(regencyCode);
      if (error) throw error;
      return data;
    },
    enabled: !!regencyCode,
    staleTime: STALE_TIME,
  });
}

export function useBatchDistricts(regencyCodes: string[]) {
  return useQueries({
    queries: regencyCodes.map(code => ({
      queryKey: ['districts', code],
      queryFn: async () => {
        const { data, error } = await getRegionalDistrictsByRegency(code);
        if (error) throw error;
        return { regencyCode: code, districts: data };
      },
      enabled: !!code,
      staleTime: STALE_TIME,
    })),
  });
}
