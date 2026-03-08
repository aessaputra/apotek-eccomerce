# Apotek E-Commerce Style Guide

## Overview

This project uses Tamagui as the design-system foundation with a single branding theme.

- UI framework: Tamagui (`YStack`, `XStack`, `Text`, `Card`, `Sheet`, etc.).
- Theme mode: single fixed theme (`brand`) via `TamaguiProvider defaultTheme="brand"`.
- Styling model: token-driven props (`$primary`, `$background`, `$color`, spacing/radius tokens) plus `getThemeColor()` for non-Tamagui APIs.
- Typography base: Poppins family for body and heading, configured in `tamagui.config.ts`.
- Design goals observed in code: clinical clarity, strong readability, high touch-target usability, consistent semantic colors for status and actions.

Primary sources:

- `tamagui.config.ts`
- `themes.ts`
- `utils/theme.ts`
- `constants/ui.ts`
- `providers/Provider.tsx`
- `components/**`
- `scenes/**`

## Color Palette

The active theme is `themes.brand` in `themes.ts`. Below values are from the repository.

### Primary and Brand Colors

- `primary`: `hsla(175, 66%, 46%, 1)`
- `accent`: `hsla(175, 66%, 46%, 1)`
- `brandPrimary`: `hsla(175, 66%, 46%, 1)`
- `brandPrimarySoft`: `hsla(175, 68%, 42%, 1)`
- `brandAccent`: `yellow.yellow9`
- `brandAccentSoft`: `yellow.yellow3`
- `headerBackground`: `hsla(175, 72%, 36%, 1)`
- `tabBarPillBackground`: `hsla(175, 66%, 46%, 0.12)`
- `outlineColor`: `hsla(175, 66%, 46%, 0.3)`

Semantic usage:

- Use `primary` and `brandPrimary` for primary CTA backgrounds, active tab color, and emphasis.
- Use `brandAccent` and `brandAccentSoft` as secondary accent options for highlights and badges.
- Use `headerBackground` for stack/header background where strong contrast is needed.
- Use `tabBarPillBackground` for MD3-style active tab indicator.

### Background and Surface Colors

- `background`: `#FFFFFF`
- `backgroundHover`: `#F9FAFB`
- `backgroundPress`: `#F3F4F6`
- `surface`: `#FFFFFF`
- `surfaceSubtle`: `#F9FAFB`
- `surfaceElevated`: `#FFFFFF`
- `surfaceBorder`: `#E5E7EB`
- `backgroundDisabled`: `#F3F4F6`
- `backgroundFocus`: `#FFFFFF`

Semantic usage:

- `background` for page and root screen surfaces.
- `surface` for cards/sheets/containers.
- `surfaceSubtle` and `backgroundHover` for light emphasis and press/hover states.
- `surfaceBorder` for container and field borders.

### Text and Border Colors

- `color`: `#022C22`
- `colorHover`: `#111827`
- `colorPress`: `#052E16`
- `colorSubtle`: `#4B5563`
- `placeholderColor`: `#6B7280`
- `colorDisabled`: `#9CA3AF`
- `borderColor`: `#E5E7EB`
- `borderColorHover`: `#D1D5DB`
- `borderColorFocus`: `hsla(175, 66%, 46%, 1)`
- `borderColorDisabled`: `#E5E7EB`
- `white`: `#FFFFFF`

Semantic usage:

- `color` for primary text.
- `colorPress`/`colorSubtle` for helper text and lower-emphasis text.
- `placeholderColor` for input placeholders.
- `borderColor*` for default/hover/focus/disabled field and container borders.

### Status Colors

- `success`: `green.green9`
- `successSoft`: `green.green3`
- `warning`: `yellow.yellow9`
- `warningSoft`: `yellow.yellow3`
- `danger`: `red.red10`
- `dangerSoft`: `red.red3`
- `error`: `red.red10`
- `info`: `blue.blue9`
- `infoSoft`: `blue.blue3`

Semantic usage:

- `danger` and `dangerSoft` are used widely in validation/error/destructive actions.
- `success`, `warning`, and `info` exist as semantic tokens for future/extended states.

Notes:

- `DEFAULT_THEME_VALUES` and `THEME_FALLBACKS` provide runtime fallbacks for non-Tamagui APIs.
- A few legacy keys (`accent5`, `color5`) are still present in `THEME_FALLBACKS` and used in gradient paths.

## Typography

### Font Families

- Body font: `poppins_regular` (via Tamagui `$body`)
- Heading font: same Poppins family (via Tamagui `$heading`)

Configured in `tamagui.config.ts` with `createFont`, backed by assets in `utils/fonts.ts`:

- `poppins_regular`
- `poppins_regular_italic`
- `poppins_semiBold`
- `poppins_semiBold_italic`
- `poppins_bold`
- `poppins_bold_italic`

### Font Weights and Hierarchy

Common weights in implementation:

- 400: helper/subtext and inline annotations
- 500: field labels
- 600: button labels, menu labels, emphasized body
- 700: major section headings and card headers
- 800: auth-page hero heading emphasis

Common text sizing patterns:

- Tokenized: `$1`, `$2`, `$3`, `$4`, `$5`, `$6`, `$7`
- Numeric (explicit): `14`, `15`, `16`, `18`, `32`

Practical hierarchy used in screens/components:

- Heading: `fontSize="$6"|"$7"` or `32`, `fontWeight="700"|"800"`, `fontFamily="$heading"`
- Subheading: `fontSize="$4"|15`, `fontWeight="600"`
- Body: `fontSize="$3"|14|16`, `fontFamily="$body"`
- Caption/helper: `fontSize="$1"|"$2"|12|13`, often with `color="$colorPress"` or `opacity`

## Spacing System

The app uses Tamagui token spacing plus explicit pixel values where precision is required.

### Token Spacing in Active Use

- `$1`, `$1.5`, `$2`, `$3`, `$4`, `$5`, `$6`, `$8`, `$10`

Practical naming convention for new UI work:

- `xs`: `$1` to `$1.5`
- `sm`: `$2`
- `md`: `$3` to `$4`
- `lg`: `$5`
- `xl`: `$6` and above

Observed usage examples:

- `$1` to `$2`: tight icon/text and helper gaps
- `$3` to `$4`: card and form block spacing
- `$5` to `$6`: section-level spacing
- `$8`: larger loading or empty-state padding
- `$10`: rounded badge/pill radius contexts

### Pixel Spacing Constants

From `constants/ui.ts`:

- `MIN_TOUCH_TARGET = 48`
- `BOTTOM_BAR_HEIGHT = 64`
- `FORM_SCROLL_PADDING.COMPACT = 16`
- `FORM_SCROLL_PADDING.SPACIOUS = 24`
- `TAB_BAR_HEIGHT = 70`
- `TAB_BAR_PADDING_TOP = 8`
- `TAB_BAR_PADDING_BOTTOM = 10`
- `TAB_BAR_LABEL_SIZE = 12`

Guideline:

- Use token spacing on Tamagui components first.
- Use numeric values for strict platform/UI-spec constraints (touch targets, tab bars, icon dimensions, hard alignment points).

## Component Styles

### Buttons

Core button pattern (`components/elements/Button/Button.tsx`):

- Base: `XStack` wrapper with `backgroundColor="$primary"` by default.
- Disabled/loading: opacity reduced to `0.6`.
- Loading spinner defaults to `$white`.
- Text style seeded from `PRIMARY_BUTTON_TITLE_STYLE` (`$white`, `fontSize: 16`, `fontWeight: '600'`).

Extended patterns:

- `GradientButton`: wraps `Button` with `LinearGradient` absolute background.
- OAuth buttons: border/surface button style, hover and press scale effects.

### Inputs

Input family (`FormInput`, `EmailInput`, `PasswordInput`) uses:

- Height near `56` for single-line fields.
- Border radius `14` (numeric).
- Border state logic:
  - Error -> `$danger`
  - Focus -> `$primary`
  - Default -> `$borderColor` or `$surfaceBorder`
- Placeholder and text colors from theme via `getThemeColor()`.
- Disabled states via reduced opacity and disabled editability.

### Cards

Card usage pattern (`AddressCard`, profile menu cards, auth form cards):

- `backgroundColor="$surface"`
- `borderColor="$surfaceBorder"` or semantic override
- `borderRadius="$4"` (or numeric in auth screens)
- `pressStyle` for subtle feedback

### Tabs and Navigation

Bottom tabs (`app/(main)/(tabs)/_layout.tsx`):

- Active icon/color from `$primary`/`$brandPrimary`.
- Inactive from `$tabBarInactive`.
- Tab bar bg from `surfaceElevated` fallback chain.
- Shadow from theme `shadowColor` + platform-specific shadow/elevation values.
- Uses `TabBarIconWithPill` for active state indicator.

### Product Cards

There is no dedicated `ProductCard` component in current code.

- Closest reusable card style references: `AddressCard` and profile menu cards.
- New product cards should follow those card conventions and semantic token usage.

## Shadows and Elevation

Shadows are platform-aware and centralized in `constants/ui.ts`.

- `BOTTOM_BAR_SHADOW`
  - Web: `boxShadow: 0px -2px 4px rgba(0,0,0,0.1)`
  - Native: `shadowOffset {0,-2}`, `shadowOpacity 0.1`, `shadowRadius 4`
- `CARD_SHADOW`
  - Web: `boxShadow: 0px 4px 12px rgba(0,0,0,0.08)`
  - Native: `shadowOffset {0,4}`, `shadowOpacity 0.08`, `shadowRadius 12`

Elevation usage examples:

- `elevation={0}` for flat cards
- `elevation={1}` for subtle menu cards
- `elevation={4}` for auth card emphasis
- `elevation={8}` for bottom bars and stronger layering

## Animations and Transitions

### Tamagui Animation Props

Used extensively in auth flows and reusable components:

- `animation="quick"` and `animation="medium"`
- `enterStyle` and `exitStyle` for initial/exit transitions
- `AnimatePresence` for controlled mount/unmount transitions (`ErrorMessage`)

Common effects:

- Opacity fade in/out
- Y-axis slide (`y`)
- Scale in/out (`scale`)
- Max-height collapse for dismissible messages

### Reanimated Usage

`TabBarIconWithPill` uses `react-native-reanimated`:

- `useSharedValue`
- `withTiming`
- `useAnimatedStyle`

Animation timings from `MD3_PILL` constants:

- Opacity: `200ms`
- Scale X: `250ms`
- Inactive scale: `0.6`

## Border Radius

Active radius patterns:

- Token radius: `$2`, `$3`, `$4`, `$10`
- Numeric radius: `12`, `14`, `16`, `20`, `22`, and circular (`size / 2`)

Typical mapping:

- Inputs: `14`
- Primary action bars/buttons: `12` to `14`
- Cards/dialogs: `$4` or `20` depending on visual emphasis
- Tab active pill: `16` (MD3)
- Circular avatar/check markers: computed half-size

## Opacity and Transparency

### Opacity Rules in Implementation

- Disabled controls commonly use `opacity: 0.6`.
- Press interactions often use `pressStyle` opacity range around `0.7` to `0.9`.
- Auth and helper labels use partial opacity (`0.7` to `0.9`) for secondary emphasis.

### Transparency Tokens and Values

- `colorTransparent: rgba(2,44,34,0)` in theme palette.
- `tabBarPillBackground` alpha token (`0.12`) for active indicator.
- Modal/backdrop transparency appears as `rgba(0, 0, 0, 0.5)` in dialog overlay.

## Common Tailwind CSS Usage

This repository does not use Tailwind CSS directly. Equivalent utility-style behavior is achieved with Tamagui props and shorthand conventions.

Common utility-like patterns used here:

- Layout: `flex`, `alignItems`, `justifyContent`, `width`, `height`
- Spacing: `padding`, `paddingHorizontal`, `paddingVertical`, `gap`, `marginBottom`
- Visuals: `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius`, `opacity`
- Typography: `fontSize`, `fontWeight`, `lineHeight`, `textAlign`
- Interaction: `pressStyle`, `hoverStyle`, `animation`, `enterStyle`, `exitStyle`

Developer guidance:

- Treat Tamagui props as the utility layer.
- Prefer semantic tokens over hardcoded values.
- Use `getThemeColor()` only when styling non-Tamagui APIs.

## Example Component

Reference `ProductCard` example aligned with this codebase style system.

```tsx
import { Card, XStack, YStack, Text, Button, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';
import { MIN_TOUCH_TARGET } from '@/constants/ui';

type ProductCardProps = {
  name: string;
  category: string;
  priceLabel: string;
  onAddToCart: () => void;
};

export default function ProductCard({ name, category, priceLabel, onAddToCart }: ProductCardProps) {
  const theme = useTheme();
  const iconColor = getThemeColor(theme, 'primary');

  return (
    <Card
      backgroundColor="$surface"
      borderColor="$surfaceBorder"
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      gap="$3"
      elevation={1}
      pressStyle={{ opacity: 0.95, backgroundColor: '$backgroundHover' }}>
      <XStack alignItems="center" gap="$2">
        <Ionicons name="medkit-outline" size={20} color={iconColor} />
        <Text fontSize="$4" fontWeight="700" color="$color" fontFamily="$heading">
          {name}
        </Text>
      </XStack>

      <Text fontSize="$3" color="$colorPress">
        {category}
      </Text>

      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize="$5" fontWeight="700" color="$primary">
          {priceLabel}
        </Text>

        <Button
          backgroundColor="$primary"
          borderRadius={12}
          minHeight={MIN_TOUCH_TARGET}
          paddingHorizontal="$4"
          pressStyle={{ opacity: 0.9 }}
          onPress={onAddToCart}
          accessibilityLabel="Tambah ke keranjang"
          accessibilityRole="button">
          <Text color="$white" fontWeight="600">
            Tambah
          </Text>
        </Button>
      </XStack>
    </Card>
  );
}
```

## Implementation Notes

- This guide is based on current repository implementation and token names.
- If theme token names change in `themes.ts`, update this document in the same PR.
- Keep single-theme assumptions consistent with `providers/Provider.tsx` and `tamagui.config.ts`.
