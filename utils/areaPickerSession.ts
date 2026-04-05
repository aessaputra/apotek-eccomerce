import type { BiteshipArea } from '@/types/shipping';

export interface PendingAreaSelection {
  area: BiteshipArea;
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  postalCode?: string;
}

let pendingAreaSelection: PendingAreaSelection | null = null;

export function setPendingAreaSelection(selection: PendingAreaSelection): void {
  pendingAreaSelection = selection;
}

export function consumePendingAreaSelection(): PendingAreaSelection | null {
  const selection = pendingAreaSelection;
  pendingAreaSelection = null;
  return selection;
}
