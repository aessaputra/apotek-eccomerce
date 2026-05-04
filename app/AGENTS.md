# APP ROUTES

Expo Router files live here. Keep these files as route/layout wiring; screen implementation belongs in `scenes/`.

## STRUCTURE

```
app/
├── _layout.tsx          # Root providers, splash gate, auth redirects, Stack registry
├── index.tsx            # Root entry route
├── google-auth.tsx      # OAuth callback route
├── (auth)/              # Public auth stack
├── (tabs)/              # Protected bottom tabs + nested stacks
├── cart/                # Protected standalone cart stack
└── product-details/     # Protected standalone product-detail stack
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Root composition | `_layout.tsx` | Provider nesting, assets, redirects, notification routing |
| Add auth route | `(auth)/` | Public stack; routes usually re-export `scenes/auth/*` |
| Add tab screen | `(tabs)/[tab]/` | Nested stack inside the bottom tab navigator |
| Add protected stack | New top-level group | Add to `PROTECTED_ROUTE_GROUPS` and wrap layout with `withAuthGuard` |
| Add dynamic route | `[param].tsx` | Keep route param names synced with `types/routes.types.ts` |
| OAuth callback changes | `google-auth.tsx` | Root-level callback, not inside `(auth)` |

## ROUTE PATTERNS

- Route files should be one-line or thin re-exports into `scenes/`.
- Root `Stack` registers `index`, `(tabs)`, `product-details`, `cart`, `(auth)`, `google-auth`, and `+not-found`.
- `(tabs)/_layout.tsx` owns the custom bottom tab bar, MD3 pill, tab visibility, and `detachInactiveScreens: false`.
- Nested stacks under home/orders/profile/notifications are wrapped with `withAuthGuard` where protected.
- `cart/payment` is a `fullScreenModal`; keep payment UX assumptions aligned with `scenes/cart/Payment.tsx`.

## PROTECTED ROUTES

- `app/_layout.tsx` hardcodes `PROTECTED_ROUTE_GROUPS = ['(tabs)', 'cart', 'product-details']`.
- Root redirects unauthenticated users from protected groups to `/login`.
- `withAuthGuard` is still used on protected stack layouts as defense in depth.
- When adding a protected group, update both the hardcoded list and the stack layout export.

## ANTI-PATTERNS

- **NEVER** put screen state, service calls, or UI implementation in route files.
- **NEVER** add a protected route group without updating `PROTECTED_ROUTE_GROUPS`.
- **NEVER** add route params without updating `types/routes.types.ts` and related scene parsing.
- **NEVER** duplicate scene files to satisfy routing; route to the same scene when flows share UI.
