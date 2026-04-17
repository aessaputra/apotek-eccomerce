# SERVICES

Service-layer boundary for Supabase queries, edge-function calls, and backend integration. Components, scenes, and most hooks should depend on this layer rather than reaching for infra clients directly.

## STRUCTURE

```
services/
├── index.ts                  # Public barrel
├── supabase.service.ts       # Low-level Supabase helpers
├── auth.service.ts           # Auth + OAuth flow
├── user.service.ts           # User/profile lookup helpers
├── profile.service.ts        # Profile CRUD
├── address.service.ts        # Address CRUD + defaults
├── regional.service.ts       # Province/city/district data
├── googlePlaces.service.ts   # Google Places integration
├── home.service.ts           # Categories, products, banners
├── cart.service.ts           # Cart queries + realtime helpers
├── order.service.ts          # Order history/detail state
├── checkout.service.ts       # Checkout + payment bootstrap
└── shipping.service.ts       # Shipping quote integration
```

## WHERE TO LOOK

| Task              | File                                         | Notes                                             |
| ----------------- | -------------------------------------------- | ------------------------------------------------- |
| Auth/session flow | `auth.service.ts`                            | Web/native OAuth differences live here            |
| Product/home data | `home.service.ts`                            | Categories, banners, product detail queries       |
| Cart lifecycle    | `cart.service.ts`                            | Fetching, mutation, realtime subscription helpers |
| Order state       | `order.service.ts`                           | Status mapping, detail/history fetches            |
| Checkout/payment  | `checkout.service.ts`                        | Payment bootstrap and edge-function calls         |
| Shipping quotes   | `shipping.service.ts`                        | Courier quote integration                         |
| Address data      | `address.service.ts` + `regional.service.ts` | Saved addresses plus region lookup                |

## CONVENTIONS

- One service file per business domain.
- Import the client from `@/utils/supabase`; do not construct ad hoc Supabase clients.
- Prefer domain types from `@/types/*` and generated table types from `@/types/supabase`.
- Keep low-level query shaping, normalization, retry behavior, and transport concerns in services.
- Re-export public service APIs through `services/index.ts` when they are intended for broad use.
- Service logging should stay behind `if (__DEV__)` guards.

## TESTING

- Service tests live in `__tests__/services/`.
- Mock Supabase and external integrations inline in each test file.
- Test observable behavior at the service boundary: returned data shape, error translation, retry/abort behavior, and realtime wiring.

## ANTI-PATTERNS

- **NEVER** call Supabase directly from scenes or components when a service belongs here.
- **NEVER** skip the barrel export for a widely shared service helper.
- **NEVER** mix presentation concerns into this directory.
