import { supabase } from '@/utils/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { NotificationRow } from '@/types/notification';
import { isNotificationType } from '@/types/notification';
import type { Tables, TablesUpdate } from '@/types/supabase';
import type { ProfileRow } from '@/types/user';
import {
  addExpoPushTokenListenerAsync,
  bootstrapAndroidNotificationChannelAsync,
  hasExpoNotificationMethodsAsync,
  hasExpoPushTokenRuntimeSupport,
  getExpoNotificationsModuleAsync,
  isPhysicalNotificationDeviceAsync,
  resolveNotificationProjectId,
} from '@/utils/notifications';
import LargeSecureStore from '@/utils/LargeSecureStore';

type ExpoNotificationsModule = typeof import('expo-notifications');
type ExpoPushToken = Parameters<ExpoNotificationsModule['addPushTokenListener']>[0] extends (
  event: infer Event,
) => void
  ? Event
  : { data: string };

type NotificationTableRow = Tables<'notifications'>;
type NotificationRealtimeRecord = Partial<NotificationTableRow>;
type ProfilePushTokenRow = {
  id?: string;
  user_id: string;
  device_id: string;
  expo_push_token: string;
  platform: 'android' | 'ios' | 'web' | 'native' | string;
  last_seen_at: string;
  revoked_at: string | null;
  created_at?: string;
  updated_at?: string;
};
type ProfilePushTokenUpsert = Pick<
  ProfilePushTokenRow,
  'user_id' | 'device_id' | 'expo_push_token' | 'platform' | 'last_seen_at' | 'revoked_at'
>;
type ProfilePushTokenClient = {
  from(table: 'profile_push_tokens'): {
    upsert(
      values: ProfilePushTokenUpsert,
      options: { onConflict: string },
    ): {
      select(columns: string): {
        maybeSingle(): Promise<{ data: ProfilePushTokenRow | null; error: unknown }>;
      };
    };
    update(values: Partial<Pick<ProfilePushTokenRow, 'last_seen_at' | 'revoked_at'>>): {
      eq(column: string, value: string): ProfilePushTokenUpdateQuery;
    };
  };
};
type ProfilePushTokenUpdateQuery = {
  eq(column: string, value: string): ProfilePushTokenUpdateQuery;
  select(columns: string): {
    maybeSingle(): Promise<{ data: ProfilePushTokenRow | null; error: unknown }>;
  };
};
type NotificationPageCursor = string | null;

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_DEVICE_ID_STORAGE_KEY = 'notifications:device-id';

export interface FetchNotificationsOptions {
  signal?: AbortSignal;
  cursor?: NotificationPageCursor;
  pageSize?: number;
}

export interface NotificationPage {
  items: NotificationRow[];
  hasMore: boolean;
  nextCursor: NotificationPageCursor;
}

const notificationStorage = new LargeSecureStore();

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

function getProfilePushTokenClient(): ProfilePushTokenClient {
  return supabase as unknown as ProfilePushTokenClient;
}

function createDeviceId(): string {
  const cryptoModule = globalThis.crypto;

  if (typeof cryptoModule.randomUUID === 'function') {
    return cryptoModule.randomUUID();
  }

  const randomValues = new Uint8Array(16);
  cryptoModule.getRandomValues(randomValues);
  const randomHex = Array.from(randomValues, value => value.toString(16).padStart(2, '0')).join('');

  return `device-${Date.now().toString(36)}-${randomHex}`;
}

export async function getNotificationDeviceId(): Promise<string> {
  const storedDeviceId = (
    await notificationStorage.getItem(NOTIFICATION_DEVICE_ID_STORAGE_KEY)
  )?.trim();

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const deviceId = createDeviceId().trim();
  await notificationStorage.setItem(NOTIFICATION_DEVICE_ID_STORAGE_KEY, deviceId);

  return deviceId;
}

function normalizeFetchOptions(
  optionsOrSignal?: FetchNotificationsOptions | AbortSignal,
): Required<Pick<FetchNotificationsOptions, 'pageSize'>> &
  Pick<FetchNotificationsOptions, 'signal' | 'cursor'> {
  if (optionsOrSignal instanceof AbortSignal) {
    return { signal: optionsOrSignal, cursor: null, pageSize: NOTIFICATIONS_PAGE_SIZE };
  }

  const pageSize = Math.max(1, optionsOrSignal?.pageSize ?? NOTIFICATIONS_PAGE_SIZE);

  return {
    signal: optionsOrSignal?.signal,
    cursor: optionsOrSignal?.cursor ?? null,
    pageSize,
  };
}

function getOffsetFromCursor(cursor: NotificationPageCursor): number {
  if (!cursor) {
    return 0;
  }

  const parsedCursor = Number.parseInt(cursor, 10);

  return Number.isFinite(parsedCursor) && parsedCursor > 0 ? parsedCursor : 0;
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

async function mirrorLegacyProfileToken(
  userId: string,
  expoPushToken: string,
  now: string,
): Promise<NotificationServiceResult<ProfileRow | null>> {
  const updatePayload: TablesUpdate<'profiles'> = {
    expo_push_token: expoPushToken,
    expo_push_token_updated_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return { data: data ? (data as ProfileRow) : null, error: null };
}

async function clearLegacyProfileTokenIfCurrent(
  userId: string,
  expoPushToken: string,
  now: string,
): Promise<NotificationServiceResult<ProfileRow | null>> {
  const updatePayload: TablesUpdate<'profiles'> = {
    expo_push_token: null,
    expo_push_token_updated_at: null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .eq('expo_push_token', expoPushToken)
    .select('*')
    .maybeSingle();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return { data: data ? (data as ProfileRow) : null, error: null };
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

    const Notifications = await getExpoNotificationsModuleAsync();

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data.trim();

    if (!token) {
      return {
        data: createTokenSyncResult('token_unavailable', permissionStatus, didPrompt),
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
  optionsOrSignal?: FetchNotificationsOptions | AbortSignal,
): Promise<NotificationServiceResult<NotificationPage>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const { signal, cursor, pageSize } = normalizeFetchOptions(optionsOrSignal);
    const offset = getOffsetFromCursor(cursor ?? null);
    const rangeEnd = offset + pageSize;

    let query = supabase.from('notifications').select('*').eq('user_id', normalizedUserId);
    query = withAbortSignal(query, signal);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, rangeEnd);

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    const rows = normalizeNotificationRows((data ?? []) as NotificationTableRow[]);
    const items = rows.slice(0, pageSize);
    const hasMore = rows.length > pageSize;

    return {
      data: {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + items.length) : null,
      },
      error: null,
    };
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
): Promise<NotificationServiceResult<ProfilePushTokenRow>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const normalizedExpoPushToken = normalizeExpoPushToken(expoPushToken);
    const deviceId = await getNotificationDeviceId();
    const now = new Date().toISOString();

    const upsertPayload: ProfilePushTokenUpsert = {
      user_id: normalizedUserId,
      device_id: deviceId,
      expo_push_token: normalizedExpoPushToken,
      platform: Platform.OS,
      last_seen_at: now,
      revoked_at: null,
    };

    const { data, error } = await getProfilePushTokenClient()
      .from('profile_push_tokens')
      .upsert(upsertPayload, { onConflict: 'user_id,device_id' })
      .select('*')
      .maybeSingle();

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    if (!data) {
      return { data: null, error: new Error('Push token row not found after update.') };
    }

    const { error: legacyError } = await mirrorLegacyProfileToken(
      normalizedUserId,
      normalizedExpoPushToken,
      now,
    );

    if (legacyError) {
      return { data: null, error: legacyError };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function clearExpoPushToken(
  userId: string,
  expoPushToken?: string | null,
): Promise<NotificationServiceResult<ProfilePushTokenRow | null>> {
  try {
    const normalizedUserId = normalizeRequiredIdentifier(userId, 'userId');
    const normalizedExpoPushToken = expoPushToken ? normalizeExpoPushToken(expoPushToken) : null;
    const deviceId = await getNotificationDeviceId();
    const now = new Date().toISOString();

    let revokeQuery = getProfilePushTokenClient()
      .from('profile_push_tokens')
      .update({ revoked_at: now, last_seen_at: now })
      .eq('user_id', normalizedUserId)
      .eq('device_id', deviceId);

    if (normalizedExpoPushToken) {
      revokeQuery = revokeQuery.eq('expo_push_token', normalizedExpoPushToken);
    }

    const { data, error } = await revokeQuery.select('*').maybeSingle();

    if (error) {
      return { data: null, error: error as unknown as Error };
    }

    const tokenForLegacyCleanup = normalizedExpoPushToken ?? data?.expo_push_token ?? null;

    if (tokenForLegacyCleanup) {
      const { error: legacyError } = await clearLegacyProfileTokenIfCurrent(
        normalizedUserId,
        tokenForLegacyCleanup,
        now,
      );

      if (legacyError) {
        return { data: null, error: legacyError };
      }
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export function subscribeToExpoPushTokenUpdates(
  userId: string,
  onSync?: (result: NotificationServiceResult<ProfilePushTokenRow>) => void,
): () => void {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return () => {};
  }

  let isActive = true;
  let subscription: { remove: () => void } | null = null;

  void addExpoPushTokenListenerAsync((event: ExpoPushToken) => {
    const token = event.data.trim();

    if (!token) {
      return;
    }

    void updateExpoPushToken(normalizedUserId, token).then(result => {
      if (isActive) {
        onSync?.(result);
      }
    });
  })
    .then(nextSubscription => {
      if (!isActive) {
        nextSubscription?.remove();
        return;
      }

      subscription = nextSubscription;
    })
    .catch(error => {
      if (__DEV__) console.warn('[notification.service] push token listener unavailable:', error);
    });

  return () => {
    isActive = false;
    subscription?.remove();
    subscription = null;
  };
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
