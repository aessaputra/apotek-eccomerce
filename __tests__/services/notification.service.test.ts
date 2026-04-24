import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  clearExpoPushToken,
  fetchNotifications,
  markNotificationAsRead,
  requestExpoPushTokenAndSync,
  syncExpoPushTokenIfPermitted,
  updateExpoPushToken,
} from '@/services/notification.service';

type PermissionResponse = {
  granted: boolean;
  status: string;
};

const mockFrom = jest.fn<(table: unknown) => unknown>();
const mockGetPermissionsAsync = jest.fn<() => Promise<PermissionResponse>>();
const mockRequestPermissionsAsync = jest.fn<() => Promise<PermissionResponse>>();
const mockGetExpoPushTokenAsync = jest.fn<() => Promise<{ data: string }>>();
const mockBootstrapAndroidNotificationChannelAsync = jest.fn<() => Promise<void>>();
const mockHasExpoNotificationMethodsAsync = jest.fn<() => Promise<boolean>>();
const mockHasExpoPushTokenRuntimeSupport = jest.fn<() => boolean>();
const mockGetExpoNotificationsModuleAsync = jest.fn<
  () => Promise<{
    getPermissionsAsync: () => Promise<PermissionResponse>;
    requestPermissionsAsync: () => Promise<PermissionResponse>;
    getExpoPushTokenAsync: () => Promise<{ data: string }>;
  }>
>();
const mockHasNativeNotificationSupport = jest.fn<() => boolean>();
const mockIsPhysicalNotificationDeviceAsync = jest.fn<() => Promise<boolean>>();
const mockResolveNotificationProjectId = jest.fn<() => string | null>();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (table: unknown) => mockFrom(table),
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getExpoPushTokenAsync: () => mockGetExpoPushTokenAsync(),
}));

jest.mock('@/utils/notifications', () => ({
  bootstrapAndroidNotificationChannelAsync: () => mockBootstrapAndroidNotificationChannelAsync(),
  getExpoNotificationsModuleAsync: () => mockGetExpoNotificationsModuleAsync(),
  hasExpoNotificationMethodsAsync: () => mockHasExpoNotificationMethodsAsync(),
  hasExpoPushTokenRuntimeSupport: () => mockHasExpoPushTokenRuntimeSupport(),
  hasNativeNotificationSupport: () => mockHasNativeNotificationSupport(),
  isPhysicalNotificationDeviceAsync: () => mockIsPhysicalNotificationDeviceAsync(),
  resolveNotificationProjectId: () => mockResolveNotificationProjectId(),
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
    order: jest.fn(async () => ({ data: rows, error: null })),
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

function createProfileTokenQuery(token: string | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({
      data: { id: 'user-1', expo_push_token: token },
      error: null,
    })),
  };
}

describe('notification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-04-23T15:30:00.000Z'));
    mockHasExpoPushTokenRuntimeSupport.mockReturnValue(true);
    mockHasExpoNotificationMethodsAsync.mockImplementation(async () => true);
    mockHasNativeNotificationSupport.mockReturnValue(true);
    mockIsPhysicalNotificationDeviceAsync.mockImplementation(async () => true);
    mockResolveNotificationProjectId.mockReturnValue('project-123');
    mockBootstrapAndroidNotificationChannelAsync.mockImplementation(async () => undefined);
    mockGetExpoNotificationsModuleAsync.mockImplementation(async () => ({
      getPermissionsAsync: () => mockGetPermissionsAsync(),
      requestPermissionsAsync: () => mockRequestPermissionsAsync(),
      getExpoPushTokenAsync: () => mockGetExpoPushTokenAsync(),
    }));
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
    expect(result.data).toEqual(rows);
    expect(listQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(listQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
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

  it('skips profile updates when the Expo token is unchanged', async () => {
    const profileQuery = createProfileTokenQuery('ExponentPushToken[current]');

    mockRequestPermissionsAsync.mockImplementation(async () => ({
      granted: true,
      status: 'granted',
    }));
    mockGetExpoPushTokenAsync.mockImplementation(async () => ({
      data: 'ExponentPushToken[current]',
    }));
    mockFrom.mockReturnValueOnce(profileQuery);

    const result = await requestExpoPushTokenAndSync('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      didPrompt: true,
      permissionStatus: 'granted',
      status: 'unchanged',
      token: 'ExponentPushToken[current]',
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(profileQuery.select).toHaveBeenCalledWith('id, expo_push_token');
  });

  it('updates the profile token lifecycle columns when a new Expo token is stored', async () => {
    const updatedProfile = {
      id: 'user-1',
      avatar_url: null,
      created_at: '2026-04-20T00:00:00.000Z',
      expo_push_token: 'ExponentPushToken[new-token]',
      expo_push_token_updated_at: '2026-04-23T15:30:00.000Z',
      full_name: 'User One',
      is_banned: false,
      phone_number: null,
      role: 'customer',
      updated_at: '2026-04-23T15:30:00.000Z',
    };
    const updateQuery = createProfileUpdateQuery(updatedProfile);

    mockFrom.mockReturnValueOnce(updateQuery);

    const result = await updateExpoPushToken('user-1', 'ExponentPushToken[new-token]');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(updatedProfile);
    expect(updateQuery.update).toHaveBeenCalledWith({
      expo_push_token: 'ExponentPushToken[new-token]',
      expo_push_token_updated_at: '2026-04-23T15:30:00.000Z',
      updated_at: '2026-04-23T15:30:00.000Z',
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('clears the stored Expo token on logout or account reset', async () => {
    const clearedProfile = {
      id: 'user-1',
      avatar_url: null,
      created_at: '2026-04-20T00:00:00.000Z',
      expo_push_token: null,
      expo_push_token_updated_at: null,
      full_name: 'User One',
      is_banned: false,
      phone_number: null,
      role: 'customer',
      updated_at: '2026-04-23T15:30:00.000Z',
    };
    const updateQuery = createProfileUpdateQuery(clearedProfile);

    mockFrom.mockReturnValueOnce(updateQuery);

    const result = await clearExpoPushToken('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(clearedProfile);
    expect(updateQuery.update).toHaveBeenCalledWith({
      expo_push_token: null,
      expo_push_token_updated_at: null,
      updated_at: '2026-04-23T15:30:00.000Z',
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
