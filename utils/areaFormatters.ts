interface Area {
  id: string;
  name: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_2_type?: string;
  administrative_division_level_3_name?: string;
  administrative_division_level_1_name?: string;
  postal_code?: string | number | null;
}

interface SelectedArea {
  area: Area;
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  postalCode?: string;
}

export function formatLevel2Display(name: string, type?: string): string {
  const normalizedType = (type ?? '').trim().toLowerCase();

  if (/^kab(upaten)?\b/i.test(name)) {
    return name.replace(/^kabupaten\s+/i, 'Kab. ').replace(/^kab\s+/i, 'Kab. ');
  }

  if (/^kota\b/i.test(name)) {
    return name;
  }

  if (normalizedType === 'kabupaten' || normalizedType === 'regency') {
    return `Kab. ${name}`;
  }

  if (normalizedType === 'kota' || normalizedType === 'city') {
    return `Kota ${name}`;
  }

  return name;
}

export function formatLevel3Display(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';
  const cleaned = trimmed.replace(/^(kecamatan|kec\.?)\s+/i, '').trim();
  return `Kecamatan ${cleaned}`;
}

export function resolveAreaNames(selectedArea: SelectedArea) {
  const area = selectedArea.area;
  const rawDistrict =
    selectedArea.districtName || area.administrative_division_level_3_name || area.name;

  return {
    district: formatLevel3Display(rawDistrict),
    regency: selectedArea.regencyName || area.administrative_division_level_2_name || '',
    province: selectedArea.provinceName || area.administrative_division_level_1_name || '',
    postalCode: selectedArea.postalCode || area.postal_code?.toString() || '',
  };
}

export function buildAreaDisplayName(resolved: {
  district: string;
  regency: string;
  province: string;
  postalCode: string;
}): string {
  return [resolved.district, resolved.regency, resolved.province, resolved.postalCode]
    .filter(Boolean)
    .join(', ');
}
