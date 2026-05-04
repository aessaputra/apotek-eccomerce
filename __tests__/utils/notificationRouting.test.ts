import { describe, expect, it } from '@jest/globals';
import {
  buildNotificationTypedHref,
  parseNotificationRoute,
  type NotificationRouteSource,
} from '@/types/notification';
import { resolveNotificationNavigationHref } from '@/utils/notificationRouting';

function createNotificationRouteSource(
  overrides: Partial<NotificationRouteSource> = {},
): NotificationRouteSource {
  return {
    type: 'order_processing',
    cta_route: 'orders/order-detail/[orderId]',
    data: { orderId: 'order-1' },
    ...overrides,
  };
}

describe('notification routing contract', () => {
  it('parses canonical inbox rows for the newly approved V1 processing states', () => {
    const processingRoute = parseNotificationRoute(createNotificationRouteSource());
    const awaitingShipmentRoute = parseNotificationRoute(
      createNotificationRouteSource({
        type: 'order_awaiting_shipment',
        data: { orderId: 'order-2' },
      }),
    );

    expect(processingRoute.kind).toBe('route');
    expect(awaitingShipmentRoute.kind).toBe('route');

    if (processingRoute.kind === 'route') {
      expect(buildNotificationTypedHref(processingRoute.route)).toEqual({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: 'order-1' },
      });
    }

    if (awaitingShipmentRoute.kind === 'route') {
      expect(buildNotificationTypedHref(awaitingShipmentRoute.route)).toEqual({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: 'order-2' },
      });
    }
  });

  it('resolves the live push payload shape with snake_case keys and backend route strings', () => {
    expect(
      resolveNotificationNavigationHref({
        notification_id: 'notification-77',
        type: 'order_shipped',
        cta_route: 'orders/track-shipment/[orderId]',
        data: {
          orderId: 'order-77',
          shipmentStage: 'shipped',
        },
        source_event_key: 'order_shipped:manual:order-77',
      }),
    ).toEqual({
      pathname: '/orders/track-shipment/[orderId]',
      params: { orderId: 'order-77' },
    });
  });
});
