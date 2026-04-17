import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';
import type { PendingAreaSelection } from '@/utils/areaPickerSession';
import { normalizePostalCode, toPostalCodeString } from '@/utils/postalCode';

export type PostalOption = {
  label: string;
  area?: BiteshipArea;
};

export type ResolvePostalOptions = (
  province: RegionalProvince,
  regency: RegionalRegency,
  district: RegionalDistrict,
) => Promise<PostalOption[]>;

export type CurrentLocationAddress = {
  province: string;
  city: string;
  district: string;
  postalCode: string;
};

export function buildPostalOptions(postalCodes: string[]): PostalOption[] {
  return [...new Set(postalCodes)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'id'))
    .map(label => ({ label }));
}

export async function findDistrictCandidateByPostalCode(
  districts: RegionalDistrict[],
  province: RegionalProvince,
  regency: RegionalRegency,
  postalCode: string,
  resolvePostalOptions: ResolvePostalOptions,
): Promise<{ district: RegionalDistrict; options: PostalOption[] } | null> {
  const normalizedPostalCode = normalizePostalCode(postalCode);

  if (!normalizedPostalCode) {
    return null;
  }

  let matchedDistrict: RegionalDistrict | null = null;
  let matchedOptions: PostalOption[] = [];

  for (const district of districts) {
    const options = await resolvePostalOptions(province, regency, district);
    if (options.some(option => normalizePostalCode(option.label) === normalizedPostalCode)) {
      if (matchedDistrict) {
        return null;
      }

      matchedDistrict = district;
      matchedOptions = options;
    }
  }

  return matchedDistrict ? { district: matchedDistrict, options: matchedOptions } : null;
}

export function normalizeCurrentLocationAddress(
  address: Partial<CurrentLocationAddress>,
): CurrentLocationAddress | null {
  if (!address.province || !address.city) {
    return null;
  }

  return {
    province: address.province,
    city: address.city,
    district: address.district || '',
    postalCode: address.postalCode || '',
  };
}

export function buildPendingAreaSelection(
  area: BiteshipArea,
  fallbackHierarchy: {
    provinceName?: string;
    regencyName?: string;
    districtName?: string;
    postalCode?: string;
  },
  hierarchy?: {
    provinceName?: string;
    regencyName?: string;
    districtName?: string;
    postalCode?: string;
  },
): PendingAreaSelection {
  return {
    area,
    provinceName: hierarchy?.provinceName ?? fallbackHierarchy.provinceName,
    regencyName: hierarchy?.regencyName ?? fallbackHierarchy.regencyName,
    districtName: hierarchy?.districtName ?? fallbackHierarchy.districtName,
    postalCode:
      hierarchy?.postalCode ?? fallbackHierarchy.postalCode ?? toPostalCodeString(area.postal_code),
  };
}
