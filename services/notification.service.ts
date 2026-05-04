import { supabase } from '@/utils/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { NotificationRow } from '@/types/notification';
import { isNotificationType } from '@/types/notification';
import type { Tables, TablesUpdate } from '@/types/supabase';
import type { ProfileRow } from '@/types/user';
import {
  bootstrapAndroidNotificationChannelAsync,
  hasExpoNotificationMethodsAsync,
  hasExpoPushTokenRuntimeSupport,
  getExpoNotificationsModuleAsync,
  isPhysicalNotificationDeviceAsync,
  resolveNotificationProjectId,
} from '@/utils/notifications';

type ExpoNotificationsModule = typeof import('expo-notifications');

type NotificationTableRow = Tables<'notifications'>;
type NotificationRealtimeRecord = Partial<NotificationTableRow>;

export type NotificationPermissionStatus =
  | Awaited<ReturnType<ExpoNotificationsModule['getPermissionsAsync']>>['status']
  | 'unavailable';

export type NotificationRealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'unavailable';

export interface NotificationRealtimeChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new: NotificationRow | null;
  old: NotificationRow | null;
}

export interface NotificationServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface MarkAllNotificationsReadResult {
  markedCount: number;
  readAt: string;
}

export type NotificationTokenSyncStatus =
  | 'updated'
  | 'unchanged'
  | 'permission_not_granted'
  | 'unsupported_platform'
  | 'physical_device_required'
  | 'missing_project_id'
  | 'token_unavailable';

export interface NotificationTokenSyncResult {
  didPrompt: boolean;
  permissionStatus: NotificationPermissionStatus;
  status: NotificationTokenSyncStatus;
  token: string | null;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unexpected notification service error.');
}

function withAbortSignal<T>(query: T, signal?: AbortSignal): T {
  if (!signal) {
    return query;
  }

  if (
    typeof query === 'object' &&
    query !== null &&
    'abortSignal' in query &&
    typeof (query as { abortSignal?: unknown }).abortSignal === 'function'
  ) {
    return (query as { abortSignal: (value: AbortSignal) => T }).abortSignal(signal);
  }

  return query;
}

function normalizeRequiredIdentifier(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeExpoPushToken(token: string): string {
  const normalized = token.trim();

  if (!normalized) {
    throw new Error('Expo push token is required.');
  }

  return normalized;
}

function normalizeNotificationRow(row: NotificationTableRow): NotificationRow {
  if (!isNotificationType(row.type)) {
    throw new Error(`Unsupported notification type received: ${row.type}`);
  }

  return {
    ...row,
    type: row.type,
  };
}

function normalizeNotificationRows(rows: NotificationTableRow[]): NotificationRow[] {
  return rows.map(normalizeNotificationRow);
}

function normalizeNotificationRealtimeRecord(
  record: NotificationRealtimeRecord | null | undefined,
): NotificationRow | null {
  if (!record || typeof record.id !== 'string' || typeof record.user_id !== 'string') {
    return null;
  }

  if (typeof record.type !== 'string' || !isNotificationType(record.type)) {
    return null;
  }

  if (
    typeof record.title !== 'string' ||
    typeof record.body !== 'string' ||
    typeof record.priority !== 'string' ||
    typeof record.created_at !== 'string'
  ) {
    return null;
  }

  try {
    return normalizeNotificationRow(record as NotificationTableRow);
  } catch {
    return null;
  }
}

function createTokenSyncResult(
  status: NotificationTokenSyncStatus,
  permissionStatus: NotificationPermissionStatus,
  didPrompt: boolean,
  token: string | null = null,
): NotificationTokenSyncResult {
  return {
    didPrompt,
    permissionStatus,
    status,
    token,
  };
}

async function getProfileTokenState(
  userId: string,
): Promise<NotificationServiceResult<Pick<ProfileRow, 'id' | 'expo_push_token'>>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    return {
      data: data
        ? {
            id: data.id,
            expo_push_token: data.expo_push_token,
          }
        : null,
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

async function syncExpoPushTokenWithPermissionState(
  userId: string,
  permissionStatus: NotificationPermissionStatus,
  didPrompt: boolean,
): Promise<NotificationServiceResult<NotificationTokenSyncResult>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');

    if (!hasExpoPushTokenRuntimeSupport()) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', didPrompt),
        error: null,
      };
    }

    if (
      !(await hasExpoNotificationMethodsAsync([
        'getExpoPushTokenAsync',
        'setNotificationChannelAsync',
      ]))
    ) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', didPrompt),
        error: null,
      };
    }

    if (!(await isPhysicalNotificationDeviceAsync())) {
      return {
        data: createTokenSyncResult('physical_device_required', permissionStatus, didPrompt),
        error: null,
      };
    }

    const projectId = resolveNotificationProjectId();

    if (!projectId) {
      return {
        data: createTokenSyncResult('missing_project_id', permissionStatus, didPrompt),
        error: null,
      };
    }

    await bootstrapAndroidNotificationChannelAsync();

    const { data: profile, error: profileError } = await getProfileTokenState(normalizedUserId);

    if (profileError) {
      return { data: null, error: profileError };
    }

    const Notifications = await getExpoNotificationsModuleAsync();

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data.trim();

    if (!token) {
      return {
        data: createTokenSyncResult('token_unavailable', permissionStatus, didPrompt),
        error: null,
      };
    }

    if (profile?.expo_push_token === token) {
      return {
        data: createTokenSyncResult('unchanged', permissionStatus, didPrompt, token),
        error: null,
      };
    }

    const { error: updateError } = await updateExpoPushToken(normalizedUserId, token);

    if (updateError) {
      return { data: null, error: updateError };
    }

    return {
      data: createTokenSyncResult('updated', permissionStatus, didPrompt, token),
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function fetchNotifications(
  userId: string,
  signal?: AbortSignal,
): Promise<NotificationServiceResult<NotificationRow[]>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');

    let query = supabase.from('notifications').select('*').eq('user_id', normalizedUserId);
    query = withAbortSignal(query, signal);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    return { data: normalizeNotificationRows((data ?? []) as NotificationTableRow[]), error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function fetchUnreadNotificationCount(
  userId: string,
  signal?: AbortSignal,
): Promise<NotificationServiceResult<number>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');

    let query = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', normalizedUserId);
    query = withAbortSignal(query, signal);

    const { count, error } = await query.is('read_at', null);

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    return { data: count ?? 0, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<NotificationServiceResult<NotificationRow>> {
  try {
    const normalizedNotificationId = normalizeRequiredIdentifier(notificationId, 'notificationId');
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const readAt = new Date().toISOString();

    let query = supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', normalizedNotificationId)
      .eq('user_id', normalizedUserId)
      .is('read_at', null)
      .select('*')
      .maybeSingle();
    query = withAbortSignal(query, signal);

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    if (data) {
      return { data: normalizeNotificationRow(data as NotificationTableRow), error: null };
    }

    let existingQuery = supabase
      .from('notifications')
      .select('*')
      .eq('id', normalizedNotificationId)
      .eq('user_id', normalizedUserId)
      .maybeSingle();
    existingQuery = withAbortSignal(existingQuery, signal);

    const { data: existingData, error: existingError } = await existingQuery;

    if (existingError) {
      return { data: null, error: existingError as unknown as Error };
    }

    return {
      data: existingData ? normalizeNotificationRow(existingData as NotificationTableRow) : null,
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function markAllNotificationsAsRead(
  userId: string,
  signal?: AbortSignal,
): Promise<NotificationServiceResult<MarkAllNotificationsReadResult>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const readAt = new Date().toISOString();

    let query = supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', normalizedUserId)
      .is('read_at', null);
    query = withAbortSignal(query, signal);

    const { data, error } = await query.select('id');

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    return {
      data: {
        markedCount: data?.length ?? 0,
        readAt,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function syncExpoPushTokenIfPermitted(
  userId: string,
): Promise<NotificationServiceResult<NotificationTokenSyncResult>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');

    if (!hasExpoPushTokenRuntimeSupport()) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', false),
        error: null,
      };
    }

    if (
      !(await hasExpoNotificationMethodsAsync([
        'getPermissionsAsync',
        'getExpoPushTokenAsync',
        'setNotificationChannelAsync',
      ]))
    ) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', false),
        error: null,
      };
    }

    if (!(await isPhysicalNotificationDeviceAsync())) {
      return {
        data: createTokenSyncResult('physical_device_required', 'unavailable', false),
        error: null,
      };
    }

    if (!resolveNotificationProjectId()) {
      return {
        data: createTokenSyncResult('missing_project_id', 'unavailable', false),
        error: null,
      };
    }

    await bootstrapAndroidNotificationChannelAsync();

    const Notifications = await getExpoNotificationsModuleAsync();

    const permissionResponse = await Notifications.getPermissionsAsync();

    if (!permissionResponse.granted && permissionResponse.status !== 'granted') {
      return {
        data: createTokenSyncResult('permission_not_granted', permissionResponse.status, false),
        error: null,
      };
    }

    return syncExpoPushTokenWithPermissionState(normalizedUserId, permissionResponse.status, false);
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function requestExpoPushTokenAndSync(
  userId: string,
): Promise<NotificationServiceResult<NotificationTokenSyncResult>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');

    if (!hasExpoPushTokenRuntimeSupport()) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', true),
        error: null,
      };
    }

    if (
      !(await hasExpoNotificationMethodsAsync([
        'requestPermissionsAsync',
        'getExpoPushTokenAsync',
        'setNotificationChannelAsync',
      ]))
    ) {
      return {
        data: createTokenSyncResult('unsupported_platform', 'unavailable', true),
        error: null,
      };
    }

    if (!(await isPhysicalNotificationDeviceAsync())) {
      return {
        data: createTokenSyncResult('physical_device_required', 'unavailable', true),
        error: null,
      };
    }

    if (!resolveNotificationProjectId()) {
      return {
        data: createTokenSyncResult('missing_project_id', 'unavailable', true),
        error: null,
      };
    }

    await bootstrapAndroidNotificationChannelAsync();

    const Notifications = await getExpoNotificationsModuleAsync();

    const permissionResponse = await Notifications.requestPermissionsAsync();

    if (!permissionResponse.granted && permissionResponse.status !== 'granted') {
      return {
        data: createTokenSyncResult('permission_not_granted', permissionResponse.status, true),
        error: null,
      };
    }

    return syncExpoPushTokenWithPermissionState(normalizedUserId, permissionResponse.status, true);
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function updateExpoPushToken(
  userId: string,
  expoPushToken: string,
): Promise<NotificationServiceResult<ProfileRow>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const normalizedExpoPushToken = normalizeExpoPushToken(expoPushToken);
    const now = new Date().toISOString();

    const updatePayload: TablesUpdate<'profiles'> = {
      expo_push_token: normalizedExpoPushToken,
      expo_push_token_updated_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', normalizedUserId)
      .select('*')
      .maybeSingle();

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    if (!data) {
      return { data: null, error: new Error('Profile not found for push token update.') };
    }

    return { data: data as ProfileRow, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function clearExpoPushToken(
  userId: string,
): Promise<NotificationServiceResult<ProfileRow>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const now = new Date().toISOString();

    const updatePayload: TablesUpdate<'profiles'> = {
      expo_push_token: null,
      expo_push_token_updated_at: null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', normalizedUserId)
      .select('*')
      .maybeSingle();

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return { data: data as ProfileRow, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export function subscribeToNotificationChanges(
  userId: string,
  onChange: (event: NotificationRealtimeChange) => void,
  onConnectionStateChange?: (state: NotificationRealtimeConnectionState) => void,
): () => void {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    onConnectionStateChange?.('disconnected');
    return () => {};
  }

  if (typeof supabase.channel !== 'function' || typeof supabase.removeChannel !== 'function') {
    onConnectionStateChange?.('unavailable');
    return () => {};
  }

  const channelName = `notifications:${normalizedUserId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  onConnectionStateChange?.('connecting');

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${normalizedUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRealtimeRecord>) => {
          const payloadItem: NotificationRow | null =
            normalizeNotificationRealtimeRecord(payload.new) ??
            normalizeNotificationRealtimeRecord(payload.old);

          if (__DEV__) {
            console.log('[Realtime] Notification change:', payload.eventType, payloadItem?.id);
          }

          const eventType = payload.eventType;

          if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
            onChange({
              type: eventType,
              new: normalizeNotificationRealtimeRecord(payload.new),
              old: normalizeNotificationRealtimeRecord(payload.old),
            });
          }
        },
      )
      .subscribe(status => {
        if (__DEV__) {
          console.log('[Realtime] Notification subscription status:', status);
        }

        switch (status) {
          case 'SUBSCRIBED':
            onConnectionStateChange?.('connected');
            break;
          case 'TIMED_OUT':
          case 'CHANNEL_ERROR':
            onConnectionStateChange?.('reconnecting');
            break;
          case 'CLOSED':
            onConnectionStateChange?.('disconnected');
            break;
          default:
            break;
        }
      });

    return () => {
      onConnectionStateChange?.('disconnected');
      void channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification.service] failed to subscribe to realtime notifications:', error);
    }

    onConnectionStateChange?.('unavailable');
    return () => {};
  }
}
