import { act, renderHook } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { useOfflineActionMessage } from '@/scenes/cart/useOfflineActionMessage';

describe('useOfflineActionMessage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('restarts the dismiss timer when the same message is shown repeatedly', () => {
    const { result } = renderHook(() => useOfflineActionMessage(3000));

    act(() => {
      result.current.showOfflineActionMessage('Offline action');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.showOfflineActionMessage('Offline action');
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.offlineActionMessage).toBe('Offline action');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.offlineActionMessage).toBeNull();
  });
});
