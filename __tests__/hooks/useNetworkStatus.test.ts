import { describe, expect, it } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  it('returns online state (simplified for MVP)', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Simplified implementation always returns online
    // NetInfo dependency removed to avoid native module issues
    expect(result.current).toEqual({
      status: 'online',
      isOnline: true,
      isOffline: false,
      type: 'unknown',
      isExpensive: false,
    });
  });

  it('returns stable reference across renders', () => {
    const { result, rerender } = renderHook(() => useNetworkStatus());

    const firstResult = result.current;
    rerender({});
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });
});
