import { normalize } from '@/utils/areaNormalization';
import type { PostalOption } from './areaPickerHelpers';

export type SelectionStage = 'province' | 'city' | 'district' | 'postal';

type NamedOption = {
  name: string;
};

export function filterNamedOptions<T extends NamedOption>(options: T[], query: string): T[] {
  const trimmedQuery = normalize(query);

  return options.filter(option => !trimmedQuery || normalize(option.name).includes(trimmedQuery));
}

export function filterPostalOptions(options: PostalOption[], query: string): PostalOption[] {
  const trimmedQuery = normalize(query);

  return options.filter(option => !trimmedQuery || normalize(option.label).includes(trimmedQuery));
}

export function findSelectedPostalOption(
  options: PostalOption[],
  selectedLabel: string | null,
): PostalOption | null {
  return options.find(option => option.label === selectedLabel) ?? null;
}

export function getStageTitle(stage: SelectionStage): string {
  switch (stage) {
    case 'province':
      return 'Provinsi';
    case 'city':
      return 'Kota / Kabupaten';
    case 'district':
      return 'Kecamatan';
    case 'postal':
      return 'Kode Pos';
  }
}
