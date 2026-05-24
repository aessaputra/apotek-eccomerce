# COMPONENT ELEMENTS

Atomic Tamagui UI catalog for forms, product/order cards, status tabs, skeletons, buttons, images, and small interaction controls. These components should remain presentation-first and receive prepared data/callbacks.

## STRUCTURE

```
components/elements/
├── Button/ GradientButton/ FormInput/ PasswordInput/ EmailInput/ # Form and action controls
├── ProductCard/ ProductImageGallery/ CategoryItem/ HomeBanner/    # Catalog/home presentation
├── CartItemRow/ EmptyCartState/ QuantitySelector/                 # Cart primitives
├── OrderCard/ UnpaidOrderCard/ OrderStatusTabs/ StatusBadge/      # Order primitives
├── AddressCard/ EmptyAddressCard/                                 # Address list primitives
└── Image/ AppAlertDialog/ DotIndicators/ StickyBottomBar/         # Shared utility UI
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add button/action UI | `Button/`, `GradientButton/`, `PayNowButton/` | Preserve loading/disabled accessibility state |
| Add form input UI | `FormInput/`, `EmailInput/`, `PasswordInput/` | Keep labels, helper/error IDs, and focus/error styling aligned |
| Add product/catalog UI | `ProductCard/`, `CategoryItem/`, `HomeBanner/` | Include skeleton states when used in loading lists |
| Add cart/order UI | `CartItemRow/`, `OrderCard/`, `OrderStatusTabs/`, `StatusBadge/` | Keep status/count contracts aligned with hooks/services |
| Add address UI | `AddressCard/`, `EmptyAddressCard/` | Gesture/swipe behavior stays local to address row components |

## CONVENTIONS

- Prefer `Name/Name.tsx` plus `index.ts`; standalone files are reserved for narrow one-off primitives like `SearchProductGrid.tsx`.
- Use Tamagui primitives, tokens, and `styled()` variants. Existing `StyleSheet.flatten()` usage belongs to navigation/layout escape hatches, not this catalog.
- Prop types should be explicit and exported when callers/tests need them. When wrapping Tamagui primitives, extend `GetProps<typeof Primitive>` and `Omit` conflicting props.
- Skeleton components use `accessible={false}`, `aria-hidden`, and `pointerEvents="none"` patterns so loading placeholders stay out of screen-reader flow.
- Interactive cards/buttons must set `role` / `accessibilityRole`, Indonesian labels/hints, and disabled/busy state when relevant.
- Use `MIN_TOUCH_TARGET`, `PRIMARY_BUTTON_TITLE_STYLE`, form constants, and theme tokens from `@/constants/ui` before adding literals.
- Memoization is common for list-heavy cards; preserve stable callbacks and width props where parent lists depend on them.

## TESTING

- Tests live in `__tests__/components/` and should render with `@/test-utils/renderWithTheme`.
- For responsive/tab components, test helper math separately when exposed, as with `getOrderStatusTabWidth()`.
- Assert user-visible Indonesian copy, accessibility state, loading skeleton behavior, and callback invocation rather than Tamagui internals.

## ANTI-PATTERNS

- **NEVER** fetch Supabase, Google Places, or checkout data from element components; pass data/callbacks from scenes/hooks.
- **NEVER** add a product/order/status primitive without checking the existing domain card or badge first.
- **NEVER** remove skeleton accessibility hiding or interactive accessibility labels to simplify snapshots.
- **NEVER** use `getThemeColor()` for Tamagui-token-capable props unless bridging to native style-only APIs.
