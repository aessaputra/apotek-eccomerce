# COMPONENTS

Tamagui-based component library. All UI uses Tamagui primitives (`XStack`, `YStack`, `Text`, `GetProps`) — never raw `StyleSheet` or NativeWind.

## STRUCTURE

```
components/
├── elements/              # Atomic UI (23 components)
│   ├── Button/            # Primary CTA, themed with $primary
│   ├── FormInput/         # Text input with label + error
│   ├── EmailInput/        # Email-specific input
│   ├── PasswordInput/     # Password with show/hide toggle
│   ├── Avatar/            # User avatar with gradient fallback
│   ├── BottomSheet/       # @gorhom/bottom-sheet wrapper
│   ├── GradientButton/    # Linear gradient CTA
│   ├── Image/             # Expo Image wrapper
│   ├── ProductCard/       # Product display card
│   ├── ProductImageGallery/ # Swipeable image gallery
│   ├── CartItemRow/       # Single cart item display
│   ├── CartSummary/       # Cart total/subtotal
│   ├── CartLoadingSkeleton/ # Cart loading state
│   ├── EmptyCartState/    # Empty cart placeholder
│   ├── QuantitySelector/  # +/- quantity control
│   ├── AddressCard/       # Address display card
│   ├── CategoryItem/      # Category chip/button
│   ├── DotIndicators/     # Carousel page indicators
│   ├── ErrorMessage/      # Error display
│   ├── OAuthButton/       # Google OAuth button
│   ├── StickyBottomBar/   # Fixed bottom action bar
│   ├── AppAlertDialog/    # Confirmation dialog
│   └── SearchProductGrid.tsx  # (exception: no folder)
├── AddressFormSheet/      # Complex: address form + area picker + map
├── AreaPicker/            # Area/district selector
├── MapPin/                # Map pin with react-native-maps (dynamic require for web)
├── layouts/               # Layout components
│   └── TabBarIconWithPill/ # Tab bar icon with notification badge
└── icons/                 # Custom icon components
```

## WHERE TO LOOK

| Task                  | Location              | Notes                                                  |
| --------------------- | --------------------- | ------------------------------------------------------ |
| Add atomic component  | `elements/[Name]/`    | Create `Name.tsx` + `index.ts` + `Name.test.tsx`       |
| Add complex composite | Root of `components/` | Only for multi-file composites (like AddressFormSheet) |
| Add layout component  | `layouts/[Name]/`     | Navigation/structural components                       |
| Add custom icon       | `icons/`              | SVG-based icon components                              |

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
