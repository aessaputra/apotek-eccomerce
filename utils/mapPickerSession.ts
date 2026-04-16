import type { MapPickerResult } from '@/components/MapPin';
import { createPendingSelectionSession } from '@/utils/pendingSelectionSession';

const pendingMapPickerSession = createPendingSelectionSession<MapPickerResult>();

export function setPendingMapPickerResult(result: MapPickerResult): void {
  pendingMapPickerSession.set(result);
}

export function consumePendingMapPickerResult(): MapPickerResult | null {
  return pendingMapPickerSession.consume();
}
