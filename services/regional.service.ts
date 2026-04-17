import type {
  RegionalDistrict,
  RegionalDistrictPostalData,
  RegionalProvince,
  RegionalRegency,
} from '@/types/regional';
import { normalizeAreaNameForApi } from '@/utils/areaNormalization';

const REGIONAL_BASE_URL = 'https://wilayah.id/api';
const POSTAL_BASE_URL =
  'https://raw.githubusercontent.com/ArrayAccess/Indonesia-Postal-And-Area/master/data/json/area/62';

type RegionalApiEnvelope<T> = {
  data?: T[];
};

async function fetchRegional<T>(path: string): Promise<{ data: T[]; error: Error | null }> {
  try {
    const response = await fetch(`${REGIONAL_BASE_URL}${path}`);

    if (!response.ok) {
      return { data: [], error: new Error('Gagal memuat data wilayah.') };
    }

    const payload = (await response.json()) as T[] | RegionalApiEnvelope<T>;
    const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return { data, error: null };
  } catch (error) {
    if (__DEV__) {
      console.warn('[regional.service] request failed', error);
    }

    return {
      data: [],
      error: error instanceof Error ? error : new Error('Gagal memuat data wilayah.'),
    };
  }
}

export async function getRegionalProvinces(): Promise<{
  data: RegionalProvince[];
  error: Error | null;
}> {
  const { data, error } = await fetchRegional<RegionalProvince>('/provinces.json');
  return { data: Array.isArray(data) ? data : [], error };
}

export async function getRegionalRegenciesByProvince(
  provinceCode: string,
): Promise<{ data: RegionalRegency[]; error: Error | null }> {
  return fetchRegional<RegionalRegency>(`/regencies/${provinceCode}.json`);
}

export async function getRegionalDistrictsByRegency(
  regencyCode: string,
): Promise<{ data: RegionalDistrict[]; error: Error | null }> {
  return fetchRegional<RegionalDistrict>(`/districts/${regencyCode}.json`);
}

export async function getPostalCodesByDistrict(
  provinceCode: string,
  regencyCode: string,
  districtName: string,
): Promise<{ data: string[]; error: Error | null }> {
  try {
    const normalizedProvince = provinceCode.replace(/\./g, '');
    const normalizedRegency = regencyCode.replace(/\./g, '');

    const cityResponse = await fetch(
      `${POSTAL_BASE_URL}/${normalizedProvince}/${normalizedRegency}/${normalizedRegency}.json`,
    );

    if (!cityResponse.ok) {
      return { data: [], error: new Error('Gagal memuat daftar kecamatan wilayah.') };
    }

    const cityPayload = (await cityResponse.json()) as RegionalDistrictPostalData;
    const districtIds = Array.isArray(cityPayload?.children) ? cityPayload.children : [];

    if (districtIds.length === 0) {
      return { data: [], error: new Error('Daftar kecamatan wilayah tidak tersedia.') };
    }

    const districtResults = await Promise.all(
      districtIds.map(async districtId => {
        const response = await fetch(
          `${POSTAL_BASE_URL}/${normalizedProvince}/${normalizedRegency}/${districtId}/${districtId}.json`,
        );

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as RegionalDistrictPostalData;
      }),
    );

    const matchedDistrict = districtResults.find(district => {
      return (
        district && normalizeAreaNameForApi(district.name) === normalizeAreaNameForApi(districtName)
      );
    });

    if (!matchedDistrict) {
      return { data: [], error: new Error('Kode pos kecamatan tidak ditemukan.') };
    }

    const postalCodes = Array.isArray(matchedDistrict.postal)
      ? matchedDistrict.postal.map(code => String(code)).filter(Boolean)
      : [];

    return { data: postalCodes, error: null };
  } catch (error) {
    if (__DEV__) {
      console.warn('[regional.service] postal request failed', error);
    }

    return {
      data: [],
      error: error instanceof Error ? error : new Error('Gagal memuat kode pos wilayah.'),
    };
  }
}
