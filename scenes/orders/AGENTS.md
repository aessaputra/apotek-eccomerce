# ORDER SCENES

Order screens are a hook-driven family: list tabs, detail, shipment tracking, and success states. Keep screens focused on presentation/orchestration and push data/state logic into the existing order hooks.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Main order list shell | `Orders.tsx` | Top-level order tab entry |
| Status-specific lists | `PackingOrders.tsx`, `ShippedOrders.tsx`, `CompletedOrders.tsx`, `UnpaidOrders.tsx` | Thin status wrappers over shared hook patterns |
| Order detail | `OrderDetail.tsx` | Primary order-detail UI and CTA states |
| Shipment tracking | `TrackShipment.tsx` | Tracking/status presentation |
| Post-checkout success | `OrderSuccess.tsx` | Success-state UX after checkout |

## CONVENTIONS

- Prefer the existing order hooks (`useOrdersPaginated`, `useOrdersByStatusPaginated`, `useOrderDetail`, `useOrderTracking`, `useUnpaidOrdersPaginated`) instead of recreating data-fetching logic in scenes.
- Keep status-tab screens thin; shared pagination, refresh, and cache behavior belong in hooks/services.
- `OrderDetail.tsx` is the densest screen in this directory; when changing CTAs or status presentation, confirm the backing hook and service contract still match.
- Route params for order detail/tracking should stay synchronized with Expo Router wrappers under `app/(tabs)/orders/`.

## TESTING

- Scene tests live in `__tests__/scenes/` and already cover the status screens, detail flow, and success states.
- Mock order hooks/services at the boundary instead of duplicating pagination or transport behavior in screen tests.

## ANTI-PATTERNS

- **NEVER** embed new Supabase queries directly in these screens.
- **NEVER** fork the status-screen pattern when a shared hook can express the new state.
- **NEVER** change order-status UX in one screen without checking the other status wrappers and `OrderDetail.tsx` for consistency.
