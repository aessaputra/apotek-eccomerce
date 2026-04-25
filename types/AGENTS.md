# TYPES

Domain contracts, route params, notification routing types, and generated Supabase database types live here.

## STRUCTURE

```
types/
├── supabase.ts       # Generated database types — do not hand-edit
├── routes.types.ts   # Expo Router route params and typed href contracts
├── notification.ts   # Notification payload parsing + route mapping contracts
├── cart.ts           # Cart items, snapshots, summaries
├── order.ts          # Order/status/detail contracts
├── payment.ts        # Payment result and redirect status contracts
├── shipping.ts       # Shipping rates/tracking contracts
└── *.ts              # Domain-specific data shapes
```

## WHERE TO LOOK

| Task | File | Notes |
| --- | --- | --- |
| Supabase table/view/function shape | `supabase.ts` | Generated artifact; regenerate instead of editing |
| Route params | `routes.types.ts` | Keep in sync with `app/` route files and scene parsing |
| Notification deep links | `notification.ts` | Exhaustive type-to-route parsing; used by `utils/notificationRouting.ts` |
| Cart/checkout types | `cart.ts`, `payment.ts`, `shipping.ts` | Shared by cart scene, hooks, and services |
| Orders | `order.ts` | Keep status labels/contracts aligned with `services/order.service.ts` |

## CONVENTIONS

- Prefer domain types from `@/types/*` over duplicating inline object shapes.
- Keep route params narrow and serializable; Expo Router params are strings or string arrays at runtime.
- Notification route parsing is both runtime validation and type contract; add new notification types exhaustively.
- Generated Supabase types are consumed by `utils/supabase.ts` for typed client inference.

## ANTI-PATTERNS

- **NEVER** hand-edit `types/supabase.ts`; regenerate from Supabase when schema changes.
- **NEVER** add an `app/` dynamic route without updating `routes.types.ts`.
- **NEVER** parse notification payloads ad hoc in scenes; use `types/notification.ts` plus `utils/notificationRouting.ts`.
- **NEVER** weaken route/domain types with broad catch-all records when a domain contract exists.
