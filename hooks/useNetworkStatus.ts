import { useEffect, useState } from 'react';

export interface NetworkStatus {
  status: 'online';
  isOnline: boolean;
  isOffline: boolean;
  type: string;
  isExpensive: boolean;
}

/**
 * Simplified network status hook that assumes network is always available.
 *
 * NOTE: NetInfo dependency removed to avoid native module linking issues.
 * For MVP, we assume network availability (modern apps rarely go fully offline).
 * Full offline support can be added later if needed.
 *
 * @returns NetworkStatus with isOnline: true, isOffline: false
 */
export function useNetworkStatus(): NetworkStatus {
  const [status] = useState<NetworkStatus>({
    status: 'online',
    isOnline: true,
    isOffline: false,
    type: 'unknown',
    isExpensive: false,
  });

  return status;
}
