# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-26
**Commit:** 83c823c
**Branch:** dev

## OVERVIEW

Expo SDK 54 pharmacy e-commerce app (React Native 0.81.5, React 19.1, TypeScript strict). Multi-platform (iOS, Android, Web) with Tamagui UI, Redux Toolkit state, Supabase auth/backend, and co-located edge functions. New Architecture enabled.

## STRUCTURE

```
./
├── app/                # Expo Router v6 routes (THIN RE-EXPORTS to scenes/)
├── scenes/             # Actual screen components (Home, Auth, Cart, Orders, Profile)
├── components/         # Reusable UI — see components/AGENTS.md
│   ├── elements/       # Atomic UI components (Button, Avatar, FormInput...)
│   ├── layouts/        # Layout components (TabBarIconWithPill)
│   ├── icons/          # Custom icon components
│   ├── AddressFormSheet/  # Complex composite (address picker + map)
│   └── MapPin/         # Map integration component
├── services/           # API abstraction layer — see services/AGENTS.md
├── hooks/              # Custom React hooks (auth, address, cart, home data, theme)
├── slices/             # Redux Toolkit slices (single app.slice.ts)
├── providers/          # AuthProvider + Redux store provider
├── types/              # TypeScript types (address, auth, cart, order, product, shipping, user, supabase)
├── constants/          # App constants (address, auth, ui)
├── utils/              # Utilities (config, crypto, device, fonts, images, store, supabase client)
├── supabase/           # Edge functions + migrations — see supabase/AGENTS.md
├── assets/             # Poppins fonts + images
├── android/            # Native Android project (local dev builds)
├── test-utils/         # renderWithTheme.tsx (Tamagui test wrapper)
└── tamagui.config.ts   # Tamagui theme config
```

## WHERE TO LOOK

| Task               | Location                                                 | Notes                                                            |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Add a new screen   | `scenes/[name]/` + `app/[group]/[name].tsx`              | Route file re-exports from scene                                 |
| Add a new route    | `app/[group]/`                                           | Expo Router file-based; update `_layout.tsx` if tab/stack needed |
| Add a UI component | `components/elements/[Name]/`                            | Follow `Name.tsx` + `index.ts` + `Name.test.tsx` pattern         |
| Add an API call    | `services/[domain].service.ts`                           | Never call Supabase directly from components                     |
| Add Redux state    | `slices/app.slice.ts` → register in `utils/store.ts`     | Single slice currently                                           |
| Add a custom hook  | `hooks/use[Name].ts`                                     | Co-locate test as `use[Name].test.ts`                            |
| Add a type         | `types/[domain].types.ts`                                | One file per domain                                              |
| Route param types  | `types/routes.types.ts`                                  | Keep route params in sync with `useLocalSearchParams` usage      |
| Add a constant     | `constants/[domain].constants.ts`                        |                                                                  |
| Auth flow          | `providers/AuthProvider.tsx` + `app/_layout.tsx`         | Auth guard in root layout useEffect                              |
| Backend logic      | `supabase/functions/[name]/index.ts`                     | Deno runtime, see supabase/AGENTS.md                             |
| Env variables      | `.env.dev` → `app.config.ts` (extra) → `utils/config.ts` | dotenvx managed                                                  |
| CI/CD              | `.github/workflows/test.yml` + `preview.yml`             | Tests on PR; EAS Update on push                                  |

## ARCHITECTURE PATTERNS

**Routing: Two-Layer Re-Export**

- `app/` files are thin wrappers: `export { default } from '@/scenes/[name]'`
- Actual screen logic lives in `scenes/`
- Navigation: Bottom tabs (home, orders, profile) + Stack per tab + route groups

**Auth Guard (Centralized + Route-Level)**

- `app/_layout.tsx` useEffect watches `checked` + `loggedIn` from AuthProvider
- Protected stacks are wrapped with `withAuthGuard` for defense-in-depth rendering guard
- Protected routes: home, orders, profile, cart → redirect to `/login`
- Auth screens → redirect to `/home` when authenticated

**Service Layer (Mandatory)**

- ALL Supabase calls go through `services/*.service.ts`
- Components/hooks never import `supabase` client directly
- Services return typed results, handle errors with `__DEV__` console guards

**State: Redux Toolkit**

- Single `slices/app.slice.ts` for global state
- Logger middleware active in development
- AuthProvider manages session state separately via React context

## CONVENTIONS

- **Path alias**: `@/*` maps to project root (`./`)
- **File naming**: PascalCase for components (`Button.tsx`), camelCase for utils/services (`auth.service.ts`)
- **Component structure**: `Name/Name.tsx` + `Name/index.ts` (barrel) + `Name/Name.test.tsx`
- **Tests**: Co-located with source (`.test.ts(x)` suffix), use `renderWithTheme` for Tamagui components
- **Console logging**: ALWAYS guard with `if (__DEV__)` in app code
- **ESLint**: Flat config (`eslint.config.js`) — expo + prettier
- **Prettier**: `singleQuote`, `trailingComma: all`, `printWidth: 100`, `bracketSameLine: true`, `arrowParens: avoid`
- **Pre-commit**: Husky runs lint-staged (lint --fix + format) then jest

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** call Supabase client directly from components — use `services/*.service.ts`
- **NEVER** put screen logic in `app/` route files — they are re-export wrappers only
- **NEVER** use `@ts-ignore` or `as any` — zero occurrences, keep it that way
- **NEVER** use `console.log` without `__DEV__` guard in app code (edge functions are exempt)
- **NEVER** use `require()` unless platform-specific dynamic import is needed (3 approved usages exist)
- **NEVER** add Tamagui babel plugin — disabled intentionally (causes Metro issues). Tamagui runs at runtime only via metro plugin

## UNIQUE STYLES

- **UI Framework**: Tamagui (not StyleSheet, not NativeWind) — all components use Tamagui primitives
- **Theme Mode**: Tamagui `brand` + `brand_dark`, selected automatically from system color scheme
- **Language**: Indonesian UI labels (`Beranda`, `Pesanan`, `Akun`) — backend/code in English
- **Mocking pattern**: Inline `jest.mock()` in each test file, no `__mocks__/` directories
- **Fake timers**: Global in jest.setup.js for Reanimated/Animated components
- **act() suppression**: jest.setup.js suppresses act warnings for Tamagui Animated + Icon components
- **Crypto polyfill**: Custom `utils/cryptoPolyfill.ts` for React Native crypto support
- **LargeSecureStore**: Custom secure storage wrapper in `utils/LargeSecureStore.ts`

## COMMANDS

```bash
# Development
npm run dev                    # All platforms (dotenvx .env.dev)
npm run dev:ios                # iOS only
npm run dev:android            # Android only
npm run dev:web                # Web only

# Quality
npm run lint                   # ESLint (expo lint)
npm run format                 # Prettier write
npm run format:check           # Prettier check only
npm run test                   # Jest (--verbose --passWithNoTests)
npm run test:watch             # Jest watch mode

# Build & Deploy
npm run dev:build:mobile       # EAS build (iOS + Android)
npm run dev:build:web          # Export web static
npm run dev:deploy:web         # Build + deploy to EAS Hosting

# Environment
npm run dev:secret:push        # Push .env.dev to EAS secrets
npm run dev:config:public      # Show public config
npm run dev:doctor             # Expo health check
```

## NOTES

- **Node 20.x** required (specified in `eas.json` build config)
- **`legacy-peer-deps=true`** in `.npmrc` — required for dependency resolution
- **17 Supabase migrations** in `supabase/migrations/` — schema history
- **Coverage** enabled by default for: components, hooks, scenes, services, slices, utils, providers
- **No E2E tests** — only unit/integration via Jest + React Testing Library
- **Android native dir** exists for local dev builds — EAS handles production builds
- **`app.json` owner**: `"i-have-no-company"` — update before publishing
