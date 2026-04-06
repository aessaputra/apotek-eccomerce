import { create } from 'zustand';
import type { BiteshipArea } from '@/types/shipping';
import type { RegionalProvince, RegionalRegency, RegionalDistrict } from '@/types/regional';

export type SelectionStage = 'province' | 'city' | 'district' | 'postal';

export interface AreaPickerSelection {
  stage: SelectionStage;
  selectedProvince: RegionalProvince | null;
  selectedCity: RegionalRegency | null;
  selectedDistrict: RegionalDistrict | null;
  selectedArea: BiteshipArea | null;
}

interface AreaPickerActions {
  setStage: (stage: SelectionStage) => void;
  selectProvince: (province: RegionalProvince | null) => void;
  selectCity: (city: RegionalRegency | null) => void;
  selectDistrict: (district: RegionalDistrict | null) => void;
  selectArea: (area: BiteshipArea | null) => void;
  reset: () => void;
}

const initialState: AreaPickerSelection = {
  stage: 'province',
  selectedProvince: null,
  selectedCity: null,
  selectedDistrict: null,
  selectedArea: null,
};

export const useAreaPickerStore = create<AreaPickerSelection & AreaPickerActions>(set => ({
  ...initialState,

  setStage: stage => set({ stage }),

  selectProvince: province =>
    set({
      selectedProvince: province,
      selectedCity: null,
      selectedDistrict: null,
      selectedArea: null,
      stage: province ? 'city' : 'province',
    }),

  selectCity: city =>
    set({
      selectedCity: city,
      selectedDistrict: null,
      selectedArea: null,
      stage: city ? 'district' : 'city',
    }),

  selectDistrict: district =>
    set({
      selectedDistrict: district,
      selectedArea: null,
      stage: district ? 'postal' : 'district',
    }),

  selectArea: area => set({ selectedArea: area }),

  reset: () => set(initialState),
}));
