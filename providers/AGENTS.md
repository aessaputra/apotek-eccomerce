# PROVIDERS

App-wide composition lives here. Provider order is intentional because gestures, safe area, Redux, Tamagui, React Navigation, Query, and Auth depend on each other.

## STRUCTURE

```
providers/
├── Provider.tsx       # Gesture Handler → Safe Area → Redux → Tamagui → Navigation theme
├── QueryProvider.tsx  # Single TanStack Query client
├── AuthProvider.tsx   # Session bootstrap, OAuth, role/banned checks, push token sync
└── index.ts           # Public barrel
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Base provider order | `Provider.tsx` | Wraps Redux and Tamagui before navigation theme |
| Query cache settings | `QueryProvider.tsx` | `staleTime` 1h, `gcTime` 24h, retry disabled |
| Auth bootstrap | `AuthProvider.tsx` | 15s init timeout, OAuth hash handling, profile validation |
| Export providers | `index.ts` | Keep imports stable for `app/_layout.tsx` |

## CONVENTIONS

- `Provider.tsx` chooses Tamagui `brand` / `brand_dark` from `useColorScheme()`.
- Navigation theme colors are bridged through `BrandNavigationTheme` / `BrandNavigationDarkTheme`.
- `AuthProvider` validates profiles and rejects admins or banned users before dispatching auth state.
- Auth listener callbacks defer work with `setTimeout(0)` to avoid GoTrue lock deadlocks during OAuth code exchange.
- Push token sync only runs after a valid signed-in profile passes validation.
- Mobile token auto-refresh is tied to `AppState`; web is skipped.

## ANTI-PATTERNS

- **NEVER** reorder the base provider stack casually; gesture and safe-area providers must stay outermost.
- **NEVER** call `supabase.auth.getSession()` inside synchronous `onAuthStateChange` work; defer to avoid lock deadlocks.
- **NEVER** create a second `QueryClient` for app code; update `QueryProvider.tsx` instead.
- **NEVER** bypass `validateAndDispatch` when changing auth profile acceptance rules.
