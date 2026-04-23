# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-23
**Commit:** a993895
**Branch:** dev

## OVERVIEW

Expo SDK 54 pharmacy e-commerce app built with React Native 0.81, React 19, TypeScript strict mode, Expo Router v6, Tamagui, Redux Toolkit, Zustand, TanStack Query, and Supabase. It targets iOS, Android, and Web, with EAS preview/deploy flows, dotenvx-managed env wiring, and centralized Jest coverage.

## STRUCTURE

```
./
├── app/                # Expo Router route files — thin wrappers only
├── scenes/             # Screen orchestration — see scenes/AGENTS.md
├── components/         # Reusable UI — see components/AGENTS.md
├── services/           # Data access + backend integration — see services/AGENTS.md
├── hooks/              # Reusable stateful orchestration — see hooks/AGENTS.md
├── providers/          # App composition root (theme, redux, auth, query)
├── slices/             # Redux Toolkit slice(s)
├── stores/             # Zustand state for local/form flows
├── types/              # Domain + route + Supabase types
├── constants/          # Domain constants + theme fallbacks
├── utils/              # Infra helpers (Supabase, config, crypto, theme, storage)
├── test-utils/         # Tamagui-aware RTL helpers
├── __tests__/          # Centralized tests grouped by domain
├── themes.ts           # Brand + dark theme tokens
└── tamagui.config.ts   # Tamagui config + media/font setup
```

## CHILD AGENTS

- `components/AGENTS.md` — Tamagui component patterns, folder shape, UI-specific rules.
- `services/AGENTS.md` — service-layer rules, Supabase boundaries, typed return patterns.
- `scenes/AGENTS.md` — screen-level orchestration, route-to-scene boundary, feature screen map.
- `hooks/AGENTS.md` — hook naming/export/testing patterns and orchestration responsibilities.
- `__tests__/AGENTS.md` — centralized test layout, mocking rules, and validation expectations.
- `scenes/profile/AGENTS.md` — address/profile flows, area-picker state machine, and route-param helpers.
- `scenes/orders/AGENTS.md` — order list/detail flow, status-tab screens, and tracking conventions.

Read the closest child file before editing inside that directory. Root covers global rules only.

## WHERE TO LOOK

| Task                      | Location                                        | Notes                                                     |
| ------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Add a route               | `app/[group]/`                                  | Keep route files thin; export screen from `scenes/`       |
| Add a screen              | `scenes/[feature]/`                             | Screen logic belongs here, not in `app/`                  |
| Add UI                    | `components/elements/` or `components/layouts/` | Use Tamagui primitives only                               |
| Add backend/data call     | `services/[domain].service.ts`                  | Components and scenes should not call Supabase directly   |
| Add reusable screen logic | `hooks/use[Name].ts`                            | Hooks compose service calls, view state, and side effects |
| Add auth wiring           | `providers/AuthProvider.tsx`                    | Session init, redirects, role/banned checks               |
| Add global state          | `slices/app.slice.ts` + `utils/store.ts`        | Single Redux slice pattern currently                      |
| Add form-local state      | `stores/areaPickerStore.ts`                     | Zustand is reserved for local/form workflows              |
| Add types                 | `types/[domain].ts` and `types/routes.types.ts` | Keep route params synchronized with router usage          |
| Add config/env wiring     | `app.config.ts` + `utils/config.ts`             | dotenvx-managed env flow                                  |
| Add tests                 | `__tests__/[domain]/`                           | Tests are centralized, not co-located                     |
| Add test helpers          | `test-utils/renderWithTheme.tsx`                | Tamagui + SafeArea render wrapper for RTL                 |
| Check CI/deploy           | `.github/workflows/` + `eas.json`               | PR test workflow + preview channel publishing             |

## ARCHITECTURE PATTERNS

### Routing: two-layer re-export

- `app/` contains Expo Router route files.
- Most route files are one-line re-exports into `scenes/`.
- Keep navigation structure in `app/`; keep screen implementation in `scenes/`.

### Service-layer boundary

- Most Supabase and backend access goes through `services/*.service.ts`.
- Components, hooks, and scenes should normally consume service functions instead of importing infra clients directly.
- `services/index.ts` is the public barrel for cross-feature service utilities.

### Provider composition

- `providers/Provider.tsx` owns the base provider stack: Gesture Handler → Safe Area → Redux → Tamagui → Navigation theme.
- `providers/QueryProvider.tsx` owns the single React Query client with long-lived cache defaults; keep query configuration there.
- `app/_layout.tsx` is the true root composition point; it wires `Provider`, `QueryProvider`, route guards, asset preloading, splash handling, and the root Expo Router stack together.
- `providers/AuthProvider.tsx` handles session bootstrap, OAuth hash handling, role/banned-user rejection, and auth state listeners.
- Root auth redirects are enforced in `app/_layout.tsx`; some protected screens also use `withAuthGuard` for defense in depth.

### Cross-cutting infrastructure

- `utils/supabase.ts` is the only place that creates the Supabase client. Its crypto polyfill import must stay first.
- `app.config.ts` populates Expo `extra`; `utils/config.ts` is the runtime bridge. Add new public env wiring in both places.
- `utils/store.ts` registers the single Redux slice and enables `redux-logger` only in dev.
- `utils/theme.ts` and `constants/ui.ts` bridge Tamagui theme values into navigation headers and non-Tamagui consumers.
- `utils/fonts.ts` and `utils/images.ts` are part of the splash gate in `app/_layout.tsx`; font/image preload changes affect cold-start behavior.

### State split

- Redux Toolkit stores app-wide state and caches in `slices/app.slice.ts`.
- Zustand is used narrowly for local workflow state such as area/address form selection.
- Hooks are a common integration point between services and scenes, but some scenes also call service functions directly.

### Theme system

- Tamagui themes live in `themes.ts` and are wired through `tamagui.config.ts`.
- `constants/ui.ts` contains shared UI constants plus theme fallbacks for non-Tamagui consumers.
- `utils/theme.ts` bridges theme values into navigation headers and non-Tamagui APIs.

## CONVENTIONS

- **Path alias:** `@/*` points to the repository root.
- **File naming:** PascalCase for component files/folders; camelCase for hooks, utils, services, constants.
- **Component source shape:** `Name/Name.tsx` + `index.ts` inside `components/`.
- **Scenes hierarchy:** feature directories under `scenes/` may keep tightly coupled helpers beside the screen when the workflow is local to one feature.
- **Logging:** guard application logs with `if (__DEV__)`.
- **Tests:** live under `__tests__/`, grouped by domain (`components`, `hooks`, `scenes`, `services`, `utils`, etc.).
- **Mocking:** use inline `jest.mock()` in tests; do not rely on global `__mocks__/` folders.
- **Formatting:** Prettier uses single quotes, trailing commas, print width 100, `arrowParens: avoid`.
- **Linting:** flat ESLint config with Expo + Prettier integration.
- **Pre-commit:** Husky runs `lint-staged` and then Jest; staged TS/TSX files are lint-fixed and formatted before tests.

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** put real screen logic in `app/` route files.
- **NEVER** call Supabase directly from components or scenes.
- **NEVER** add `@ts-ignore`, `@ts-expect-error`, or `as any`.
- **NEVER** use bare `console.log` in app code.
- **NEVER** use `StyleSheet.create()` or NativeWind for core UI; use Tamagui.
- **NEVER** add the Tamagui babel plugin back into `babel.config.js`; it is intentionally disabled.
- **NEVER** create `__mocks__/` directories for tests; use inline `jest.mock()`.
- **NEVER** reorder the crypto polyfill import ahead of the Supabase client setup in `utils/supabase.ts`.

## UNIQUE STYLES

- Indonesian UI copy, English code/domain names.
- Tamagui `brand` / `brand_dark` themes with a soft-charcoal dark palette.
- Centralized tests instead of source-adjacent tests.
- Custom `LargeSecureStore` and `cryptoPolyfill` support the React Native Supabase client.
- `utils/supabase.ts` owns client creation and imports the crypto polyfill first; do not reorder that setup casually.
- `app/_layout.tsx` keeps a hardcoded `PROTECTED_ROUTE_GROUPS` list; new protected route groups must be added there as well as wrapped with guards.

## COMMANDS

```bash
# Development
npm run dev
npm run dev:ios
npm run dev:android
npm run dev:web
npm run dev:tailscale
npm run dev:tailscale:android
npm run dev:tailscale:ios
npm run dev:doctor

# Quality
npm run lint
npm run format
npm run format:check
npm run test
npm run test:watch

# Build & deploy
npm run dev:build:mobile
npm run dev:build:web
npm run dev:serve:web
npm run dev:deploy:web
npm run dev:secret:push
npm run dev:config:public
```

## TESTING & CI NOTES

- Jest uses `jest-expo` with global fake timers and centralized setup in `jest.setup.js`.
- Use `test-utils/renderWithTheme.tsx` for Tamagui-aware rendering.
- `.lintstagedrc.json` runs `npm run lint --fix` for staged JS/TS files and `npm run format` for staged TS/TSX files.
- CI in `.github/workflows/test.yml` runs format check, lint, and Jest on PRs and branch pushes.
- Preview publishing in `.github/workflows/preview.yml` uses branch-based env selection and EAS Update.

## NOTES

- Node 20.x is required.
- `.npmrc` enables `legacy-peer-deps=true`.
- `app.config.ts` loads dotenvx-backed config and exposes public env into Expo config.
- `app.json` still contains a placeholder Expo owner and should be checked before production publishing.
- `android/` is present for local native builds; EAS handles hosted build/deploy flows.
