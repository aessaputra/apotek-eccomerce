import type { SelectedAddressSuggestion } from '@/types/geocoding';

let pendingAddressSelection: SelectedAddressSuggestion | null = null;

export function setPendingAddressSelection(selection: SelectedAddressSuggestion): void {
  pendingAddressSelection = selection;
}

export function consumePendingAddressSelection(): SelectedAddressSuggestion | null {
  const selection = pendingAddressSelection;
  pendingAddressSelection = null;
  return selection;
}
