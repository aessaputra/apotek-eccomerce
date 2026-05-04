# CONSTANTS

Cross-cutting contracts for route tabs, address copy, auth errors, courier options, home banners, cart constants, and UI/theme fallbacks.

## STRUCTURE

```
constants/
├── tabs.ts                 # Bottom-tab metadata and tab visibility rules
├── ui.ts                   # Touch targets, dimensions, shadows, theme fallbacks
├── address.ts              # Address placeholders and interaction constants
├── auth.ts / auth.errors.ts# Auth labels and error mapping
├── courier.constants.ts    # Courier codes/options
├── homeBanner.constants.ts # Banner CTA route mapping
└── cart.constants.ts       # Cart/checkout constants
```

## WHERE TO LOOK

| Task                     | File                      | Notes                                                                           |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------- |
| Add/rename a tab         | `tabs.ts`                 | Keep `TabRouteName`, `TABS`, visible route order, and hidden route sets aligned |
| Hide tab bar on route    | `tabs.ts`                 | Update `HIDDEN_ROUTE_GROUPS` or `HIDDEN_ROUTE_SCREENS`; test route visibility   |
| Add theme token fallback | `ui.ts`                   | Sync both `THEME_FALLBACKS` and `DARK_THEME_FALLBACKS` from `themes.ts`         |
| Add banner CTA route     | `homeBanner.constants.ts` | Match `HomeBannerCTA` route types and Expo Router paths                         |
| Add courier/address copy | Domain file               | Keep Indonesian UI copy here when reused by multiple screens/components         |

## CONVENTIONS

- Constants are typed with `as const` when values define public unions.
- `tabs.ts` is the single source for bottom-tab labels, icons, accessibility text, and visibility.
- `ui.ts` owns reusable mobile dimensions such as `MIN_TOUCH_TARGET`, `BOTTOM_BAR_HEIGHT`, `MD3_PILL`, and tab bar sizing.
- Fallback colors are for non-Tamagui/native style consumers; Tamagui components should prefer token props.

## TESTING

- Constant tests live in `__tests__/constants/`.
- Update tab integration tests when changing tab metadata, labels, order, or hidden route rules.

## ANTI-PATTERNS

- **NEVER** add a Tamagui theme key without adding light/dark fallbacks in `ui.ts`.
- **NEVER** duplicate tab route strings in scenes/components when `tabs.ts` can own them.
- **NEVER** put service-derived runtime data in constants; keep only static contracts here.
