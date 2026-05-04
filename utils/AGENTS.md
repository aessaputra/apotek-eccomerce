# UTILS

Cross-cutting infrastructure helpers. This directory owns singleton clients, config access, theme bridges, asset loading, retry/deduplication, notification runtime guards, and storage adapters.

## STRUCTURE

```
utils/
├── supabase.ts              # Single typed Supabase client
├── cryptoPolyfill.ts        # PKCE S256 WebCrypto polyfill for native
├── LargeSecureStore.ts      # AES-backed auth storage adapter
├── config.ts                # Runtime Expo extra bridge
├── store.ts                 # Redux store setup
├── theme.ts                 # Non-Tamagui theme bridge
├── fonts.ts / images.ts     # Splash-gated asset preload
├── error.ts / retry.ts      # Error classification and retry stack
├── requestDeduplication.ts  # Abortable in-flight request dedupe
├── notifications.ts         # Lazy Expo notification bootstrap
└── notificationRouting.ts   # Notification payload → typed href
```

## WHERE TO LOOK

| Task | File | Notes |
| --- | --- | --- |
| Supabase client/storage | `supabase.ts`, `LargeSecureStore.ts`, `cryptoPolyfill.ts` | Import order is critical |
| Runtime config | `config.ts` + `app.config.ts` | Add public env values in both files and `.env.*.example` |
| Redux store | `store.ts` + `slices/app.slice.ts` | Single app slice; logger only in dev |
| Theme bridge | `theme.ts`, `themes.ts`, `constants/ui.ts` | Non-Tamagui APIs need fallbacks |
| Asset splash gate | `fonts.ts`, `images.ts`, `app/_layout.tsx` | Prevent Android cold-start fallback fonts |
| Network resilience | `error.ts`, `retry.ts`, `requestDeduplication.ts` | Reuse instead of duplicating retry/error logic |
| Notifications | `notifications.ts`, `notificationRouting.ts` | Lazy import native modules; web-safe guards |

## CRITICAL CONSTRAINTS

- `utils/supabase.ts` must import `@/utils/cryptoPolyfill` first, before `@supabase/supabase-js`.
- `react-native-url-polyfill/auto` must remain part of Supabase setup.
- `config.ts` is the only runtime accessor for `Constants.expoConfig?.extra`.
- `themes.ts`, `constants/ui.ts` fallbacks, and `utils/theme.ts` must stay in sync.
- `notifications.ts` intentionally lazy-loads `expo-notifications` and `expo-device`; do not top-level import them for shared runtime code.
- `requestDeduplication.ts` owns abortable in-flight request policy (`dedupe` vs `replace`).

## ANTI-PATTERNS

- **NEVER** create another Supabase client or bypass `utils/supabase.ts`.
- **NEVER** add env values only to `app.config.ts` or only to `config.ts`.
- **NEVER** use `getThemeColor()` inside Tamagui components; use token props.
- **NEVER** add theme tokens without updating `THEME_FALLBACKS` and `DARK_THEME_FALLBACKS`.
- **NEVER** duplicate retry, abort, or error translation logic in services when `utils/error.ts` and `utils/retry.ts` fit.
- **NEVER** let storage adapter methods throw unhandled errors; GoTrue calls some storage reads outside its own try/catch.
