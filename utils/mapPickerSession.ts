import type { MapPickerResult } from '@/components/MapPin';

let pendingMapPickerResult: MapPickerResult | null = null;

export function setPendingMapPickerResult(result: MapPickerResult): void {
  pendingMapPickerResult = result;
}

export function consumePendingMapPickerResult(): MapPickerResult | null {
  const result = pendingMapPickerResult;
  pendingMapPickerResult = null;
  return result;
}
