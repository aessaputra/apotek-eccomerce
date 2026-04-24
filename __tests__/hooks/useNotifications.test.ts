import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { subscribeToNotificationChanges } from '@/services/notification.service';
import type { NotificationRow } from '@/types/notification';
import type {
  MarkAllNotificationsReadResult,
  NotificationRealtimeChange,
  NotificationRealtimeConnectionState,
  NotificationServiceResult,
  NotificationTokenSyncResult,
} from '@/services/notification.service';

type FetchNotificationsMock = (
  userId: string,
  signal?: AbortSignal,
) => Promise<NotificationServiceResult<NotificationRow[]>>;

type MarkNotificationAsReadMock = (
  notificationId: string,
  userId: string,
  signal?: AbortSignal,
) => Promise<NotificationServiceResult<NotificationRow>>;

type MarkAllNotificationsAsReadMock = (
  userId: string,
  signal?: AbortSignal,
) => Promise<NotificationServiceResult<MarkAllNotificationsReadResult>>;

type SyncExpoPushTokenMock = (
  userId: string,
) => Promise<NotificationServiceResult<NotificationTokenSyncResult>>;

type PermissionStatusValue = NotificationTokenSyncResult['permissionStatus'];

const mockFetchNotifications = jest.fn() as jest.MockedFunction<FetchNotificationsMock>;
const mockMarkNotificationAsRead = jest.fn() as jest.MockedFunction<MarkNotificationAsReadMock>;
const mockMarkAllNotificationsAsRead =
  jest.fn() as jest.MockedFunction<MarkAllNotificationsAsReadMock>;
const mockSyncExpoPushTokenIfPermitted = jest.fn() as jest.MockedFunction<SyncExpoPushTokenMock>;
const mockRequestExpoPushTokenAndSync = jest.fn() as jest.MockedFunction<SyncExpoPushTokenMock>;

let mockLatestFocusEffect: (() => void) | undefined;
let mockLatestRealtimeHandler: ((event: NotificationRealtimeChange) => void) | null = null;
let mockLatestRealtimeStateHandler: ((state: NotificationRealtimeConnectionState) => void) | null =
  null;
const mockUnsubscribe = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    mockLatestFocusEffect = effect;
  },
}));

jest.mock('@/utils/error', () => ({
  classifyError: (error: unknown) => error,
  translateErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error ?? ''),
}));

jest.mock('@/services/notification.service', () => ({
  fetchNotifications: (userId: string, signal?: AbortSignal) =>
    mockFetchNotifications(userId, signal),
  markNotificationAsRead: (notificationId: string, userId: string, signal?: AbortSignal) =>
    mockMarkNotificationAsRead(notificationId, userId, signal),
  markAllNotificationsAsRead: (userId: string, signal?: AbortSignal) =>
    mockMarkAllNotificationsAsRead(userId, signal),
  syncExpoPushTokenIfPermitted: (userId: string) => mockSyncExpoPushTokenIfPermitted(userId),
  requestExpoPushTokenAndSync: (userId: string) => mockRequestExpoPushTokenAndSync(userId),
  subscribeToNotificationChanges: jest.fn(
    (
      _: string,
      onChange: (event: NotificationRealtimeChange) => void,
      onConnectionStateChange?: (state: NotificationRealtimeConnectionState) => void,
    ) => {
      mockLatestRealtimeHandler = onChange;
      mockLatestRealtimeStateHandler = onConnectionStateChange ?? null;
      return mockUnsubscribe;
    },
  ),
}));

function createNotification(id: string, overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id,
    user_id: 'user-1',
    type: 'order_completed',
    title: `Notifikasi ${id}`,
    body: `Body ${id}`,
    cta_route: 'orders/order-detail/[orderId]',
    data: { orderId: `order-${id}` },
    priority: 'high',
    source_event_key: `event-${id}`,
    read_at: null,
    created_at: `2026-04-${id.padStart(2, '0')}T10:00:00.000Z`,
    ...overrides,
  };
}

function createPermissionResult(
  overrides: Partial<NotificationTokenSyncResult> = {},
): NotificationTokenSyncResult {
  return {
    didPrompt: false,
    permissionStatus: 'undetermined' as PermissionStatusValue,
    status: 'permission_not_granted',
    token: null,
    ...overrides,
  } as NotificationTokenSyncResult;
}

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-04-23T12:00:00.000Z'));
    mockLatestFocusEffect = undefined;
    mockLatestRealtimeHandler = null;
    mockLatestRealtimeStateHandler = null;
    mockFetchNotifications.mockResolvedValue({ data: [], error: null });
    mockMarkNotificationAsRead.mockResolvedValue({ data: null, error: null });
    mockMarkAllNotificationsAsRead.mockResolvedValue({
      data: { markedCount: 0, readAt: '2026-04-23T12:00:00.000Z' },
      error: null,
    });
    mockSyncExpoPushTokenIfPermitted.mockResolvedValue({
      data: createPermissionResult(),
      error: null,
    });
    mockRequestExpoPushTokenAndSync.mockResolvedValue({
      data: createPermissionResult({
        didPrompt: true,
        permissionStatus: 'granted' as PermissionStatusValue,
        status: 'updated',
        token: 'ExponentPushToken[new-token]',
      }),
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('returns an idle empty-safe state when userId is missing', () => {
    const { result } = renderHook(() => useNotifications({}));

    expect(result.current.items).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.permissionStatus).toEqual({
      status: 'idle',
      syncStatus: 'idle',
      canRequest: false,
      isSupported: false,
      didPrompt: false,
      isRequesting: false,
      error: null,
    });
    expect(result.current.realtimeState).toBe('disabled');
    expect(mockFetchNotifications).not.toHaveBeenCalled();
    expect(mockSyncExpoPushTokenIfPermitted).not.toHaveBeenCalled();
  });

  it('loads notifications, derives unread count, and exposes the initial permission CTA state', async () => {
    const notifications = [
      createNotification('02'),
      createNotification('01', { read_at: '2026-04-23T11:00:00.000Z' }),
    ];
    mockFetchNotifications.mockResolvedValueOnce({ data: notifications, error: null });

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
      expect(result.current.items).toEqual(notifications);
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.permissionStatus).toEqual({
      status: 'undetermined',
      syncStatus: 'permission_not_granted',
      canRequest: true,
      isSupported: true,
      didPrompt: false,
      isRequesting: false,
      error: null,
    });
    expect(mockFetchNotifications).toHaveBeenCalledWith('user-1', expect.any(AbortSignal));
    expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalledWith('user-1');
  });

  it('requests permission explicitly and updates the CTA state to granted', async () => {
    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalled();
    });

    await act(async () => {
      const granted = await result.current.requestPermission();
      expect(granted).toBe(true);
    });

    expect(result.current.permissionStatus).toEqual({
      status: 'granted',
      syncStatus: 'updated',
      canRequest: false,
      isSupported: true,
      didPrompt: true,
      isRequesting: false,
      error: null,
    });
    expect(mockRequestExpoPushTokenAndSync).toHaveBeenCalledWith('user-1');
  });

  it('updates local read state for markAsRead and markAllAsRead actions', async () => {
    const unreadA = createNotification('01');
    const unreadB = createNotification('02');
    const readAt = '2026-04-23T12:30:00.000Z';

    mockFetchNotifications.mockResolvedValueOnce({ data: [unreadB, unreadA], error: null });
    mockMarkNotificationAsRead.mockResolvedValueOnce({
      data: { ...unreadA, read_at: readAt },
      error: null,
    });
    mockMarkAllNotificationsAsRead.mockResolvedValueOnce({
      data: { markedCount: 1, readAt: '2026-04-23T12:31:00.000Z' },
      error: null,
    });

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(2);
    });

    await act(async () => {
      const didMarkSingle = await result.current.markAsRead('01');
      expect(didMarkSingle).toBe(true);
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.items.find(item => item.id === '01')?.read_at).toBe(readAt);

    await act(async () => {
      const didMarkAll = await result.current.markAllAsRead();
      expect(didMarkAll).toBe(true);
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items.every(item => item.read_at != null)).toBe(true);
  });

  it('refreshes on focus only after the debounce window elapses', async () => {
    mockFetchNotifications
      .mockResolvedValueOnce({ data: [createNotification('01')], error: null })
      .mockResolvedValueOnce({ data: [createNotification('02')], error: null });

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('01');
    });

    await act(async () => {
      mockLatestFocusEffect?.();
    });

    expect(mockFetchNotifications).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-04-23T12:00:03.000Z'));

    await act(async () => {
      mockLatestFocusEffect?.();
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('02');
    });

    expect(mockFetchNotifications).toHaveBeenCalledTimes(2);
  });

  it('applies realtime inserts without duplicating existing items and cleans up on unmount', async () => {
    const existingItem = createNotification('01');
    const newItem = createNotification('03');

    mockFetchNotifications.mockResolvedValueOnce({ data: [existingItem], error: null });

    const { result, unmount } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.items).toEqual([existingItem]);
    });

    await act(async () => {
      mockLatestRealtimeStateHandler?.('connected');
      mockLatestRealtimeHandler?.({
        type: 'INSERT',
        new: { ...existingItem, title: 'Notifikasi 01 terbaru' },
        old: null,
      });
      mockLatestRealtimeHandler?.({
        type: 'INSERT',
        new: newItem,
        old: null,
      });
    });

    expect(result.current.realtimeState).toBe('connected');
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]?.id).toBe('03');
    expect(result.current.items.filter(item => item.id === '01')).toHaveLength(1);
    expect(result.current.items.find(item => item.id === '01')?.title).toBe(
      'Notifikasi 01 terbaru',
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('refreshes silently after a realtime reconnect so missed events are reconciled', async () => {
    mockFetchNotifications
      .mockResolvedValueOnce({ data: [createNotification('01')], error: null })
      .mockResolvedValueOnce({ data: [createNotification('02')], error: null });

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('01');
    });

    await act(async () => {
      mockLatestRealtimeStateHandler?.('connected');
      mockLatestRealtimeStateHandler?.('reconnecting');
      mockLatestRealtimeStateHandler?.('connected');
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('02');
    });

    expect(mockFetchNotifications).toHaveBeenCalledTimes(2);
    expect(result.current.realtimeState).toBe('connected');
  });

  it('falls back cleanly when realtime is unavailable', async () => {
    const mockSubscribeToNotificationChanges =
      subscribeToNotificationChanges as jest.MockedFunction<typeof subscribeToNotificationChanges>;

    mockSubscribeToNotificationChanges.mockImplementationOnce(
      (
        _: string,
        onChange: (event: NotificationRealtimeChange) => void,
        onConnectionStateChange?: (state: NotificationRealtimeConnectionState) => void,
      ) => {
        mockLatestRealtimeHandler = onChange;
        mockLatestRealtimeStateHandler = onConnectionStateChange ?? null;
        onConnectionStateChange?.('unavailable');
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useNotifications({ userId: 'user-1' }));

    await waitFor(() => {
      expect(result.current.realtimeState).toBe('unavailable');
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
