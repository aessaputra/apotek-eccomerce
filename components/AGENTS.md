# COMPONENTS

Tamagui-based component library. All UI uses Tamagui primitives (`XStack`, `YStack`, `Text`, `GetProps`) — never raw `StyleSheet` or NativeWind.

## STRUCTURE

```
components/
├── elements/              # Atomic UI (25 items)
│   ├── AddressCard/       # Address display card
│   ├── AppAlertDialog/    # Confirmation dialog
│   ├── Avatar/            # User avatar with gradient fallback
│   ├── BottomSheet/       # @gorhom/bottom-sheet wrapper
│   ├── Button/            # Primary CTA, themed with $primary
│   ├── CartItemCard/      # Cart item card component
│   ├── CartItemRow/       # Single cart item display
│   ├── CartLoadingSkeleton/ # Cart loading state
│   ├── CartSummary/       # Cart total/subtotal
│   ├── CategoryItem/      # Category chip/button
│   ├── DotIndicators/     # Carousel page indicators
│   ├── EmailInput/        # Email-specific input
│   ├── EmptyCartState/    # Empty cart placeholder
│   ├── ErrorMessage/      # Error display
│   ├── FormInput/         # Text input with label + error
│   ├── GradientButton/    # Linear gradient CTA
│   ├── HomeBanner/        # Home screen banner
│   ├── Image/             # Expo Image wrapper
│   ├── OAuthButton/       # Google OAuth button
│   ├── PasswordInput/     # Password with show/hide toggle
│   ├── ProductCard/       # Product display card
│   ├── ProductImageGallery/ # Swipeable image gallery
│   ├── QuantitySelector/  # +/- quantity control
│   ├── SearchProductGrid.tsx  # (exception: no folder)
│   └── StickyBottomBar/   # Fixed bottom action bar
├── AddressForm/           # Complex: address form + area picker + map
├── AreaPicker/            # Area/district selector
├── MapPin/                # Map pin with react-native-maps (dynamic require for web)
├── layouts/               # Layout components (11 items)
│   └── TabBarIconWithPill/ # Tab bar icon with notification badge
└── icons/                 # Custom icon components
```

## WHERE TO LOOK

| Task                  | Location              | Notes                                             |
| --------------------- | --------------------- | ------------------------------------------------- |
| Add atomic component  | `elements/[Name]/`    | Create `Name.tsx` + `index.ts` + `Name.test.tsx`  |
| Add complex composite | Root of `components/` | Only for multi-file composites (like AddressForm) |
| Add layout component  | `layouts/[Name]/`     | Navigation/structural components                  |
| Add custom icon       | `icons/`              | SVG-based icon components                         |

## CONVENTIONS

- **Tamagui primitives only**: `XStack`, `YStack`, `Text`, `Spinner`, `GetProps<typeof X>` for prop types
- **Props pattern**: Extend `GetProps<typeof TamaguiComponent>` with `Omit` for overrides
- **Constants for shared styles**: Import from `@/constants/ui` (e.g., `PRIMARY_BUTTON_TITLE_STYLE`)
- **Testing**: `renderWithTheme` from `@/test-utils` — wraps component in TamaguiProvider
- **Mocking**: Inline `jest.mock()` per test file; `require()` allowed in test mocks only
- **Platform handling**: Dynamic `require()` for platform-specific modules (e.g., react-native-maps on MapPin)

## ANTI-PATTERNS

- **NEVER** use `StyleSheet.create()` — use Tamagui styled props
- **NEVER** import Supabase client — components receive data via props or hooks
- **NEVER** create `__mocks__/` directories — use inline `jest.mock()`
