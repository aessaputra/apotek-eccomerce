# COMPONENT LAYOUTS

Navigation/header/bottom-action layout primitives. These components shape app chrome and screen scaffolding; keep business data and backend access outside this directory.

## STRUCTURE

```
components/layouts/
├── TabBarButton/ TabBarIcon/ TabBarIconWithPill/ TabBarLabel/ # Bottom-tab pieces
├── HeaderCartIcon/ HeaderSearchAndCart/ NotificationsHeaderActions.tsx
├── BottomActionBar/                                      # Safe-area primary action footer
└── WelcomeSheet/                                         # Environment/debug welcome sheet
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Change bottom tab metrics | `TabBarButton/`, `TabBarIcon*`, `TabBarLabel/` | Keep `utils/tabBarTypography` and `constants/ui` MD3 values aligned |
| Change header actions | `HeaderCartIcon/`, `HeaderSearchAndCart/`, `NotificationsHeaderActions.tsx` | Header callbacks come from route/screen owners |
| Change sticky footer CTA | `BottomActionBar/` | Handles safe-area inset and Android keyboard anchoring |
| Change welcome/debug sheet | `WelcomeSheet/` | Reads public config for startup diagnostics |

## CONVENTIONS

- Layouts may wrap React Navigation props and native primitives when Tamagui alone cannot express the required behavior.
- Bottom tab pieces depend on `getTabBarLayoutMetrics()` and `MD3_PILL`; update sizing, typography, and animation constants together.
- `TabBarIconWithPill` uses Reanimated shared values for active-state transitions; keep animation durations in `MD3_PILL`.
- `BottomActionBar` owns safe-area padding and Android keyboard anchoring; callers should not duplicate bottom inset math.
- Header/layout components receive callbacks and counts via props/context. They should not fetch cart, notification, or profile data directly.
- Indonesian user-facing sheet/header copy belongs here only when the layout itself owns the message.

## TESTING

- Component tests live in `__tests__/components/` and render through `renderWithTheme` when Tamagui tokens are present.
- For tab bar changes, verify route visibility and label/icon behavior through app/layout or component tests as appropriate.
- For footer/sheet changes, cover safe-area/keyboard-relevant props and accessibility labels.

## ANTI-PATTERNS

- **NEVER** move screen-specific layout state into this directory just to share a component once.
- **NEVER** change tab bar spacing without checking `constants/tabs.ts`, `constants/ui.ts`, and `utils/tabBarTypography.ts` together.
- **NEVER** create a second bottom action/footer implementation when `BottomActionBar` can be extended.
- **NEVER** fetch service data from header or tab chrome; pass prepared values from providers/hooks/screens.
