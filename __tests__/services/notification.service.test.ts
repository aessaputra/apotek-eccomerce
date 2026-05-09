import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  clearExpoPushToken,
  fetchNotifications,
  markNotificationAsRead,
  NOTIFICATION_DEVICE_ID_STORAGE_KEY,
  requestExpoPushTokenAndSync,
  sendTestNotification,
  subscribeToExpoPushTokenUpdates,
  syncExpoPushTokenIfPermitted,
  updateExpoPushToken,
} from '@/services/notification.service';

type PermissionResponse = {
  granted: boolean;
  status: string;
};

type SessionResponse = {
  data: { session: { access_token: string } | null };
  error: unknown;
};

const mockFrom = jest.fn<(table: unknown) => unknown>();
type RpcMockResult =
  | Promise<{ data: unknown; error: unknown }>
  | { data: unknown; error: unknown }
  | { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
const mockRpc = jest.fn<(functionName: unknown, args?: unknown) => RpcMockResult>();
const mockGetSession = jest.fn<() => Promise<SessionResponse>>();
const mockRefreshSession = jest.fn<() => Promise<SessionResponse>>();
const mockFunctionsInvoke =
  jest.fn<
    (
      functionName: string,
      options: { body: { action: string }; headers?: { Authorization: string } },
    ) => Promise<{ data: unknown; error: unknown }>
  >();
const mockGetPermissionsAsync = jest.fn<() => Promise<PermissionResponse>>();
const mockRequestPermissionsAsync = jest.fn<() => Promise<PermissionResponse>>();
const mockGetExpoPushTokenAsync = jest.fn<() => Promise<{ data: string }>>();
const mockAddPushTokenListener =
  jest.fn<(listener: (event: { data: string }) => void) => { remove: () => void }>();
const mockPushTokenListenerRemove = jest.fn();
const mockBootstrapAndroidNotificationChannelAsync = jest.fn<() => Promise<void>>();
const mockHasExpoNotificationMethodsAsync = jest.fn<() => Promise<boolean>>();
const mockHasExpoPushTokenRuntimeSupport = jest.fn<() => boolean>();
const mockGetExpoNotificationsModuleAsync = jest.fn<
  () => Promise<{
    getPermissionsAsync: () => Promise<PermissionResponse>;
    requestPermissionsAsync: () => Promise<PermissionResponse>;
    getExpoPushTokenAsync: () => Promise<{ data: string }>;
    addPushTokenListener: (listener: (event: { data: string }) => void) => { remove: () => void };
  }>
>();
const mockHasNativeNotificationSupport = jest.fn<() => boolean>();
const mockIsPhysicalNotificationDeviceAsync = jest.fn<() => Promise<boolean>>();
const mockResolveNotificationProjectId = jest.fn<() => string | null>();
const mockStorage = new Map<string, string>();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (table: unknown) => mockFrom(table),
    rpc: (functionName: unknown, args: unknown) => mockRpc(functionName, args),
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
    functions: {
      invoke: (
        functionName: string,
        options: { body: { action: string }; headers?: { Authorization: string } },
      ) => mockFunctionsInvoke(functionName, options),
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getExpoPushTokenAsync: () => mockGetExpoPushTokenAsync(),
}));

jest.mock('@/utils/notifications', () => ({
  addExpoPushTokenListenerAsync: (listener: (event: { data: string }) => void) =>
    Promise.resolve(mockAddPushTokenListener(listener)),
  bootstrapAndroidNotificationChannelAsync: () => mockBootstrapAndroidNotificationChannelAsync(),
  getExpoNotificationsModuleAsync: () => mockGetExpoNotificationsModuleAsync(),
  hasExpoNotificationMethodsAsync: () => mockHasExpoNotificationMethodsAsync(),
  hasExpoPushTokenRuntimeSupport: () => mockHasExpoPushTokenRuntimeSupport(),
  hasNativeNotificationSupport: () => mockHasNativeNotificationSupport(),
  isPhysicalNotificationDeviceAsync: () => mockIsPhysicalNotificationDeviceAsync(),
  resolveNotificationProjectId: () => mockResolveNotificationProjectId(),
}));

jest.mock('@/utils/LargeSecureStore', () => ({
  __esModule: true,
  default: class MockLargeSecureStore {
    getItem(key: string) {
      return Promise.resolve(mockStorage.get(key) ?? null);
    }

    setItem(key: string, value: string) {
      mockStorage.set(key, value);
      return Promise.resolve();
    }

    removeItem(key: string) {
      mockStorage.delete(key);
      return Promise.resolve();
    }
  },
}));

function createNotificationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'notification-1',
    user_id: 'user-1',
    type: 'order_completed',
    title: 'Pesanan selesai',
    body: 'Pesanan kamu sudah selesai.',
    cta_route: 'orders/order-detail/[orderId]',
    data: { orderId: 'order-1' },
    priority: 'high',
    source_event_key: 'event-1',
    read_at: null,
    created_at: '2026-04-23T12:00:00.000Z',
    ...overrides,
  };
}

function createListQuery(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn(async () => ({ data: rows, error: null })),
  };
}

function createPushTokenClaimQuery(row: unknown) {
  return {
    maybeSingle: jest.fn(async () => ({ data: row, error: null })),
  };
}

function createPushTokenRevokeQuery(row: unknown) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: row, error: null })),
  };
}

function createReadUpdateQuery(row: unknown) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: row, error: null })),
  };
}

function createProfileUpdateQuery(row: unknown) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data: row, error: null })),
  };
}

describe('notification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockStorage.set(NOTIFICATION_DEVICE_ID_STORAGE_KEY, 'device-1');
    jest.setSystemTime(new Date('2026-04-23T15:30:00.000Z'));
    mockHasExpoPushTokenRuntimeSupport.mockReturnValue(true);
    mockHasExpoNotificationMethodsAsync.mockImplementation(async () => true);
    mockHasNativeNotificationSupport.mockReturnValue(true);
    mockIsPhysicalNotificationDeviceAsync.mockImplementation(async () => true);
    mockResolveNotificationProjectId.mockReturnValue('project-123');
    mockBootstrapAndroidNotificationChannelAsync.mockImplementation(async () => undefined);
    mockAddPushTokenListener.mockImplementation(() => ({ remove: mockPushTokenListenerRemove }));
    mockGetExpoNotificationsModuleAsync.mockImplementation(async () => ({
      getPermissionsAsync: () => mockGetPermissionsAsync(),
      requestPermissionsAsync: () => mockRequestPermissionsAsync(),
      getExpoPushTokenAsync: () => mockGetExpoPushTokenAsync(),
      addPushTokenListener: listener => mockAddPushTokenListener(listener),
    }));
  });

  it('uses a SecureStore-valid device ID storage key', () => {
    expect(NOTIFICATION_DEVICE_ID_STORAGE_KEY).toMatch(/^[\w.-]+$/);
    expect(NOTIFICATION_DEVICE_ID_STORAGE_KEY).not.toContain(':');
  });

  it('fetches notifications newest-first for the user inbox', async () => {
    const rows = [
      createNotificationRow({ id: 'notification-2', created_at: '2026-04-23T16:00:00.000Z' }),
      createNotificationRow({ id: 'notification-1', created_at: '2026-04-23T12:00:00.000Z' }),
    ];
    const listQuery = createListQuery(rows);

    mockFrom.mockReturnValueOnce(listQuery);

    const result = await fetchNotifications('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ items: rows, hasMore: false, nextCursor: null });
    expect(listQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(listQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(listQuery.range).toHaveBeenCalledWith(0, 20);
  });

  it('returns pagination metadata and fetches one extra row to detect more pages', async () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      createNotificationRow({ id: `notification-${index + 1}` }),
    );
    const listQuery = createListQuery(rows);

    mockFrom.mockReturnValueOnce(listQuery);

    const result = await fetchNotifications('user-1', { cursor: '20' });

    expect(result.error).toBeNull();
    expect(result.data?.items).toHaveLength(20);
    expect(result.data?.hasMore).toBe(true);
    expect(result.data?.nextCursor).toBe('40');
    expect(listQuery.range).toHaveBeenCalledWith(20, 40);
  });

  it('marks one notification as read without dropping the ownership filter', async () => {
    const readAt = '2026-04-23T15:30:00.000Z';
    const updatedRow = createNotificationRow({ id: 'notification-9', read_at: readAt });
    const updateQuery = createReadUpdateQuery(updatedRow);

    mockFrom.mockReturnValueOnce(updateQuery);

    const result = await markNotificationAsRead('notification-9', 'user-1');

    expect(result.error).toBeNull();
    expect(result.data?.read_at).toBe(readAt);
    expect(updateQuery.update).toHaveBeenCalledWith({ read_at: readAt });
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'notification-9');
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
    expect(updateQuery.is).toHaveBeenCalledWith('read_at', null);
  });

  it('refreshes the session before sending a test notification', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'access-token-123' } },
      error: null,
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'refreshed-token-456' } },
      error: null,
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { delivered: true, reason: null },
      error: null,
    });

    const result = await sendTestNotification('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ delivered: true, reason: null });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('push', {
      body: { action: 'send_test_notification' },
      headers: { Authorization: 'Bearer refreshed-token-456' },
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('falls back to the cached access token when refresh fails', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'access-token-123' } },
      error: null,
    });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('refresh failed'),
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { delivered: true, reason: null },
      error: null,
    });

    const result = await sendTestNotification('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ delivered: true, reason: null });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('push', {
      body: { action: 'send_test_notification' },
      headers: { Authorization: 'Bearer access-token-123' },
    });
  });

  it('returns a clear error when no active session is available', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const result = await sendTestNotification('user-1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      new Error('Sesi login belum siap. Silakan coba lagi dalam beberapa saat.'),
    );
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it('does not prompt or write a token when permission is not already granted', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false, status: 'denied' }));

    const result = await syncExpoPushTokenIfPermitted('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      didPrompt: false,
      permissionStatus: 'denied',
      status: 'permission_not_granted',
      token: null,
    });
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not prompt and exits cleanly on non-physical devices', async () => {
    mockIsPhysicalNotificationDeviceAsync.mockImplementation(async () => false);

    const result = await requestExpoPushTokenAndSync('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      didPrompt: true,
      permissionStatus: 'unavailable',
      status: 'physical_device_required',
      token: null,
    });
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('creates the Android channel before checking existing permission', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false, status: 'denied' }));

    const result = await syncExpoPushTokenIfPermitted('user-1');

    expect(result.error).toBeNull();
    expect(mockBootstrapAndroidNotificationChannelAsync).toHaveBeenCalled();
    expect(mockGetPermissionsAsync).toHaveBeenCalled();
    expect(mockBootstrapAndroidNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it('creates the Android channel before requesting permission explicitly', async () => {
    mockRequestPermissionsAsync.mockImplementation(async () => ({
      granted: false,
      status: 'denied',
    }));

    const result = await requestExpoPushTokenAndSync('user-1');

    expect(result.error).toBeNull();
    expect(mockBootstrapAndroidNotificationChannelAsync).toHaveBeenCalled();
    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockBootstrapAndroidNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockRequestPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it('exits before permission prompts when push token runtime support is unavailable', async () => {
    mockHasExpoPushTokenRuntimeSupport.mockReturnValue(false);

    const result = await requestExpoPushTokenAndSync('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      didPrompt: true,
      permissionStatus: 'unavailable',
      status: 'unsupported_platform',
      token: null,
    });
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockBootstrapAndroidNotificationChannelAsync).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('upserts the current device token row even when the legacy profile token already matches', async () => {
    const tokenRow = {
      user_id: 'user-1',
      device_id: 'device-1',
      expo_push_token: 'ExponentPushToken[current]',
      platform: 'ios',
      last_seen_at: '2026-04-23T15:30:00.000Z',
      revoked_at: null,
    };
    const tokenQuery = createPushTokenClaimQuery(tokenRow);
    const profileQuery = createProfileUpdateQuery({
      id: 'user-1',
      expo_push_token: 'ExponentPushToken[current]',
    });

    mockRequestPermissionsAsync.mockImplementation(async () => ({
      granted: true,
      status: 'granted',
    }));
    mockGetExpoPushTokenAsync.mockImplementation(async () => ({
      data: 'ExponentPushToken[current]',
    }));
    mockRpc.mockImplementationOnce(() => tokenQuery);
    mockFrom.mockReturnValueOnce(profileQuery);

    const result = await requestExpoPushTokenAndSync('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      didPrompt: true,
      permissionStatus: 'granted',
      status: 'updated',
      token: 'ExponentPushToken[current]',
    });
    expect(mockRpc).toHaveBeenCalledWith('claim_profile_push_token', {
      p_device_id: 'device-1',
      p_expo_push_token: 'ExponentPushToken[current]',
      p_platform: expect.any(String),
      p_last_seen_at: '2026-04-23T15:30:00.000Z',
    });
  });

  it('updates the current device token row and mirrors the legacy profile column', async () => {
    const updatedTokenRow = {
      user_id: 'user-1',
      device_id: 'device-1',
      expo_push_token: 'ExponentPushToken[new-token]',
      platform: 'ios',
      last_seen_at: '2026-04-23T15:30:00.000Z',
      revoked_at: null,
    };
    const tokenQuery = createPushTokenClaimQuery(updatedTokenRow);
    const profileQuery = createProfileUpdateQuery({ id: 'user-1' });

    mockRpc.mockImplementationOnce(() => tokenQuery);
    mockFrom.mockReturnValueOnce(profileQuery);

    const result = await updateExpoPushToken('user-1', 'ExponentPushToken[new-token]');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(updatedTokenRow);
    expect(mockRpc).toHaveBeenCalledWith('claim_profile_push_token', {
      p_device_id: 'device-1',
      p_expo_push_token: 'ExponentPushToken[new-token]',
      p_platform: expect.any(String),
      p_last_seen_at: '2026-04-23T15:30:00.000Z',
    });
    expect(profileQuery.update).toHaveBeenCalledWith({
      expo_push_token: 'ExponentPushToken[new-token]',
      expo_push_token_updated_at: '2026-04-23T15:30:00.000Z',
      updated_at: '2026-04-23T15:30:00.000Z',
    });
  });

  it('rejects raw FCM values before reading the device ID or syncing token rows', async () => {
    mockStorage.delete(NOTIFICATION_DEVICE_ID_STORAGE_KEY);

    const result = await updateExpoPushToken('user-1', 'dIW3WF7sQUCHGFCbHzxGme:APA91b-token');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe(
      'Expo push token must use ExpoPushToken[...] or ExponentPushToken[...] format.',
    );
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockStorage.has(NOTIFICATION_DEVICE_ID_STORAGE_KEY)).toBe(false);
  });

  it('returns an error when permission sync receives invalid Expo token data', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({
      granted: true,
      status: 'granted',
    }));
    mockGetExpoPushTokenAsync.mockImplementation(async () => ({
      data: 'dIW3WF7sQUCHGFCbHzxGme:APA91b-token',
    }));

    const result = await syncExpoPushTokenIfPermitted('user-1');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe(
      'Expo push token must use ExpoPushToken[...] or ExponentPushToken[...] format.',
    );
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('revokes only the current device token and clears legacy token only when it matches', async () => {
    const revokedTokenRow = {
      user_id: 'user-1',
      device_id: 'device-1',
      expo_push_token: 'ExponentPushToken[current]',
      platform: 'ios',
      last_seen_at: '2026-04-23T15:30:00.000Z',
      revoked_at: '2026-04-23T15:30:00.000Z',
    };
    const revokeQuery = createPushTokenRevokeQuery(revokedTokenRow);
    const profileQuery = createProfileUpdateQuery({ id: 'user-1', expo_push_token: null });

    mockFrom.mockReturnValueOnce(revokeQuery).mockReturnValueOnce(profileQuery);

    const result = await clearExpoPushToken('user-1', 'ExponentPushToken[current]');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(revokedTokenRow);
    expect(revokeQuery.update).toHaveBeenCalledWith({
      revoked_at: '2026-04-23T15:30:00.000Z',
      last_seen_at: '2026-04-23T15:30:00.000Z',
    });
    expect(revokeQuery.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(revokeQuery.eq).toHaveBeenNthCalledWith(2, 'device_id', 'device-1');
    expect(revokeQuery.eq).toHaveBeenNthCalledWith(
      3,
      'expo_push_token',
      'ExponentPushToken[current]',
    );
    expect(profileQuery.update).toHaveBeenCalledWith({
      expo_push_token: null,
      expo_push_token_updated_at: null,
      updated_at: '2026-04-23T15:30:00.000Z',
    });
    expect(profileQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'user-1');
    expect(profileQuery.eq).toHaveBeenNthCalledWith(
      2,
      'expo_push_token',
      'ExponentPushToken[current]',
    );
  });

  it('does not clear the legacy profile token when the current device token is unknown', async () => {
    const revokeQuery = createPushTokenRevokeQuery(null);

    mockFrom.mockReturnValueOnce(revokeQuery);

    const result = await clearExpoPushToken('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
    expect(revokeQuery.update).toHaveBeenCalledWith({
      revoked_at: '2026-04-23T15:30:00.000Z',
      last_seen_at: '2026-04-23T15:30:00.000Z',
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns Supabase errors when revoking the current device token fails', async () => {
    const databaseError = new Error('database unavailable');
    const revokeQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: null, error: databaseError })),
    };

    mockFrom.mockReturnValueOnce(revokeQuery);

    const result = await clearExpoPushToken('user-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe(databaseError);
    expect(revokeQuery.update).toHaveBeenCalledWith({
      revoked_at: '2026-04-23T15:30:00.000Z',
      last_seen_at: '2026-04-23T15:30:00.000Z',
    });
  });

  it('registers an Expo push token listener and syncs rotated tokens for the user', async () => {
    const tokenQuery = createPushTokenClaimQuery({
      user_id: 'user-1',
      device_id: 'device-1',
      expo_push_token: 'ExponentPushToken[rotated]',
      platform: 'ios',
      last_seen_at: '2026-04-23T15:30:00.000Z',
      revoked_at: null,
    });
    const profileQuery = createProfileUpdateQuery({ id: 'user-1' });
    const onSync = jest.fn();

    mockRpc.mockImplementationOnce(() => tokenQuery);
    mockFrom.mockReturnValueOnce(profileQuery);

    const cleanup = subscribeToExpoPushTokenUpdates('user-1', onSync);

    await Promise.resolve();
    const listener = mockAddPushTokenListener.mock.calls[0]?.[0];
    expect(listener).toBeDefined();

    listener?.({ data: 'ExponentPushToken[rotated]' });

    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }

    expect(mockRpc).toHaveBeenCalledWith(
      'claim_profile_push_token',
      expect.objectContaining({
        p_device_id: 'device-1',
        p_expo_push_token: 'ExponentPushToken[rotated]',
      }),
    );
    expect(onSync).toHaveBeenCalledWith({ data: expect.any(Object), error: null });

    cleanup();
    expect(mockPushTokenListenerRemove).toHaveBeenCalled();
  });
});
