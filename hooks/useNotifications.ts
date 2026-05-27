import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  requestExpoPushTokenAndSync,
  sendTestNotification as sendTestNotificationRequest,
  subscribeToNotificationChanges,
  syncExpoPushTokenIfPermitted,
  type NotificationPage,
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
  hasMore: boolean;
  nextCursor: string | null;
  isLoadingMore: boolean;
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
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  isSendingTestNotification: boolean;
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

function getStateForPage(page: NotificationPage): UseNotificationsState {
  return {
    items: page.items,
    status: getStatusForItems(page.items),
    error: null,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    isLoadingMore: false,
  };
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
    hasMore: false,
    nextCursor: null,
    isLoadingMore: false,
  });
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationsPermissionState>(IDLE_PERMISSION_STATE);
  const [realtimeState, setRealtimeState] = useState<NotificationsRealtimeState>(
    userId && enableRealtime ? 'disconnected' : 'disabled',
  );
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false);

  const unreadCount = useMemo(
    () => state.items.filter(item => item.read_at == null).length,
    [state.items],
  );

  const activeRequestIdRef = useRef(0);
  const activePermissionRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const loadMoreAbortControllerRef = useRef<AbortController | null>(null);
  const hasInitialLoadCompletedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const subscriptionCleanupRef = useRef<(() => void) | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const needsReconnectSyncRef = useRef(false);
  const isSendingTestNotificationRef = useRef(false);
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
      loadMoreAbortControllerRef.current?.abort();
      loadMoreAbortControllerRef.current = null;
      subscriptionCleanupRef.current?.();
      subscriptionCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRequestIdRef.current += 1;
    activePermissionRequestIdRef.current += 1;
    fetchAbortControllerRef.current?.abort();
    fetchAbortControllerRef.current = null;
    loadMoreAbortControllerRef.current?.abort();
    loadMoreAbortControllerRef.current = null;
    hasInitialLoadCompletedRef.current = false;
    lastLoadTimeRef.current = 0;
    hasConnectedOnceRef.current = false;
    needsReconnectSyncRef.current = false;

    setState({
      items: [],
      status: userId ? 'loading' : 'idle',
      error: null,
      hasMore: false,
      nextCursor: null,
      isLoadingMore: false,
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
        loadMoreAbortControllerRef.current?.abort();
        loadMoreAbortControllerRef.current = null;
        setState({
          items: [],
          status: 'idle',
          error: null,
          hasMore: false,
          nextCursor: null,
          isLoadingMore: false,
        });
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
        const { data, error } = await fetchNotifications(userId, {
          signal: abortController.signal,
        });

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (error || !data) {
          throw error ?? new Error('Gagal memuat notifikasi.');
        }

        setState(getStateForPage(data));

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
          hasMore: isRefresh ? prev.hasMore : false,
          nextCursor: isRefresh ? prev.nextCursor : null,
          isLoadingMore: false,
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

  const loadMore = useCallback(async (): Promise<void> => {
    if (!userId || !state.hasMore || !state.nextCursor || state.isLoadingMore) {
      return;
    }

    const abortController = new AbortController();
    loadMoreAbortControllerRef.current?.abort();
    loadMoreAbortControllerRef.current = abortController;

    setState(prev => ({
      ...prev,
      isLoadingMore: true,
      error: null,
    }));

    try {
      const { data, error } = await fetchNotifications(userId, {
        signal: abortController.signal,
        cursor: state.nextCursor,
      });

      if (!isMountedRef.current || loadMoreAbortControllerRef.current !== abortController) {
        return;
      }

      if (error || !data) {
        throw error ?? new Error('Gagal memuat notifikasi berikutnya.');
      }

      setState(prev => ({
        items: sortNotificationItems([...prev.items, ...data.items]),
        status: getStatusForItems([...prev.items, ...data.items]),
        error: null,
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
        isLoadingMore: false,
      }));
    } catch (error) {
      if (!isMountedRef.current || loadMoreAbortControllerRef.current !== abortController) {
        return;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const classifiedError = classifyError(error);
      const errorMessage = translateErrorMessage(classifiedError);

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoadingMore: false,
      }));
    } finally {
      if (loadMoreAbortControllerRef.current === abortController) {
        loadMoreAbortControllerRef.current = null;
      }
    }
  }, [state.hasMore, state.isLoadingMore, state.nextCursor, userId]);

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
          ...prev,
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
        ...prev,
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
      setState({
        items: [],
        status: 'idle',
        error: null,
        hasMore: false,
        nextCursor: null,
        isLoadingMore: false,
      });
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
            ...prev,
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
          ...prev,
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

  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!userId || isSendingTestNotificationRef.current) {
      return false;
    }

    isSendingTestNotificationRef.current = true;
    setIsSendingTestNotification(true);

    try {
      const { data, error } = await sendTestNotificationRequest(userId);

      if (error || !data) {
        throw error ?? new Error('Gagal mengirim tes notifikasi.');
      }

      if (!data.delivered) {
        throw new Error(data.reason ?? 'Gagal mengirim tes notifikasi.');
      }

      setState(prev => {
        return {
          ...prev,
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
    } finally {
      isSendingTestNotificationRef.current = false;

      if (isMountedRef.current) {
        setIsSendingTestNotification(false);
      }
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
    loadMore,
    markAsRead,
    markAllAsRead,
    requestPermission: () => syncPermissionStatus('request'),
    sendTestNotification,
    isSendingTestNotification,
  };
}

export default useNotifications;
