import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  requestExpoPushTokenAndSync,
  subscribeToNotificationChanges,
  syncExpoPushTokenIfPermitted,
  type NotificationPermissionStatus,
  type NotificationRealtimeChange,
  type NotificationRealtimeConnectionState,
  type NotificationTokenSyncResult,
  type NotificationTokenSyncStatus,
} from '@/services/notification.service';
import type { NotificationRow } from '@/types/notification';
import { classifyError, translateErrorMessage } from '@/utils/error';

const DEFAULT_FOCUS_REFRESH_DEBOUNCE_MS = 2000;

export type NotificationsStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'empty' | 'error';

export type NotificationsRealtimeState = NotificationRealtimeConnectionState | 'disabled';

export interface NotificationsPermissionState {
  status: NotificationPermissionStatus | 'idle';
  syncStatus: NotificationTokenSyncStatus | 'idle';
  canRequest: boolean;
  isSupported: boolean;
  didPrompt: boolean;
  isRequesting: boolean;
  error: string | null;
}

export interface UseNotificationsState {
  items: NotificationRow[];
  status: NotificationsStatus;
  error: string | null;
}

export interface UseNotificationsParams {
  userId?: string;
  enableRealtime?: boolean;
  focusRefreshDebounceMs?: number;
}

export interface UseNotificationsReturn extends UseNotificationsState {
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  permissionStatus: NotificationsPermissionState;
  realtimeState: NotificationsRealtimeState;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

const IDLE_PERMISSION_STATE: NotificationsPermissionState = {
  status: 'idle',
  syncStatus: 'idle',
  canRequest: false,
  isSupported: false,
  didPrompt: false,
  isRequesting: false,
  error: null,
};

function getStatusForItems(
  items: NotificationRow[],
): Extract<NotificationsStatus, 'success' | 'empty'> {
  return items.length > 0 ? 'success' : 'empty';
}

function sortNotificationItems(items: NotificationRow[]): NotificationRow[] {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function upsertNotificationItem(
  currentItems: NotificationRow[],
  nextItem: NotificationRow,
): NotificationRow[] {
  const nextItemsById = new Map(currentItems.map(item => [item.id, item]));
  nextItemsById.set(nextItem.id, nextItem);
  return sortNotificationItems(Array.from(nextItemsById.values()));
}

function removeNotificationItem(
  currentItems: NotificationRow[],
  notificationId: string,
): NotificationRow[] {
  const nextItems = currentItems.filter(item => item.id !== notificationId);
  return nextItems.length === currentItems.length ? currentItems : nextItems;
}

function toPermissionState(result: NotificationTokenSyncResult): NotificationsPermissionState {
  const isSupported =
    result.permissionStatus !== 'unavailable' &&
    result.status !== 'unsupported_platform' &&
    result.status !== 'physical_device_required' &&
    result.status !== 'missing_project_id';

  return {
    status: result.permissionStatus,
    syncStatus: result.status,
    canRequest: isSupported && result.permissionStatus !== 'granted',
    isSupported,
    didPrompt: result.didPrompt,
    isRequesting: false,
    error: null,
  };
}

export function useNotifications({
  userId,
  enableRealtime = true,
  focusRefreshDebounceMs = DEFAULT_FOCUS_REFRESH_DEBOUNCE_MS,
}: UseNotificationsParams): UseNotificationsReturn {
  const [state, setState] = useState<UseNotificationsState>({
    items: [],
    status: userId ? 'loading' : 'idle',
    error: null,
  });
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationsPermissionState>(IDLE_PERMISSION_STATE);
  const [realtimeState, setRealtimeState] = useState<NotificationsRealtimeState>(
    userId && enableRealtime ? 'disconnected' : 'disabled',
  );

  const unreadCount = useMemo(
    () => state.items.filter(item => item.read_at == null).length,
    [state.items],
  );

  const activeRequestIdRef = useRef(0);
  const activePermissionRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const hasInitialLoadCompletedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const subscriptionCleanupRef = useRef<(() => void) | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const needsReconnectSyncRef = useRef(false);
  const refreshRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(
    async () => undefined,
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRequestIdRef.current += 1;
      activePermissionRequestIdRef.current += 1;
      fetchAbortControllerRef.current?.abort();
      fetchAbortControllerRef.current = null;
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    activePermissionRequestIdRef.current += 1;
    fetchAbortControllerRef.current?.abort();
    fetchAbortControllerRef.current = null;
    hasInitialLoadCompletedRef.current = false;
    lastLoadTimeRef.current = 0;
    hasConnectedOnceRef.current = false;
    needsReconnectSyncRef.current = false;

    setState({
      items: [],
      status: userId ? 'loading' : 'idle',
      error: null,
    });
    setPermissionStatus(IDLE_PERMISSION_STATE);
    setRealtimeState(userId ? 'disconnected' : 'disabled');
  }, [userId]);

  const loadNotifications = useCallback(
    async (
      reason: 'initial' | 'refresh' = 'initial',
      options?: { silent?: boolean },
    ): Promise<void> => {
      if (!userId) {
        fetchAbortControllerRef.current?.abort();
        fetchAbortControllerRef.current = null;
        setState({ items: [], status: 'idle', error: null });
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;

      fetchAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      fetchAbortControllerRef.current = abortController;

      const isRefresh = reason === 'refresh';
      const isSilent = options?.silent ?? false;

      if (!isSilent) {
        setState(prev => ({
          ...prev,
          status: isRefresh ? 'refreshing' : 'loading',
          error: isRefresh ? prev.error : null,
        }));
      }

      try {
        const { data, error } = await fetchNotifications(userId, abortController.signal);

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (error || !data) {
          throw error ?? new Error('Gagal memuat notifikasi.');
        }

        setState({
          items: data,
          status: getStatusForItems(data),
          error: null,
        });

        lastLoadTimeRef.current = Date.now();

        if (reason === 'initial') {
          hasInitialLoadCompletedRef.current = true;
        }
      } catch (error) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        if (isSilent) {
          return;
        }

        const classifiedError = classifyError(error);
        const errorMessage = translateErrorMessage(classifiedError);

        setState(prev => ({
          items: isRefresh ? prev.items : [],
          status: 'error',
          error: errorMessage,
        }));
      } finally {
        if (fetchAbortControllerRef.current === abortController) {
          fetchAbortControllerRef.current = null;
        }
      }
    },
    [userId],
  );

  const refresh = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      await loadNotifications('refresh', options);
    },
    [loadNotifications],
  );

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const syncPermissionStatus = useCallback(
    async (mode: 'initial' | 'request'): Promise<boolean> => {
      if (!userId) {
        setPermissionStatus(IDLE_PERMISSION_STATE);
        return false;
      }

      const requestId = activePermissionRequestIdRef.current + 1;
      activePermissionRequestIdRef.current = requestId;

      if (mode === 'request') {
        setPermissionStatus(prev => ({
          ...prev,
          isRequesting: true,
          error: null,
        }));
      }

      try {
        const { data, error } =
          mode === 'request'
            ? await requestExpoPushTokenAndSync(userId)
            : await syncExpoPushTokenIfPermitted(userId);

        if (!isMountedRef.current || activePermissionRequestIdRef.current !== requestId) {
          return false;
        }

        if (error || !data) {
          throw error ?? new Error('Gagal memeriksa izin notifikasi.');
        }

        setPermissionStatus(toPermissionState(data));
        return data.permissionStatus === 'granted';
      } catch (error) {
        if (!isMountedRef.current || activePermissionRequestIdRef.current !== requestId) {
          return false;
        }

        const classifiedError = classifyError(error);
        const errorMessage = translateErrorMessage(classifiedError);

        setPermissionStatus(prev => ({
          ...prev,
          isRequesting: false,
          error: errorMessage,
        }));

        return false;
      }
    },
    [userId],
  );

  const applyRealtimeChange = useCallback((change: NotificationRealtimeChange) => {
    setState(prev => {
      if (change.type === 'DELETE') {
        const deletedItem = change.old ?? change.new;

        if (!deletedItem) {
          return prev;
        }

        const items = removeNotificationItem(prev.items, deletedItem.id);
        return {
          items,
          status: getStatusForItems(items),
          error: null,
        };
      }

      const nextItem = change.new;

      if (!nextItem) {
        return prev;
      }

      const items = upsertNotificationItem(prev.items, nextItem);

      return {
        items,
        status: getStatusForItems(items),
        error: null,
      };
    });
  }, []);

  const handleRealtimeStateChange = useCallback(
    (nextRealtimeState: NotificationRealtimeConnectionState) => {
      setRealtimeState(nextRealtimeState);

      if (nextRealtimeState === 'connected') {
        if (hasConnectedOnceRef.current && needsReconnectSyncRef.current) {
          needsReconnectSyncRef.current = false;
          void refreshRef.current({ silent: true });
        }

        hasConnectedOnceRef.current = true;
        return;
      }

      if (nextRealtimeState === 'reconnecting' && hasConnectedOnceRef.current) {
        needsReconnectSyncRef.current = true;
      }
    },
    [],
  );

  useEffect(() => {
    if (!userId) {
      setState({ items: [], status: 'idle', error: null });
      return;
    }

    void loadNotifications('initial');
  }, [loadNotifications, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void syncPermissionStatus('initial');
  }, [syncPermissionStatus, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !hasInitialLoadCompletedRef.current) {
        return;
      }

      const timeSinceLastLoad = Date.now() - lastLoadTimeRef.current;

      if (timeSinceLastLoad > focusRefreshDebounceMs) {
        void refreshRef.current();
      }
    }, [focusRefreshDebounceMs, userId]),
  );

  useEffect(() => {
    subscriptionCleanupRef.current?.();
    subscriptionCleanupRef.current = null;
    hasConnectedOnceRef.current = false;
    needsReconnectSyncRef.current = false;

    if (!userId || !enableRealtime) {
      setRealtimeState('disabled');
      return;
    }

    subscriptionCleanupRef.current = subscribeToNotificationChanges(
      userId,
      applyRealtimeChange,
      handleRealtimeStateChange,
    );

    return () => {
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
    };
  }, [applyRealtimeChange, enableRealtime, handleRealtimeStateChange, userId]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!userId) {
        return false;
      }

      try {
        const { data, error } = await markNotificationAsRead(notificationId, userId);

        if (error) {
          throw error;
        }

        if (!data) {
          await refresh({ silent: true });
          return true;
        }

        setState(prev => {
          const items = upsertNotificationItem(prev.items, data);
          return {
            items,
            status: getStatusForItems(items),
            error: null,
          };
        });

        return true;
      } catch (error) {
        const classifiedError = classifyError(error);
        const errorMessage = translateErrorMessage(classifiedError);

        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));

        return false;
      }
    },
    [refresh, userId],
  );

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      const { data, error } = await markAllNotificationsAsRead(userId);

      if (error || !data) {
        throw error ?? new Error('Gagal menandai semua notifikasi sebagai dibaca.');
      }

      if (data.markedCount === 0) {
        setState(prev => ({
          ...prev,
          error: null,
        }));
        return true;
      }

      setState(prev => {
        const items = prev.items.map(item =>
          item.read_at == null
            ? {
                ...item,
                read_at: data.readAt,
              }
            : item,
        );

        return {
          items,
          status: getStatusForItems(items),
          error: null,
        };
      });

      return true;
    } catch (error) {
      const classifiedError = classifyError(error);
      const errorMessage = translateErrorMessage(classifiedError);

      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));

      return false;
    }
  }, [userId]);

  return {
    ...state,
    unreadCount,
    isLoading: state.status === 'loading',
    isRefreshing: state.status === 'refreshing',
    permissionStatus,
    realtimeState,
    refresh,
    markAsRead,
    markAllAsRead,
    requestPermission: () => syncPermissionStatus('request'),
  };
}

export default useNotifications;
