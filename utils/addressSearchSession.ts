import type { SelectedAddressSuggestion } from '@/types/geocoding';
import { createPendingSelectionSession } from '@/utils/pendingSelectionSession';

const pendingAddressSelectionSession = createPendingSelectionSession<SelectedAddressSuggestion>();

export function setPendingAddressSelection(selection: SelectedAddressSuggestion): void {
  pendingAddressSelectionSession.set(selection);
}

export function consumePendingAddressSelection(): SelectedAddressSuggestion | null {
  return pendingAddressSelectionSession.consume();
}
