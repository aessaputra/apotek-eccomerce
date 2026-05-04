import { create } from 'zustand';
import type { BiteshipArea } from '@/types/shipping';
import type { RegionalProvince, RegionalRegency, RegionalDistrict } from '@/types/regional';
import type { SelectionStage } from '@/scenes/profile/areaPickerTypes';

export interface AreaPickerSelection {
  stage: SelectionStage;
  selectedProvince: RegionalProvince | null;
  selectedCity: RegionalRegency | null;
  selectedDistrict: RegionalDistrict | null;
  selectedArea: BiteshipArea | null;
  selectedPostalCode: string | null;
}

interface AreaPickerActions {
  setStage: (stage: SelectionStage) => void;
  selectProvince: (province: RegionalProvince | null) => void;
  selectCity: (city: RegionalRegency | null) => void;
  selectDistrict: (district: RegionalDistrict | null) => void;
  selectArea: (area: BiteshipArea | null) => void;
  setPostalCode: (postalCode: string | null) => void;
  reset: () => void;
}

const initialState: AreaPickerSelection = {
  stage: 'province',
  selectedProvince: null,
  selectedCity: null,
  selectedDistrict: null,
  selectedArea: null,
  selectedPostalCode: null,
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
      selectedPostalCode: null,
      stage: province ? 'city' : 'province',
    }),

  selectCity: city =>
    set({
      selectedCity: city,
      selectedDistrict: null,
      selectedArea: null,
      selectedPostalCode: null,
      stage: city ? 'district' : 'city',
    }),

  selectDistrict: district =>
    set({
      selectedDistrict: district,
      selectedArea: null,
      selectedPostalCode: null,
      stage: district ? 'postal' : 'district',
    }),

  selectArea: area => set({ selectedArea: area }),

  setPostalCode: selectedPostalCode => set({ selectedPostalCode }),

  reset: () => set(initialState),
}));
