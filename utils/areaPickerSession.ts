import type { BiteshipArea } from '@/types/shipping';
import { useAreaPickerStore } from '@/stores/areaPickerStore';

export interface PendingAreaSelection {
  area: BiteshipArea;
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  postalCode?: string;
}

export function setPendingAreaSelection(selection: PendingAreaSelection): void {
  useAreaPickerStore.setState({
    selectedArea: selection.area,
    selectedProvince: selection.provinceName ? { code: '', name: selection.provinceName } : null,
    selectedCity: selection.regencyName ? { code: '', name: selection.regencyName } : null,
    selectedDistrict: selection.districtName ? { code: '', name: selection.districtName } : null,
  });
}

export function consumePendingAreaSelection(): PendingAreaSelection | null {
  const state = useAreaPickerStore.getState();
  const area = state.selectedArea;

  if (!area) return null;

  const selection: PendingAreaSelection = {
    area,
    provinceName: state.selectedProvince?.name,
    regencyName: state.selectedCity?.name,
    districtName: state.selectedDistrict?.name,
    postalCode: area.postal_code?.toString(),
  };

  return selection;
}
