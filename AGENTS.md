# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-30
**Commit:** 29c1a91
**Branch:** dev

## OVERVIEW

Expo SDK 54 pharmacy e-commerce app built with React Native 0.81.5, React 19.1, TypeScript strict mode, Expo Router v6, Tamagui 1.144, Redux Toolkit, Zustand, TanStack Query, and Supabase. It targets iOS, Android, and Web with dotenvx-managed env wiring, EAS Update/Build/Hosting flows, centralized Jest coverage, and native Android checked in.

## STRUCTURE

```
./
├── app/                # Expo Router route wrappers — see app/AGENTS.md
├── scenes/             # Screen orchestration — see scenes/AGENTS.md
├── components/         # Tamagui reusable UI — see components/AGENTS.md
├── services/           # Supabase/backend boundary — see services/AGENTS.md
├── hooks/              # Stateful orchestration — see hooks/AGENTS.md
├── providers/          # Provider stack — see providers/AGENTS.md
├── constants/          # Domain constants + UI/theme fallbacks — see constants/AGENTS.md
├── utils/              # Infra helpers — see utils/AGENTS.md
├── types/              # Domain, route, generated Supabase types — see types/AGENTS.md
├── __tests__/          # Centralized Jest tests — see __tests__/AGENTS.md
├── .github/workflows/  # CI and EAS Update workflows — see .github/workflows/AGENTS.md
└── android/            # Checked-in native Android project — see android/AGENTS.md
```

## CHILD AGENTS

- `app/AGENTS.md` — route group wrappers, protected-route sync, thin-route rules.
- `components/AGENTS.md` — Tamagui component shape, UI-only boundaries.
- `components/AddressForm/AGENTS.md` — address form composite, suggestion list, default toggle.
- `components/MapPin/AGENTS.md` — native map picker, Expo Location, web-safe dynamic map loading.
- `services/AGENTS.md` — Supabase, edge functions, notification service, service return patterns.
- `hooks/AGENTS.md` — reusable async state machines and hook export contracts.
- `providers/AGENTS.md` — provider order, auth bootstrap, query-client lifetime.
- `utils/AGENTS.md` — Supabase/config/theme/storage/retry infrastructure gotchas.
- `types/AGENTS.md` — generated Supabase types and notification route contracts.
- `constants/AGENTS.md` — tab metadata, courier/address constants, theme fallback sync.
- `scenes/AGENTS.md` — screen orchestration and feature map.
- `scenes/auth/AGENTS.md` — login/signup/reset/verify-email helper contracts.
- `scenes/home/AGENTS.md` — home feed layout, banner CTA, category/product sections.
- `scenes/cart/AGENTS.md` — cart, checkout review, payment WebView, persisted checkout session.
- `scenes/profile/AGENTS.md` — profile/address and area-picker state machine.
- `scenes/orders/AGENTS.md` — order list/detail/status-tab conventions.
- `__tests__/AGENTS.md` — centralized Jest layout, mocks, validation expectations.
- `.github/workflows/AGENTS.md` — test CI, preview branch/env mapping, EAS Update quirks.
- `android/AGENTS.md` — Gradle, dev namespace, Hermes/New Architecture constraints.

Read the closest child file before editing inside that directory. Root covers global rules only.

## WHERE TO LOOK

| Task                       | Location                                                             | Notes                                                               |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Add a route                | `app/[group]/`                                                       | Keep route files thin; update `PROTECTED_ROUTE_GROUPS` if protected |
| Add a screen               | `scenes/[feature]/`                                                  | Screen implementation stays out of `app/`                           |
| Add UI                     | `components/elements/` or `components/layouts/`                      | Tamagui primitives and tokens only                                  |
| Add backend/data call      | `services/[domain].service.ts`                                       | Use `@/utils/supabase`; no ad hoc clients                           |
| Add reusable screen logic  | `hooks/use[Name].ts`                                                 | Compose services, app state, navigation, side effects               |
| Add auth/session behavior  | `providers/AuthProvider.tsx` + `services/auth.service.ts`            | Beware GoTrue lock/deadlock notes                                   |
| Add notifications behavior | `services/notification.service.ts` + `hooks/useNotifications.ts`     | Service is imported directly where needed                           |
| Add state/cache            | `slices/app.slice.ts`, `utils/store.ts`, `stores/areaPickerStore.ts` | Redux global; Zustand narrow/local                                  |
| Add route/domain types     | `types/[domain].ts` + `types/routes.types.ts`                        | Do not hand-edit generated `types/supabase.ts`                      |
| Add env/config             | `app.config.ts` + `utils/config.ts` + `.env.*.example`               | Public env vars must be wired in all three                          |
| Add theme token            | `themes.ts` + `constants/ui.ts` + `utils/theme.ts`                   | Keep fallbacks synchronized                                         |
| Add tests                  | `__tests__/[domain]/`                                                | Centralized tests, inline mocks                                     |
| Check CI/deploy            | `.github/workflows/` + `eas.json`                                    | Test CI + EAS preview/update flows                                  |
| Check backend contract     | `/home/coder/dev/pharma/admin-panel/supabase`                        | Schema migrations + Edge Functions are backend truth                |
| Check admin operations     | `/home/coder/dev/pharma/admin-panel`                                 | Backoffice owns operational workflows and admin read models         |

## ARCHITECTURE PATTERNS

### Routing

- `package.json` entry is `expo-router/entry`; `app/_layout.tsx` is the true composition root.
- `app/` route files are thin wrappers/re-exports into `scenes/`.
- Allowed route-logic exceptions: `app/_layout.tsx`, `app/index.tsx`, `app/google-auth.tsx`, and `app/+native-intent.tsx`.
- Protected groups are hardcoded in `app/_layout.tsx`: `['(tabs)', 'cart', 'product-details']`; protected stack layouts also use `withAuthGuard`.

### Provider composition

- `providers/Provider.tsx`: Gesture Handler → Safe Area → Redux → Tamagui → React Navigation theme.
- `providers/QueryProvider.tsx`: one long-lived QueryClient (`staleTime` 1h, `gcTime` 24h, `retry: 2`).
- `providers/AuthProvider.tsx`: session bootstrap, OAuth hash handling, role/banned checks, push-token sync, mobile token refresh.

### Service/data boundary

- `utils/supabase.ts` is the only Supabase client creator. Its crypto polyfill import must remain first.
- Services own query shaping, normalization, edge-function calls, retry/abort behavior, and error translation.
- Components and scenes should consume services/hooks, not Supabase clients.
- Public service helpers go through `services/index.ts` when shared broadly; `notification.service.ts` is a direct-use service for push-token/realtime notification flows.

### Cross-repo dependencies

- Backend Supabase repo: `/home/coder/dev/pharma/admin-panel/supabase`; read its `AGENTS.md` before schema, RLS, RPC, or Edge Function contract changes.
- Backend truth lives in `supabase/migrations/*.sql` and `supabase/functions/*`; shared Deno helpers are in `supabase/functions/_shared`.
- Frontend-relevant functions include `biteship`, `create-checkout-order`, `create-snap-token`, `confirm-midtrans-payment`, `confirm-order-received`, and `push`.
- Admin operational repo: `/home/coder/dev/pharma/admin-panel`; read root `AGENTS.md` and `src/providers/AGENTS.md` before order, catalog, banner, shipping, branding, notification, or ban-state changes.
- Admin app owns backoffice truth: order transitions/read models, product/category/home-banner CRUD, store settings, active couriers, reports, admin notifications, and customer ban/unban flows.
- Never copy admin/server secrets into frontend env; service-role, Midtrans, Biteship, Expo push, DB, and Vault secrets stay backend-only.

### State and theme split

- Redux Toolkit (`slices/app.slice.ts`) stores auth state and app-wide caches; Zustand currently owns only area-picker workflow state.
- React Query provider exists globally, but most current server-state caching is still service/hook/Redux driven.
- Tamagui themes live in `themes.ts`; `constants/ui.ts` mirrors fallbacks; `utils/theme.ts` bridges non-Tamagui/native style consumers.
- Android native config enables New Architecture, Hermes, edge-to-edge, and `softwareKeyboardLayoutMode: 'resize'`.

## CONVENTIONS

- Path alias: `@/*` points to repository root.
- Components use PascalCase and usually `Name/Name.tsx` + `index.ts`; hooks/utils/services/constants use camelCase.
- Indonesian UI copy; English code/domain names.
- Application logs must be guarded with `if (__DEV__)`; existing unguarded logs are technical debt, not a pattern to copy.
- Tests live under `__tests__/`, grouped by domain; Jest permits broader matches, but app convention is centralized tests.
- Mock inline with `jest.mock()` inside tests; no `__mocks__/` directories.
- Prettier: tab width 2, single quotes, trailing commas, print width 100, `arrowParens: avoid`, `bracketSameLine: true`.
- ESLint: flat Expo config + Prettier integration; `dist/*`, `.agents/**`, and `supabase/functions/**` ignored.
- Pre-commit: Husky runs `lint-staged`, then full Jest.

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** put real screen logic in `app/` route files outside the documented root-routing exceptions.
- **NEVER** call Supabase directly from components or scenes.
- **NEVER** add `@ts-ignore`, `@ts-expect-error`, or `as any`.
- **NEVER** use bare app logs; guard with `if (__DEV__)`.
- **NEVER** use `StyleSheet.create()` or NativeWind for core UI; use Tamagui.
- **NEVER** add the Tamagui babel plugin back into `babel.config.js`; Metro uses `@tamagui/metro-plugin`.
- **NEVER** create `__mocks__/` directories for tests.
- **NEVER** reorder the crypto polyfill import in `utils/supabase.ts`.
- **NEVER** add a public env var to only one side of `app.config.ts` / `utils/config.ts` / `.env.*.example`.
- **NEVER** add Tamagui theme tokens without syncing `THEME_FALLBACKS` / `DARK_THEME_FALLBACKS`.
- **NEVER** access `Constants.expoConfig?.extra` outside `utils/config.ts` unless documenting a narrow infrastructure exception.
- **NEVER** use `getThemeColor()` for new Tamagui token-capable props; reserve it for non-token/native style escape hatches.
- **NEVER** change checkout/order/shipping/banner/catalog contracts without checking the admin-panel Supabase migrations/functions and admin operational flows.

## COMMANDS

```bash
npm run dev                          # Expo dev server with .env.dev
npm run dev:ios|dev:android|dev:web
npm run dev:tailscale[:android|:ios] # LAN dev through Tailscale IP
npm run lint && npm run format:check && npm run test
npm run dev:build:mobile             # Push EAS secrets, then development build
npm run dev:build:web && npm run dev:serve:web
npm run dev:deploy:web               # EAS Hosting development deploy
```

## TESTING & CI NOTES

- Jest uses `jest-expo`, `jest.setup.js`, fake timers, and common native mocks; CI runs `npm ci`, format check, lint, then Jest on Node 20.x.
- Preview CI maps branches to env examples and runs EAS Update; `staging` currently references missing `.env.staging.example`.
- Preview CI installs `lightningcss-linux-x64-gnu --save-optional` after `npm ci`; preserve this Tamagui/Linux workaround.

## NOTES

- Node 20.x is required; EAS base pins Node 20.19.4; `.npmrc` enables `legacy-peer-deps=true`; env examples present: `.env.dev.example`, `.env.prod.example`.
- `google-services.json` is present at repo root and conditionally wired by `app.config.ts`.
- Native Android Gradle uses development namespace/applicationId `com.apotekecommerce.dev`; `app.config.ts` default package is `com.apotekecommerce`.
- `android/gradle.properties` still contains deprecated `expo.edgeToEdgeEnabled=true`; prefer `edgeToEdgeEnabled` / `react.edgeToEdgeEnabled` going forward.
