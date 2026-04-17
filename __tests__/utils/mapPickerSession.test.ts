import { setPendingMapPickerResult, consumePendingMapPickerResult } from '@/utils/mapPickerSession';

describe('mapPickerSession', () => {
  afterEach(() => {
    // Ensure no state leaks between tests
    consumePendingMapPickerResult();
  });

  test('setPendingMapPickerResult stores coords and consumePendingMapPickerResult returns them', () => {
    const result = { latitude: -6.2, longitude: 106.8, didAdjustPin: false };
    setPendingMapPickerResult(result);

    expect(consumePendingMapPickerResult()).toEqual(result);
  });

  test('consumePendingMapPickerResult returns null after consumption', () => {
    setPendingMapPickerResult({ latitude: -6.2, longitude: 106.8, didAdjustPin: false });

    const first = consumePendingMapPickerResult();
    expect(first).not.toBeNull();

    const second = consumePendingMapPickerResult();
    expect(second).toBeNull();
  });

  test('consumePendingMapPickerResult returns null when nothing was set', () => {
    const result = consumePendingMapPickerResult();
    expect(result).toBeNull();
  });

  test('setPendingMapPickerResult overwrites previous value', () => {
    setPendingMapPickerResult({ latitude: -6.2, longitude: 106.8, didAdjustPin: false });
    setPendingMapPickerResult({ latitude: -6.5, longitude: 107.0, didAdjustPin: true });

    const result = consumePendingMapPickerResult();
    expect(result).toEqual({ latitude: -6.5, longitude: 107.0, didAdjustPin: true });
  });
});
