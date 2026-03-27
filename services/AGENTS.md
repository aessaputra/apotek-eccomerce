# SERVICES

API abstraction layer. ALL Supabase calls go through here — components and hooks never import the Supabase client directly.

## STRUCTURE

```
services/
├── index.ts               # Barrel re-export (all services)
├── supabase.service.ts    # Low-level Supabase client helpers
├── auth.service.ts        # Sign in/up, Google OAuth, session, password reset
├── profile.service.ts     # User profile CRUD
├── user.service.ts        # User metadata operations
├── address.service.ts     # Address CRUD + default address
├── home.service.ts        # Categories, products, product details, cart mutations
├── cart.service.ts        # Cart operations (add, update, remove, clear)
├── order.service.ts       # Order creation + history
├── checkout.service.ts    # Checkout flow (calls edge functions)
├── shipping.service.ts    # Shipping rate calculation (Biteship)
├── address.service.test.ts
└── shipping.service.test.ts
```

## CONVENTIONS

- **Naming**: `[domain].service.ts` — one file per business domain
- **Imports**: Always `import { supabase } from '@/utils/supabase'` — never from `@supabase/supabase-js`
- **Types**: Import from `@/types/supabase` (`Tables<'table_name'>`) for row types, `@/types/[domain]` for domain types
- **Return pattern**: Return Supabase `{ data, error }` or throw — let callers handle
- **Error logging**: `if (__DEV__) console.warn(...)` — never bare `console.log`
- **Barrel exports**: Every public function re-exported via `index.ts`

## WHERE TO LOOK

| Task               | File                         | Notes                                                      |
| ------------------ | ---------------------------- | ---------------------------------------------------------- |
| Add auth method    | `auth.service.ts`            | Google OAuth uses `expo-auth-session` + `expo-web-browser` |
| Add product query  | `home.service.ts`            | Uses Supabase `.select()` with joins                       |
| Add shipping logic | `shipping.service.ts`        | Proxies to Biteship via Supabase edge function             |
| Add payment logic  | `checkout.service.ts`        | Calls `create-snap-token` edge function                    |
| Add new domain     | Create `[domain].service.ts` | Add to `index.ts` barrel                                   |

## ANTI-PATTERNS

- **NEVER** call Supabase from components/hooks — always go through a service
- **NEVER** use bare `console.log` — guard with `if (__DEV__)`
- **NEVER** skip barrel export — add new services to `index.ts`
