import type { NotificationResponse } from 'expo-notifications';
import {
  NOTIFICATIONS_FALLBACK_ROUTE,
  buildNotificationTypedHref,
  isNotificationType,
  parseNotificationRoute,
  type NotificationFallbackRoute,
  type NotificationRouteSource,
} from '@/types/notification';
import type { TypedHref } from '@/types/routes.types';
import type { Json } from '@/types/supabase';

type NotificationRoutePayloadRecord = {
  cta_route?: unknown;
  data?: unknown;
  notification_id?: unknown;
  sourceEventKey?: unknown;
  source_event_key?: unknown;
  type?: unknown;
};

export type NotificationNavigationHref = TypedHref | NotificationFallbackRoute;

function toJson(value: unknown): Json | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalizedArray: Json[] = [];

    for (const entry of value) {
      const normalizedEntry = toJson(entry);

      if (normalizedEntry === null && entry !== null) {
        return null;
      }

      normalizedArray.push(normalizedEntry);
    }

    return normalizedArray;
  }

  if (typeof value !== 'object') {
    return null;
  }

  const normalizedObject: Record<string, Json | undefined> = {};

  for (const [key, entry] of Object.entries(value)) {
    const normalizedEntry = toJson(entry);

    if (normalizedEntry === null && entry !== null) {
      return null;
    }

    normalizedObject[key] = normalizedEntry;
  }

  return normalizedObject;
}

function getNotificationRouteSource(data: unknown): NotificationRouteSource | null {
  if (typeof data !== 'object' || data == null || Array.isArray(data)) {
    return null;
  }

  const record = data as NotificationRoutePayloadRecord;
  const notificationType = record.type;

  if (typeof notificationType !== 'string' || !isNotificationType(notificationType)) {
    return null;
  }

  const normalizedData = toJson(record.data);

  if (normalizedData === null && record.data !== null && record.data !== undefined) {
    return null;
  }

  return {
    type: notificationType,
    cta_route: typeof record.cta_route === 'string' ? record.cta_route : null,
    data: normalizedData ?? null,
  };
}

function getNotificationSourceEventKey(data: unknown): string | null {
  if (typeof data !== 'object' || data == null || Array.isArray(data)) {
    return null;
  }

  const record = data as NotificationRoutePayloadRecord;
  const sourceEventKey = record.sourceEventKey ?? record.source_event_key;

  if (typeof sourceEventKey !== 'string') {
    return null;
  }

  const normalizedSourceEventKey = sourceEventKey.trim();
  return normalizedSourceEventKey.length > 0 ? normalizedSourceEventKey : null;
}

function getNotificationRecordId(data: unknown): string | null {
  if (typeof data !== 'object' || data == null || Array.isArray(data)) {
    return null;
  }

  const record = data as NotificationRoutePayloadRecord;

  if (typeof record.notification_id !== 'string') {
    return null;
  }

  const normalizedNotificationId = record.notification_id.trim();
  return normalizedNotificationId.length > 0 ? normalizedNotificationId : null;
}

export function resolveNotificationNavigationHref(data: unknown): NotificationNavigationHref {
  const routeSource = getNotificationRouteSource(data);

  if (!routeSource) {
    return NOTIFICATIONS_FALLBACK_ROUTE;
  }

  const parsedRoute = parseNotificationRoute(routeSource);

  if (parsedRoute.kind === 'fallback') {
    return parsedRoute.fallbackRoute;
  }

  return buildNotificationTypedHref(parsedRoute.route);
}

export function getNotificationResponseIdentifier(
  response: NotificationResponse | null,
): string | null {
  const requestIdentifier = response?.notification.request.identifier?.trim();

  if (requestIdentifier) {
    return requestIdentifier;
  }

  const notificationRecordId = getNotificationRecordId(response?.notification.request.content.data);

  if (notificationRecordId) {
    return notificationRecordId;
  }

  return getNotificationSourceEventKey(response?.notification.request.content.data);
}
