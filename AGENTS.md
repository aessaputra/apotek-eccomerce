# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-25
**Commit:** bbc4b6c
**Branch:** dev

## OVERVIEW

Expo SDK 54 pharmacy e-commerce app built with React Native 0.81, React 19, TypeScript strict mode, Expo Router v6, Tamagui, Redux Toolkit, Zustand, TanStack Query, and Supabase. It targets iOS, Android, and Web, with EAS preview/deploy flows, dotenvx-managed env wiring, centralized Jest coverage, and native Android checked in for local builds.

## STRUCTURE

```
./
├── app/                # Expo Router route wrappers — see app/AGENTS.md
├── scenes/             # Screen orchestration — see scenes/AGENTS.md
├── components/         # Tamagui reusable UI — see components/AGENTS.md
├── services/           # Supabase/backend boundary — see services/AGENTS.md
├── hooks/              # Stateful orchestration — see hooks/AGENTS.md
├── providers/          # Provider stack — see providers/AGENTS.md
├── slices/             # Single Redux app slice and cache state
├── stores/             # Zustand local/form workflow state
├── types/              # Domain, route, generated Supabase types — see types/AGENTS.md
├── constants/          # Domain constants + UI/theme fallbacks
├── utils/              # Infra helpers — see utils/AGENTS.md
├── test-utils/         # Tamagui-aware RTL render wrapper
├── __tests__/          # Centralized Jest tests — see __tests__/AGENTS.md
├── themes.ts           # Tamagui brand/brand_dark tokens
└── tamagui.config.ts   # Poppins fonts + mobile media config
```

## CHILD AGENTS

- `app/AGENTS.md` — route group wrappers, protected-route sync, thin-route rules.
- `components/AGENTS.md` — Tamagui component shape, UI-only boundaries.
- `services/AGENTS.md` — Supabase, edge functions, service return patterns.
- `hooks/AGENTS.md` — reusable async state machines and hook export contracts.
- `providers/AGENTS.md` — provider order, auth bootstrap, query-client lifetime.
- `utils/AGENTS.md` — Supabase/config/theme/storage/retry infrastructure gotchas.
- `types/AGENTS.md` — generated Supabase types and notification route contracts.
- `scenes/AGENTS.md` — screen orchestration and feature map.
- `scenes/cart/AGENTS.md` — cart, checkout review, payment WebView, persisted checkout session.
- `scenes/profile/AGENTS.md` — profile/address and area-picker state machine.
- `scenes/orders/AGENTS.md` — order list/detail/status-tab conventions.
- `__tests__/AGENTS.md` — centralized Jest layout, mocks, validation expectations.

Read the closest child file before editing inside that directory. Root covers global rules only.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add a route | `app/[group]/` | Keep route files thin; update `PROTECTED_ROUTE_GROUPS` if protected |
| Add a screen | `scenes/[feature]/` | Screen implementation stays out of `app/` |
| Add UI | `components/elements/` or `components/layouts/` | Tamagui primitives and tokens only |
| Add backend/data call | `services/[domain].service.ts` | Use `@/utils/supabase`; no ad hoc clients |
| Add reusable screen logic | `hooks/use[Name].ts` | Compose services, app state, navigation, side effects |
| Add auth/session behavior | `providers/AuthProvider.tsx` + `services/auth.service.ts` | Beware GoTrue lock/deadlock notes |
| Add global state/cache | `slices/app.slice.ts` + `utils/store.ts` | Single Redux slice pattern currently |
| Add form-local state | `stores/areaPickerStore.ts` | Zustand reserved for local/form workflows |
| Add route/domain types | `types/[domain].ts` + `types/routes.types.ts` | Do not hand-edit generated `types/supabase.ts` |
| Add env/config | `app.config.ts` + `utils/config.ts` + `.env.*.example` | Public env vars must be wired in all three |
| Add theme token | `themes.ts` + `constants/ui.ts` | Keep fallbacks synchronized for non-Tamagui APIs |
| Add tests | `__tests__/[domain]/` | Centralized tests, inline mocks |
| Check CI/deploy | `.github/workflows/` + `eas.json` | Test CI + EAS preview/update flows |

## ARCHITECTURE PATTERNS

### Routing

- `package.json` entry is `expo-router/entry`; `app/_layout.tsx` is the true composition root.
- `app/` route files are thin wrappers/re-exports into `scenes/`.
- Protected groups are hardcoded in `app/_layout.tsx`: `['(tabs)', 'cart', 'product-details']`.
- Protected stack layouts also use `withAuthGuard` for defense in depth.
- `google-auth.tsx` is a root OAuth callback route, not inside `(auth)`.

### Provider composition

- `providers/Provider.tsx`: Gesture Handler → Safe Area → Redux → Tamagui → React Navigation theme.
- `providers/QueryProvider.tsx`: one long-lived QueryClient (`staleTime` 1h, `gcTime` 24h).
- `providers/AuthProvider.tsx`: session bootstrap, OAuth hash handling, role/banned checks, push-token sync, mobile token refresh.
- `app/_layout.tsx`: asset preload gate, splash hide, route redirects, notification deep-link handling.

### Service/data boundary

- `utils/supabase.ts` is the only Supabase client creator. Its crypto polyfill import must remain first.
- Services own query shaping, normalization, edge-function calls, retry/abort behavior, and error translation.
- Components and scenes should consume services/hooks, not Supabase clients.
- Public service helpers go through `services/index.ts` when shared across features.

### State split

- Redux Toolkit (`slices/app.slice.ts`) stores auth state and app-wide caches.
- Zustand (`stores/areaPickerStore.ts`) is narrow local/form workflow state.
- React Query provider exists globally, but most current server-state caching is still service/hook/Redux driven.

### Theme/mobile system

- Tamagui themes live in `themes.ts`; `constants/ui.ts` mirrors fallbacks for non-Tamagui consumers.
- `utils/theme.ts` bridges Tamagui theme variables into React Navigation and raw React Native style objects.
- `tamagui.config.ts` wires Poppins and custom mobile media queries (`tabXs`, `tabSm`, `tabMd`, `tabLg`, `touch`, `hoverNone`).
- Android native config enables new architecture, Hermes, edge-to-edge, and `softwareKeyboardLayoutMode: 'resize'`.

## CONVENTIONS

- Path alias: `@/*` points to repository root.
- Component files/folders use PascalCase; hooks/utils/services/constants use camelCase.
- Component source shape: `Name/Name.tsx` + `index.ts` for reusable components.
- Indonesian UI copy; English code/domain names.
- Application logs must be guarded with `if (__DEV__)`.
- Tests live under `__tests__/`, grouped by domain; no source-adjacent app tests.
- Mock inline with `jest.mock()` inside tests; no `__mocks__/` directories.
- Prettier: single quotes, trailing commas, print width 100, `arrowParens: avoid`.
- ESLint: flat Expo config + Prettier integration; `.agents/**` and `supabase/functions/**` ignored.
- Pre-commit: Husky runs `lint-staged`, then full Jest.

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** put real screen logic in `app/` route files.
- **NEVER** call Supabase directly from components or scenes.
- **NEVER** add `@ts-ignore`, `@ts-expect-error`, or `as any`.
- **NEVER** use bare `console.log` in app code.
- **NEVER** use `StyleSheet.create()` or NativeWind for core UI; use Tamagui.
- **NEVER** add the Tamagui babel plugin back into `babel.config.js`; Metro uses `@tamagui/metro-plugin`.
- **NEVER** create `__mocks__/` directories for tests.
- **NEVER** reorder the crypto polyfill import in `utils/supabase.ts`.
- **NEVER** add a public env var to only one side of `app.config.ts` / `utils/config.ts` / `.env.*.example`.
- **NEVER** add Tamagui theme tokens without syncing `THEME_FALLBACKS` / `DARK_THEME_FALLBACKS`.
- **NEVER** access `Constants.expoConfig?.extra` outside `utils/config.ts`.
- **NEVER** use `getThemeColor()` inside Tamagui components; use token props such as `color="$color"`.

## COMMANDS

```bash
npm run dev              # Expo dev server with .env.dev
npm run dev:ios|android|web
npm run lint && npm run format:check && npm run test
npm run dev:build:mobile # Push EAS secrets, then development build
npm run dev:build:web && npm run dev:serve:web
npm run dev:deploy:web
```

## TESTING & CI NOTES

- Jest uses `jest-expo`, global setup in `jest.setup.js`, fake timers, and common native mocks.
- CI runs format check, lint, then Jest; preview CI maps branches to `.env.*.example` and runs EAS Update.

## NOTES

- Node 20.x is required; EAS base pins Node 20.19.4; `.npmrc` enables `legacy-peer-deps=true`.
