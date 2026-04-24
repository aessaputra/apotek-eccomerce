import type { AppRoutes, RouteParams, TypedHref } from './routes.types';
import type { Database, Json, Tables } from './supabase';

export const NOTIFICATION_TYPES = [
  'payment_settlement',
  'payment_failed_or_expired',
  'order_processing',
  'order_awaiting_shipment',
  'order_shipped',
  'order_delivered_action_required',
  'order_completed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

type NotificationAppRoute = Extract<
  keyof AppRoutes,
  'orders/order-detail/[orderId]' | 'orders/track-shipment/[orderId]'
>;

export const NOTIFICATION_ROUTE_TARGETS = [
  'orders/order-detail/[orderId]',
  'orders/track-shipment/[orderId]',
] as const;

export type NotificationRouteTarget = (typeof NOTIFICATION_ROUTE_TARGETS)[number];

export const NOTIFICATIONS_FALLBACK_ROUTE = '/notifications';

export type NotificationFallbackRoute = typeof NOTIFICATIONS_FALLBACK_ROUTE;

export interface NotificationRouteTargetByType {
  payment_settlement: 'orders/order-detail/[orderId]';
  payment_failed_or_expired: 'orders/order-detail/[orderId]';
  order_processing: 'orders/order-detail/[orderId]';
  order_awaiting_shipment: 'orders/order-detail/[orderId]';
  order_shipped: 'orders/track-shipment/[orderId]';
  order_delivered_action_required: 'orders/order-detail/[orderId]';
  order_completed: 'orders/order-detail/[orderId]';
}

export type NotificationRouteTargetForType<T extends NotificationType> =
  NotificationRouteTargetByType[T];

export type NotificationRouteKey<T extends NotificationRouteTarget> = T extends `/${infer Route}`
  ? Extract<Route, NotificationAppRoute>
  : Extract<T, NotificationAppRoute>;

export type NotificationRouteParams<T extends NotificationRouteTarget> = RouteParams<
  NotificationRouteKey<T>
>;

export type NotificationPaymentStatus = Extract<
  Database['public']['Enums']['payment_status'],
  'settlement' | 'deny' | 'expire'
>;

export type NotificationShipmentStage = 'shipped' | 'in_transit' | 'delivered';

export interface NotificationOrderPayload {
  orderId: string;
}

export type OrderProcessingNotificationPayload = NotificationOrderPayload;

export type OrderAwaitingShipmentNotificationPayload = NotificationOrderPayload;

export interface PaymentSettlementNotificationPayload extends NotificationOrderPayload {
  paymentStatus?: Extract<NotificationPaymentStatus, 'settlement'>;
}

export interface PaymentFailedOrExpiredNotificationPayload extends NotificationOrderPayload {
  paymentStatus?: Extract<NotificationPaymentStatus, 'deny' | 'expire'>;
}

export interface OrderShippedNotificationPayload extends NotificationOrderPayload {
  shipmentStage?: Extract<NotificationShipmentStage, 'shipped' | 'in_transit'>;
}

export interface OrderDeliveredActionRequiredNotificationPayload extends NotificationOrderPayload {
  shipmentStage?: Extract<NotificationShipmentStage, 'delivered'>;
}

export type OrderCompletedNotificationPayload = NotificationOrderPayload;

export interface NotificationPayloadByType {
  payment_settlement: PaymentSettlementNotificationPayload;
  payment_failed_or_expired: PaymentFailedOrExpiredNotificationPayload;
  order_processing: OrderProcessingNotificationPayload;
  order_awaiting_shipment: OrderAwaitingShipmentNotificationPayload;
  order_shipped: OrderShippedNotificationPayload;
  order_delivered_action_required: OrderDeliveredActionRequiredNotificationPayload;
  order_completed: OrderCompletedNotificationPayload;
}

export type NotificationPayload<T extends NotificationType = NotificationType> =
  NotificationPayloadByType[T];

export interface NotificationRow extends Omit<Tables<'notifications'>, 'type'> {
  type: NotificationType;
}

export type NotificationRouteSource = Pick<NotificationRow, 'type' | 'cta_route' | 'data'>;

export type NotificationNavigationTarget<T extends NotificationType = NotificationType> =
  T extends NotificationType
    ? {
        type: T;
        pathname: NotificationRouteTargetForType<T>;
        params: NotificationRouteParams<NotificationRouteTargetForType<T>>;
      }
    : never;

export type ParsedNotificationRoute<T extends NotificationType = NotificationType> =
  T extends NotificationType
    ? {
        kind: 'route';
        route: NotificationNavigationTarget<T>;
        payload: NotificationPayload<T>;
      }
    : never;

export type NotificationRouteFallbackReason =
  | 'missing_cta_route'
  | 'unsupported_cta_route'
  | 'unsupported_type_route_combination'
  | 'invalid_payload';

export interface NotificationRouteFallback {
  kind: 'fallback';
  reason: NotificationRouteFallbackReason;
  fallbackRoute: NotificationFallbackRoute;
}

export type NotificationRouteParseResult = ParsedNotificationRoute | NotificationRouteFallback;

export const NOTIFICATION_ROUTE_TARGET_BY_TYPE = {
  payment_settlement: 'orders/order-detail/[orderId]',
  payment_failed_or_expired: 'orders/order-detail/[orderId]',
  order_processing: 'orders/order-detail/[orderId]',
  order_awaiting_shipment: 'orders/order-detail/[orderId]',
  order_shipped: 'orders/track-shipment/[orderId]',
  order_delivered_action_required: 'orders/order-detail/[orderId]',
  order_completed: 'orders/order-detail/[orderId]',
} as const satisfies NotificationRouteTargetByType;

const NOTIFICATION_ROUTE_SET = new Set<string>(NOTIFICATION_ROUTE_TARGETS);

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseNotificationDataRecord(value: Json): Record<string, Json | undefined> | null {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return null;
  }

  return value;
}

function parseNotificationPaymentStatus(
  value: Json | undefined,
): NotificationPaymentStatus | undefined {
  if (value === 'settlement' || value === 'deny' || value === 'expire') {
    return value;
  }

  return undefined;
}

function parseNotificationShipmentStage(
  value: Json | undefined,
): NotificationShipmentStage | undefined {
  if (value === 'shipped' || value === 'in_transit' || value === 'delivered') {
    return value;
  }

  return undefined;
}

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationType);
}

export function isNotificationRouteTarget(value: string): value is NotificationRouteTarget {
  const normalizedValue = value.startsWith('/') ? value.slice(1) : value;
  return NOTIFICATION_ROUTE_SET.has(normalizedValue);
}

function normalizeNotificationRouteTargetValue(value: string): NotificationRouteTarget | null {
  const normalizedValue = value.startsWith('/') ? value.slice(1) : value;
  return isNotificationRouteTarget(normalizedValue) ? normalizedValue : null;
}

export function parseNotificationPayload<T extends NotificationType>(
  type: T,
  data: Json,
): NotificationPayload<T> | null {
  const record = parseNotificationDataRecord(data);

  if (!record) {
    return null;
  }

  const orderId = normalizeNonEmptyString(record.orderId);

  if (!orderId) {
    return null;
  }

  const paymentStatus = parseNotificationPaymentStatus(record.paymentStatus);
  const shipmentStage = parseNotificationShipmentStage(record.shipmentStage);

  switch (type) {
    case 'payment_settlement':
      if (paymentStatus && paymentStatus !== 'settlement') {
        return null;
      }

      return {
        orderId,
        ...(paymentStatus ? { paymentStatus } : {}),
      } as NotificationPayload<T>;

    case 'payment_failed_or_expired':
      if (paymentStatus && paymentStatus !== 'deny' && paymentStatus !== 'expire') {
        return null;
      }

      return {
        orderId,
        ...(paymentStatus ? { paymentStatus } : {}),
      } as NotificationPayload<T>;

    case 'order_processing':
      return { orderId } as NotificationPayload<T>;

    case 'order_awaiting_shipment':
      return { orderId } as NotificationPayload<T>;

    case 'order_shipped':
      if (shipmentStage && shipmentStage !== 'shipped' && shipmentStage !== 'in_transit') {
        return null;
      }

      return {
        orderId,
        ...(shipmentStage ? { shipmentStage } : {}),
      } as NotificationPayload<T>;

    case 'order_delivered_action_required':
      if (shipmentStage && shipmentStage !== 'delivered') {
        return null;
      }

      return {
        orderId,
        ...(shipmentStage ? { shipmentStage } : {}),
      } as NotificationPayload<T>;

    case 'order_completed':
      return { orderId } as NotificationPayload<T>;

    default: {
      const exhaustiveType: never = type;
      return exhaustiveType;
    }
  }
}

export function createNotificationNavigationTarget<T extends NotificationType>(
  type: T,
  payload: NotificationPayload<T>,
): NotificationNavigationTarget<T>;
export function createNotificationNavigationTarget<T extends NotificationType>(
  type: T,
  payload: NotificationPayload<T>,
): NotificationNavigationTarget<T> {
  if (type === 'order_shipped') {
    return {
      type,
      pathname: 'orders/track-shipment/[orderId]',
      params: { orderId: payload.orderId },
    } as NotificationNavigationTarget<T>;
  }

  return {
    type,
    pathname: 'orders/order-detail/[orderId]',
    params: { orderId: payload.orderId },
  } as NotificationNavigationTarget<T>;
}

export function parseNotificationRoute(
  notification: NotificationRouteSource,
): NotificationRouteParseResult {
  const ctaRoute = notification.cta_route;

  if (!ctaRoute) {
    return {
      kind: 'fallback',
      reason: 'missing_cta_route',
      fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
    };
  }

  const normalizedRoute = normalizeNotificationRouteTargetValue(ctaRoute);

  if (!normalizedRoute) {
    return {
      kind: 'fallback',
      reason: 'unsupported_cta_route',
      fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
    };
  }

  const expectedRoute = NOTIFICATION_ROUTE_TARGET_BY_TYPE[notification.type];

  if (normalizedRoute !== expectedRoute) {
    return {
      kind: 'fallback',
      reason: 'unsupported_type_route_combination',
      fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
    };
  }

  switch (notification.type) {
    case 'payment_settlement': {
      const payload = parseNotificationPayload('payment_settlement', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'payment_settlement',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'payment_failed_or_expired': {
      const payload = parseNotificationPayload('payment_failed_or_expired', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'payment_failed_or_expired',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'order_processing': {
      const payload = parseNotificationPayload('order_processing', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'order_processing',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'order_awaiting_shipment': {
      const payload = parseNotificationPayload('order_awaiting_shipment', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'order_awaiting_shipment',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'order_shipped': {
      const payload = parseNotificationPayload('order_shipped', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'order_shipped',
          pathname: 'orders/track-shipment/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'order_delivered_action_required': {
      const payload = parseNotificationPayload(
        'order_delivered_action_required',
        notification.data,
      );

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'order_delivered_action_required',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    case 'order_completed': {
      const payload = parseNotificationPayload('order_completed', notification.data);

      if (!payload) {
        return {
          kind: 'fallback',
          reason: 'invalid_payload',
          fallbackRoute: NOTIFICATIONS_FALLBACK_ROUTE,
        };
      }

      return {
        kind: 'route',
        route: {
          type: 'order_completed',
          pathname: 'orders/order-detail/[orderId]',
          params: { orderId: payload.orderId },
        },
        payload,
      };
    }

    default: {
      const exhaustiveType: never = notification.type;
      return exhaustiveType;
    }
  }
}

export function buildNotificationTypedHref(target: NotificationNavigationTarget): TypedHref {
  if (target.pathname === 'orders/order-detail/[orderId]') {
    return {
      pathname: '/orders/order-detail/[orderId]',
      params: target.params,
    };
  }

  return {
    pathname: '/orders/track-shipment/[orderId]',
    params: target.params,
  };
}
