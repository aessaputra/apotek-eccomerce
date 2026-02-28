# Apotek E-Commerce — Style Guide

> **Single styling system: Tamagui only. No StyleSheet.**
>
> This document is the definitive reference for all visual design decisions in the Apotek E-Commerce app. Every color, spacing value, font, shadow, and component pattern documented here is derived from the actual codebase and official Tamagui best practices.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius](#5-border-radius)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Opacity & Disabled States](#7-opacity--disabled-states)
8. [Animations & Transitions](#8-animations--transitions)
9. [Icons](#9-icons)
10. [Component Patterns](#10-component-patterns)
11. [Responsive Design](#11-responsive-design)
12. [Accessibility](#12-accessibility)
13. [Anti-Patterns](#13-anti-patterns)
14. [Quick Reference](#14-quick-reference)

---

## 1. Design Philosophy

### Principles

| Principle              | Rule                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single Source**      | All colors in `themes.ts` → imported by `tamagui.config.ts`. Never hardcode.                                                                 |
| **Token-First**        | Use Tamagui tokens (`$primary`, `$background`) in JSX. Use `getThemeColor()` only for non-Tamagui APIs (icons, StatusBar, native TextInput). |
| **Tamagui Only**       | No `StyleSheet.create()`. Use Tamagui props, `styled()`, or inline `style={{}}` on Tamagui components.                                       |
| **Theme-Aware**        | Every color choice must work in both light and dark mode automatically.                                                                      |
| **Accessibility**      | Minimum 48px touch targets (WCAG 2.2). Minimum 4.5:1 contrast ratio for text.                                                                |
| **Clinical Aesthetic** | Clean, neutral palette with teal brand accent — appropriate for a pharmacy/healthcare context.                                               |

### Architecture

```
themes.ts                    ← Single source of truth for ALL colors
  ↓
tamagui.config.ts            ← createTamagui({ ...defaultConfig, themes })
  ↓
providers/Provider.tsx        ← TamaguiProvider with defaultTheme
  ↓
Components                   ← Use $tokens in JSX props
```

---

## 2. Color System

### 2.1 Palettes (12-Step)

Colors are defined as 12-step scales from background → foreground in `themes.ts`.

#### Light Palette

| Step | Hex       | Usage                                   |
| ---- | --------- | --------------------------------------- |
| 0    | `#FFFFFF` | Card / surface — clean white            |
| 1    | `#F9FAFB` | Hover / subtle background               |
| 2    | `#F3F4F6` | Secondary surface                       |
| 3    | `#E5E7EB` | Default border color                    |
| 4    | `#D1D5DB` | Divider / secondary border              |
| 5    | `#9CA3AF` | Placeholder text                        |
| 6    | `#6B7280` | Subtle / inactive text (`$colorSubtle`) |
| 7    | `#4B5563` | Secondary text                          |
| 8    | `#374151` | Body text emphasis                      |
| 9    | `#111827` | High contrast text                      |
| 10   | `#052E16` | Pressed state text (`$colorPress`)      |
| 11   | `#022C22` | Maximum contrast text (`$color`)        |

#### Dark Palette

| Step | Hex                   | Usage                                   |
| ---- | --------------------- | --------------------------------------- |
| 0    | `#2D2D2D`             | Background (`$background`)              |
| 1    | `#353535`             | Hover / subtle background               |
| 2    | `#3D3D3D`             | Elevated surface (`$surfaceElevated`)   |
| 3    | `#454545`             | Default border color                    |
| 4    | `#4D4D4D`             | Secondary border                        |
| 5    | `#565656`             | Divider                                 |
| 6    | `#6B7280`             | Medium gray (light mode `$colorSubtle`) |
| 9    | `#9CA3AF`             | Subtle / inactive text (`$colorSubtle`, `$placeholderColor`) |
| 10   | `#E5E7EB`             | Pressed state text (`$colorPress`)      |
| 11   | `#F9FAFB`             | Foreground text (`$color`)              |

### 2.2 Brand Accent (Teal)

The brand color is a clinical teal at hue 175°.

| Mode  | Token      | HSLA                     | Approx Hex | Usage                          |
| ----- | ---------- | ------------------------ | ---------- | ------------------------------ |
| Light | `$primary` | `hsla(175, 66%, 46%, 1)` | `#0D9488`  | Buttons, active states, badges |
| Dark  | `$primary` | `hsla(175, 53%, 56%, 1)` | ~`#4DB8AC` | Buttons, active states, badges |

### 2.3 Semantic Tokens

Use these tokens in components — **never hardcode hex values**.

| Token               | Light Value        | Dark Value          | Usage                             |
| ------------------- | ------------------ | ------------------- | --------------------------------- |
| `$background`       | `#FFFFFF`          | `#2D2D2D`           | Page background                   |
| `$color`            | `#022C22`          | `#F9FAFB`           | Primary text                      |
| `$colorPress`       | `#052E16`          | `#E5E7EB`           | Pressed / secondary text          |
| `$colorSubtle`      | `#6B7280`          | `#9CA3AF`           | Inactive / muted text             |
| `$primary`          | Teal accent4       | Teal accent9        | Brand CTA, active elements        |
| `$brandPrimary`     | Same as `$primary` | Same as `$primary`  | Alias for brand color             |
| `$brandPrimarySoft` | Teal accent3       | Teal accent3        | Soft brand background             |
| `$brandAccent`      | Yellow 9           | Yellow 9 (dark)     | Secondary accent (promo, badges)  |
| `$brandAccentSoft`  | Yellow 3           | Yellow 3 (dark)     | Soft accent background            |
| `$surface`          | `#FFFFFF`          | `#2D2D2D`           | Card background                   |
| `$surfaceSubtle`    | `#F9FAFB`          | `#353535`           | Subtle surface                    |
| `$surfaceElevated`  | `#FFFFFF`          | `#3D3D3D`           | Elevated card / search bar        |
| `$surfaceBorder`    | `#E5E7EB`          | `#454545`           | Card / input border               |
| `$borderColor`      | `#E5E7EB`          | `#454545`           | Default border                    |
| `$success`          | Green 9            | Green 9 (dark)      | Success states                    |
| `$successSoft`      | Green 3            | Green 3 (dark)      | Success background                |
| `$warning`          | Yellow 9           | Yellow 9 (dark)     | Warning states                    |
| `$warningSoft`      | Yellow 3           | Yellow 3 (dark)     | Warning background                |
| `$danger`           | Red 10             | Red 9 (dark)        | Error states, destructive actions |
| `$dangerSoft`       | Red 3              | Red 3 (dark)        | Error background                  |
| `$error`            | Red 10             | Red 10 (dark)       | Alias for `$danger`               |
| `$white`            | `#FFFFFF`          | `#F9FAFB`           | White (theme-aware)               |
| `$shadowColor`      | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.3)`   | Shadow color                      |
| `$headerBackground` | Teal accent4       | Teal accent4 (dark) | Navigation header bg              |
| `$backgroundHover`  | `#F9FAFB`          | `#353535`           | Hover / press background (Profile) |
| `$placeholderColor`   | `#9CA3AF`          | `#9CA3AF`           | Placeholder text in inputs          |
| `$colorDisabled`      | `#9CA3AF`          | `#565656`           | Disabled element text               |
| `$backgroundDisabled` | `#F3F4F6`          | `#3D3D3D`           | Disabled element background         |
| `$borderColorDisabled`| `#E5E7EB`          | `#454545`           | Disabled element border             |
| `$outlineColor`       | primary @ 30% alpha| primary @ 30% alpha | Focus outline / ring                |
| `$backgroundFocus`    | Same as `$background` | Same as `$background` | Focused input background         |
| `$borderColorFocus`   | Teal (primary)     | Teal (primary)      | Focused input border                |
| `$info`               | Blue 9             | Blue 9 (dark)       | Informational states (healthcare)   |
| `$infoSoft`           | Blue 3             | Blue 3 (dark)       | Informational background            |

### 2.4 Child Themes

Sub-themes for contextual color overrides:

```tsx
// Wrap content in a child theme for contextual color
<Theme name="warning">
  <Text color="$color">This inherits warning palette</Text>
</Theme>

<Theme name="error">
  <Text color="$color">This inherits error palette</Text>
</Theme>

<Theme name="success">
  <Text color="$color">This inherits success palette</Text>
</Theme>

<Theme name="info">
  <Text color="$color">This inherits info palette</Text>
</Theme>
```

### 2.5 Color Usage Rules

```tsx
// ✅ CORRECT: Use Tamagui tokens in JSX props
<YStack backgroundColor="$background" borderColor="$borderColor" />
<Text color="$color" />
<Button backgroundColor="$primary" />

// ✅ CORRECT: Use getThemeColor() for non-Tamagui APIs (icons, native components)
// Fallbacks come from THEME_FALLBACKS in constants/ui.ts — no inline hex needed
const theme = useTheme();
const primaryColor = getThemeColor(theme, 'primary');
<AntDesign name="edit" size={24} color={primaryColor} />
<StatusBar backgroundColor={getThemeColor(theme, 'headerBackground')} />

// ✅ CORRECT: Brand colors that don't change between themes (e.g., Google blue)
const GOOGLE_BLUE = '#4285F4'; // Brand identity, not theme-dependent

// ❌ WRONG: Hardcoded hex in Tamagui components
<YStack backgroundColor="#FFFFFF" />
<Text color="#000000" />
```

---

## 3. Typography

### 3.1 Font Family

**Poppins** is the sole font family, loaded at app init via `utils/fonts.ts`.

| Weight | Variant         | Token / Value                 |
| ------ | --------------- | ----------------------------- |
| 400    | Regular         | `$body` / `Poppins`           |
| 400    | Regular Italic  | `Poppins-Italic`              |
| 600    | SemiBold        | `fontWeight="600"`            |
| 600    | SemiBold Italic | —                             |
| 700    | Bold            | `fontWeight="700"` / `"bold"` |
| 700    | Bold Italic     | —                             |

### 3.2 Font Sizes (Codebase Conventions)

The project uses a mix of Tamagui `$` size tokens and direct pixel values:

| Use Case          | Value                              | Example                  |
| ----------------- | ---------------------------------- | ------------------------ |
| Badge / Tiny      | `fontSize="$1"`                    | Default badge text       |
| Error helper text | `fontSize="$2"` or `fontSize={14}` | Below input fields       |
| Input label       | `fontSize="$3"`                    | Label above form inputs  |
| Card body text    | `fontSize="$3"` – `fontSize="$4"`  | Address, phone number    |
| Body text         | `fontSize={14}` – `fontSize={16}`  | General content          |
| Input text        | `fontSize={16}`                    | All text inputs (native) |
| Button text       | `fontSize={16}`                    | Primary action buttons   |
| Dialog title      | `fontSize={18}`                    | Alert dialog heading     |
| Section heading   | `fontSize={18}` – `fontSize={20}`  | Screen section titles    |

### 3.3 Font Weights

| Weight  | Usage                                            |
| ------- | ------------------------------------------------ |
| `"400"` | Error/validation text, subtle body text           |
| `"500"` | Input labels                                     |
| `"600"` | Button text, card titles, badge text, CTA labels |
| `"700"` | Dialog titles, section headings, emphasis         |
| `"800"` | Brand emphasis links (e.g. Sign Up / Log In CTA) |

### 3.4 Typography Patterns

```tsx
// Heading / Dialog Title
<Text fontSize={18} fontWeight="700" color="$color">
  Dialog Title
</Text>

// Body Text
<Text fontSize={14} fontFamily="$body" color="$color">
  Body content text
</Text>

// Subtle / Secondary Text (note: $colorPress is more commonly used in practice)
<Text fontSize={14} color="$colorSubtle" lineHeight={20}>
  Descriptive or helper text  {/* Only in AppAlertDialog */}
</Text>
<Text fontSize={14} color="$colorPress" lineHeight={20}>
  Secondary text  {/* Dominant pattern across codebase */}
</Text>

// Input Label
<Text fontSize="$3" color="$colorPress" fontWeight="500" marginBottom="$1.5">
  Field Label
  <Text color="$danger"> *</Text>
</Text>

// Error Text
<Text fontSize="$2" color="$danger">
  Error message here
</Text>

// Badge Text
<Text fontSize="$1" fontWeight="600" color="$white">
  Default
</Text>
```

---

## 4. Spacing & Layout

### 4.1 Layout Primitives

| Component | Usage              | Equivalent                                    |
| --------- | ------------------ | --------------------------------------------- |
| `YStack`  | Vertical layout    | `flexDirection: 'column'`                     |
| `XStack`  | Horizontal layout  | `flexDirection: 'row'`                        |
| `ZStack`  | Stacked / absolute | `position: 'relative'` with absolute children |

**Always use Tamagui Stacks** — never use raw `<View>` from React Native.

### 4.2 Spacing Scale

Use Tamagui `$` tokens for consistent spacing:

| Token  | ~Value | Common Usage                              |
| ------ | ------ | ----------------------------------------- |
| `$1`   | 4px    | Tight gap between icon + text             |
| `$1.5` | 6px    | Label bottom margin                       |
| `$2`   | 8px    | Small gap, inner padding, button gap      |
| `$3`   | 12px   | Medium gap, card internal spacing         |
| `$4`   | 16px   | Standard padding, page horizontal padding |
| `$5`   | 20px   | Dialog padding, section spacing           |
| `$6`   | 24px   | Large spacing                             |

### 4.3 Spacing Patterns

```tsx
// Page-level padding
<YStack paddingHorizontal="$4" paddingVertical="$3">

// Card internal spacing
<YStack gap="$2">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</YStack>

// Horizontal row with gap
<XStack gap="$2" alignItems="center">
  <Icon />
  <Text>Label</Text>
</XStack>

// Shorthand props (preferred)
<YStack px="$4" py="$2" />       // paddingHorizontal, paddingVertical
<YStack pt="$2" pb={innerPad} />  // paddingTop, paddingBottom
```

### 4.4 Numeric Pixel Values (When Used)

Some values use direct pixels for precision:

| Value | Usage                                                 |
| ----- | ----------------------------------------------------- |
| `8`   | Icon gap, bottom bar vertical padding                 |
| `12`  | Search bar horizontal padding, icon button padding    |
| `16`  | Page horizontal padding, dialog description font size |
| `18`  | Input horizontal padding                              |
| `20`  | Modal overlay padding                                 |
| `24`  | Page content horizontal padding                       |
| `32`  | Large vertical spacing between sections               |
| `40`  | Bottom sheet button margin bottom                     |

### 4.5 Input Heights

| Component                | Height                                             |
| ------------------------ | -------------------------------------------------- |
| Text input (single line) | `56px`                                             |
| Text input (multiline)   | `100px` min, dynamic                               |
| Search bar               | `40px`                                             |
| Primary action button    | `48px` min (MIN_TOUCH_TARGET)                      |
| OAuth button             | `52px` (mobile), `56px` (tablet), `60px` (desktop) |
| Gradient "OK" button     | `44px`                                             |

### 4.6 UI Constants (`constants/ui.ts`)

```typescript
MIN_TOUCH_TARGET = 48; // Minimum touch target (WCAG 2.2 + iOS HIG + Material)
BOTTOM_BAR_HEIGHT = 64; // Action bar total height
FORM_SCROLL_PADDING = {
  COMPACT: 16, // Simple forms
  SPACIOUS: 24, // Complex forms with bottom elements
};
```

---

## 5. Border Radius

### Conventions

| Value                | Usage                                              |
| -------------------- | -------------------------------------------------- |
| `12`                 | Primary action buttons                             |
| `14`                 | Text inputs (EmailInput, PasswordInput, FormInput) |
| `16`                 | Bottom sheet top corners                           |
| `20`                 | Search bar (pill shape)                            |
| `22`                 | Gradient buttons                                   |
| `$2`                 | Small badges                                       |
| `$3`                 | Dialog buttons, error message container            |
| `$4`                 | Cards, dialog container                            |
| `$4`                 | Cards, dialog container                            |
| `$10`                | Pill badges (member since, tag)                    |
| `size / 2`           | Avatar (circular)                                  |

### Patterns

```tsx
// Card
<Card borderRadius="$4" />

// Input field
<XStack style={{ borderRadius: 14 }} />

// Primary button
<Button style={{ borderRadius: 12 }} />

// Badge
<XStack borderRadius="$2" />

// Avatar (circular)
<YStack borderRadius={size / 2} />

// Search bar (pill)
<XStack borderRadius={20} />
```

---

## 6. Shadows & Elevation

### 6.1 Platform-Aware Shadows

Shadows are defined in `constants/ui.ts` with platform-specific implementations.

#### Bottom Bar Shadow

```typescript
// Web: CSS boxShadow
{ boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' }

// Native: iOS shadow props
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
}
```

#### Card Shadow

```typescript
// Web: CSS boxShadow
{ boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' }

// Native: iOS shadow props
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
}
```

### 6.2 Elevation

Tamagui's `elevation` prop is used for Android compatibility:

| Value | Usage                                    |
| ----- | ---------------------------------------- |
| `0`   | Flat cards (AddressCard, AddressForm)     |
| `1`   | Profile menu cards (subtle lift)         |
| `4`   | Auth form cards (Login, SignUp)           |
| `8`   | Dialogs, bottom action bar, bottom sheet |

### 6.3 Shadow Usage

```tsx
// Spread platform-aware shadow constant
<YStack elevation={8} {...BOTTOM_BAR_SHADOW}>

// Dialog with Tamagui elevation only
<YStack elevation={8} backgroundColor="$surface" />

// Flat card (no shadow)
<Card elevation={0} />
```

---

## 7. Opacity & Disabled States

### Conventions

| State            | Opacity       | Usage                                      |
| ---------------- | ------------- | ------------------------------------------ |
| Normal           | `1`           | Default state                              |
| Disabled         | `0.6`         | Buttons, inputs when `disabled={true}`     |
| Loading          | `0.6`         | Buttons when `isLoading={true}`            |
| Press feedback   | `0.7` – `0.85`| `pressStyle={{ opacity: 0.7 }}` (dialogs), `0.85` (Profile cards) |
| Backdrop overlay | —             | `rgba(0, 0, 0, 0.5)` background            |

### Patterns

```tsx
// Button disabled/loading state
<XStack opacity={disabled || isLoading ? 0.6 : 1}>

// Input disabled state
<XStack style={{ opacity: disabled ? 0.6 : 1 }}>

// Dialog cancel button press
<Button pressStyle={{ opacity: 0.7 }} />

// Dialog confirm button press
<Button pressStyle={{ opacity: 0.8 }} />
```

---

## 8. Animations & Transitions

### 8.1 Animation Props

The project uses Tamagui's built-in animation system.

#### ErrorMessage (AnimatePresence + Enter/Exit)

```tsx
<AnimatePresence>
  {message && (
    <YStack
      animation="quick"
      enterStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
      exitStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
      opacity={1}
      maxHeight={200}
      scale={1}>
      {/* Error content */}
    </YStack>
  )}
</AnimatePresence>
```

#### OAuthButton (Hover + Press)

```tsx
<XStack
  animation="quick"
  hoverStyle={{
    backgroundColor: '$surface',
    scale: 1.01,
    borderColor: '$surfaceBorder',
  }}
  pressStyle={{
    scale: 0.98,
    backgroundColor: '$surfaceSubtle',
  }}
>
```

### 8.2 Animation Values Summary

| Animation        | Property    | From → To       | Used In                  |
| ---------------- | ----------- | --------------- | ------------------------ |
| Fade in          | `opacity`   | `0` → `1`       | ErrorMessage, auth forms |
| Slide up         | `maxHeight` | `0` → `200`     | ErrorMessage             |
| Scale in         | `scale`     | `0.95` → `1`    | ErrorMessage, auth hero  |
| Slide Y (hero)   | `y`         | `-20` → `0`     | Login/SignUp header      |
| Slide Y (desc)   | `y`         | `-10` → `0`     | Login/SignUp subtitle    |
| Slide Y (form)   | `y`         | `20` → `0`      | Login/SignUp form card   |
| Slide Y (footer) | `y`         | `10` → `0`      | Login footer link        |
| Press scale      | `scale`     | `1` → `0.98`    | OAuthButton              |
| Hover scale      | `scale`     | `1` → `1.01`    | OAuthButton              |
| Dot scale in     | `scale`     | `0` → `1`      | SignUp password dots     |

#### Auth Screen Staggered Animation Pattern

Login and SignUp screens use `animation="quick"` with progressive `enterStyle` for staggered entrance:

```tsx
// Hero section - slide down + scale
<YStack animation="quick" enterStyle={{ opacity: 0, y: -20, scale: 0.95 }}>

// Description - subtle slide down
<Text animation="quick" enterStyle={{ opacity: 0, y: -10 }}>

// Form card - slide up (main content)
<YStack animation="quick" enterStyle={{ opacity: 0, y: 20 }}>

// Footer link - subtle slide up
<XStack animation="quick" enterStyle={{ opacity: 0, y: 10 }}>

// Inline elements - fade only
<Text animation="quick" enterStyle={{ opacity: 0 }}>
```
### 8.3 Modal Animation

```tsx
// React Native Modal (for AppAlertDialog)
<Modal animationType="fade" transparent />
```

---

## 9. Icons

### 9.1 Icon Libraries

The project uses three `@expo/vector-icons` families:

| Library        | Usage                                                          |
| -------------- | -------------------------------------------------------------- |
| `AntDesign`    | Navigation (shopping-cart, edit, delete, staro, search)        |
| `FontAwesome5` | Auth forms (eye, eye-slash, exclamation-circle, times, google) |
| `Ionicons`     | Form validation (close-circle)                                 |

### 9.2 Icon Sizes (`constants/ui.ts`)

| Constant            | Size | Usage                                 |
| ------------------- | ---- | ------------------------------------- |
| `ICON_SIZES.SMALL`  | `20` | Search bar icon, compact buttons      |
| `ICON_SIZES.BUTTON` | `24` | Standard button/action icons, tab bar |
| `ICON_SIZES.LARGE`  | `32` | Prominent actions, empty states       |

### 9.3 Icon Color

**Always use `getThemeColor()` for icon colors** — icons are non-Tamagui elements.

```tsx
const theme = useTheme();
const primaryColor = getThemeColor(theme, 'primary');
const dangerColor = getThemeColor(theme, 'danger');
const subtleColor = getThemeColor(theme, 'colorPress');

<AntDesign name="edit" size={ICON_SIZES.BUTTON} color={subtleColor} />
<FontAwesome5 name="exclamation-circle" size={16} color={dangerColor} />
```

---

## 10. Component Patterns

### 10.1 Button

**File:** `components/elements/Button/Button.tsx`

Default primary button with teal background, white text.

```tsx
// Default primary button
<Button
  title="Simpan"
  backgroundColor="$primary"
  style={{ borderRadius: 12, minHeight: MIN_TOUCH_TARGET }}
  titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
  onPress={handleSave}
/>

// Danger button
<Button title="Hapus" backgroundColor="$danger" />

// Transparent button
<Button title="Batal" backgroundColor="transparent" />

// Loading state
<Button title="Menyimpan..." isLoading loaderColor="$white" />
```

**PRIMARY_BUTTON_TITLE_STYLE** (`constants/ui.ts`):

```typescript
{
  color: '$white',
  fontSize: 16,
  fontWeight: '600',
}
```

### 10.2 Form Inputs

**Shared Styling** across `FormInput`, `EmailInput`, `PasswordInput`:

| Property               | Value                               |
| ---------------------- | ----------------------------------- |
| Height                 | `56px`                              |
| Horizontal padding     | `18px`                              |
| Border radius          | `14px`                              |
| Border width (default) | `1.5px`                             |
| Border width (focused) | `2px`                               |
| Border width (error)   | `2px`                               |
| Font size              | `16px`                              |
| Font family            | `theme.bodyFont?.val \|\| 'System'` |
| Disabled opacity       | `0.6`                               |

**Border color states** (via `getThemeColor()`):

| State   | Token                           | Fallback              |
| ------- | ------------------------------- | --------------------- |
| Default | `surfaceBorder` / `borderColor` | `#E5E7EB` / `#E2E8F0` |
| Focused | `primary`                       | `#0D9488`             |
| Error   | `danger`                        | `#DC2626`             |

```tsx
// Standard form input with label + error
<FormInput
  label="Nama Penerima"
  required
  value={name}
  onChangeText={setName}
  error={nameError}
  placeholder="Masukkan nama"
  autoCapitalize="words"
/>
```

### 10.3 Card (AddressCard)

```tsx
<Card
  padding="$4"
  marginBottom="$3"
  backgroundColor="$surface"
  borderWidth={1}
  borderColor={isDefault ? '$primary' : '$surfaceBorder'}
  borderRadius="$4"
  elevation={0}
>
```

### 10.4 Error Message

```tsx
<ErrorMessage message={error} onDismiss={() => setError(null)} dismissible />
```

Internal structure: `AnimatePresence` → `YStack` (animation wrapper) → `XStack` (content container with `$dangerSoft` bg + `$danger` border).

### 10.5 Dialog (AppAlertDialog)

```tsx
// Info dialog (single button)
<AppAlertDialog
  open={alertOpen}
  onOpenChange={setAlertOpen}
  title="Akses Ditolak"
  description="Hanya customer yang boleh login."
/>

// Destructive confirm dialog (two buttons)
<AppAlertDialog
  open={logoutOpen}
  onOpenChange={setLogoutOpen}
  title="Keluar"
  description="Anda yakin ingin keluar?"
  cancelText="Batal"
  confirmText="Keluar"
  confirmColor="$danger"
  onConfirm={handleLogout}
/>
```

Dialog styling: `backgroundColor="$surface"`, `borderRadius="$4"`, `padding="$5"`, `elevation={8}`, `width={320}`, `maxWidth="90%"`.

### 10.6 OAuth Button

Responsive sizing via `useMedia()`:

```tsx
<XStack
  backgroundColor="$surface"
  borderWidth={1.5}
  borderColor="$surfaceBorder"
  borderRadius={media.gtMd ? 16 : media.gtSm ? 14 : 12}
  height={media.gtMd ? 60 : media.gtSm ? 56 : 52}
  paddingHorizontal={media.gtMd ? 24 : media.gtSm ? 20 : 16}
  gap={media.gtMd ? '$4' : media.gtSm ? '$3' : '$2'}
  animation="quick"
  hoverStyle={{ scale: 1.01 }}
  pressStyle={{ scale: 0.98, backgroundColor: '$surfaceSubtle' }}
/>
```

### 10.7 Avatar

Circular component with image or initials fallback:

```tsx
<Avatar avatarUrl={profileUrl} name="John Doe" size={100} editable onUpload={handleUpload} />
```

Styling: `borderRadius={size / 2}`, `borderWidth={3}`, gradient border for editable state, initials with `$heading` font at `size * 0.35`.

### 10.8 Bottom Action Bar

Fixed-position sticky button at screen bottom:

```tsx
<BottomActionBar
  buttonTitle="Simpan Alamat"
  onPress={handleSave}
  isLoading={saving}
  accessibilityLabel="Simpan alamat pengiriman"
  accessibilityHint="Menyimpan data alamat pengiriman baru"
/>
```

Styling: `position="absolute"`, `bottom={keyboardHeight}`, keyboard-aware positioning, platform-aware shadow via `BOTTOM_BAR_SHADOW`.


### 10.9 Spinner

Full-screen or inline loading indicator from Tamagui:

```tsx
// Full-screen centered loading
<YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
  <Spinner size="large" color="$primary" />
</YStack>

// Inline button loading
<Spinner size="small" color={loaderColor} />

// Inline loading in OAuthButton
<Spinner size="small" color="$color" />
```

Used in: `app/index.tsx`, `google-auth.tsx`, `Profile.tsx`, `AddressList.tsx`, `AddressForm.tsx`, `edit-profile.tsx`, `Button.tsx`, `OAuthButton.tsx`.

### 10.10 Checkbox

**File:** `scenes/profile/AddressForm.tsx` — uses Tamagui's `Checkbox` + `Checkbox.Indicator`.

```tsx
<Checkbox
  checked={isDefault}
  onCheckedChange={checked => setIsDefault(checked as boolean)}
  size="$5"
  disabled={saving}
  borderColor={isDefault ? '$primary' : '$borderColor'}
  backgroundColor={isDefault ? '$primary' : '$background'}
  borderWidth={isDefault ? 2 : 1.5}
  accessibilityLabel="Jadikan alamat default">
  <Checkbox.Indicator>
    <AntDesign name="check" size={16} color={getThemeColor(theme, 'white')} />
  </Checkbox.Indicator>
</Checkbox>
```

Styling notes:
- `size="$5"` for comfortable touch target
- Border and background toggle on `checked` state
- Custom icon via `Checkbox.Indicator` (replaces default checkmark)
- Always wrap with accessibility props

### 10.11 Image (Tamagui vs Custom)

| Import | Source | Usage |
| --- | --- | --- |
| `import { Image } from 'tamagui'` | Tamagui primitive | Auth screens (logo display) |
| `import Image from '@/components/elements/Image'` | Custom wrapper | General purpose with loading/error states |

```tsx
// Tamagui Image — for simple, static images (auth logos)
import { Image } from 'tamagui';
<Image source={images.logo} width={80} height={80} resizeMode="contain" />

// Custom Image wrapper — for dynamic content with fallback handling
import Image from '@/components/elements/Image';
<Image source={{ uri: profileUrl }} style={{ width: 100, height: 100 }} />
```

### 10.12 Bottom Tab Bar (Navigation)

**Files:**
- `app/(main)/(tabs)/_layout.tsx` — Tab configuration and color tokens
- `components/layouts/TabBarIconWithPill/TabBarIconWithPill.tsx` — MD3 active indicator
- `constants/ui.ts` — `MD3_PILL` dimensions

The bottom tab bar uses theme tokens via `getThemeColor()` for all colors. Brand teal (`$primary`) is used for the active tab in **both** light and dark modes — following Material Design 3 guidelines where active navigation items always use the brand/primary color regardless of theme.

#### Color Tokens

| Element | Light Mode | Dark Mode | Token |
| --- | --- | --- | --- |
| Background | `#FFFFFF` (white) | `#3D3D3D` (elevated surface) | `surfaceElevated` |
| Active icon/label | `#0D9488` (brand teal) | `~#4DB8AC` (lighter teal) | `primary` → `brandPrimary` |
| Inactive icon/label | `#6B7280` (medium gray) | `#9CA3AF` (lighter gray) | `colorSubtle` → `colorPress` |
| Top border | `#E5E7EB` | `#454545` | `borderColor` |
| Active pill bg | `hsla(175, 66%, 46%, 0.12)` | `hsla(175, 53%, 56%, 0.15)` | `tabBarPillBackground` |

```tsx
// Active: brand teal in BOTH modes (Material Design 3 convention)
const tabBarActive = getThemeColor(
  theme,
  'primary',
  getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
);

// Inactive: subtle gray, theme-aware
const tabBarInactive = getThemeColor(
  theme,
  'colorSubtle',
  getThemeColor(theme, 'colorPress', DEFAULT_THEME_VALUES.colorSubtle),
);

// Background: elevated surface for visual depth
const tabBarBg = getThemeColor(theme, 'surfaceElevated', ...);
```

#### MD3 Active Indicator (Pill)

Each tab icon is wrapped in `TabBarIconWithPill` — a semi-transparent teal pill that appears behind the active icon, following [Material Design 3 Navigation Bar specs](https://m3.material.io/components/navigation-bar/specs).

**Pill dimensions** (from `constants/ui.ts` → `MD3_PILL`):
- Width: `64dp`, Height: `32dp`, Border Radius: `16dp` (fully rounded)

**Animation** (react-native-reanimated):
- Opacity: 0 → 1 (200ms `withTiming`)
- ScaleX: 0.6 → 1 (250ms `withTiming`) — horizontal expand effect
- Both animate on `focused` state change

```tsx
// Usage in _layout.tsx
tabBarIcon: ({ color, focused }) => (
  <TabBarIconWithPill focused={focused}>
    <AntDesign name="home" size={ICON_SIZES.BUTTON} color={color} />
  </TabBarIconWithPill>
),
```

**Why `surfaceElevated` for dark mode background?**
Dark mode uses `#3D3D3D` (slightly lighter than `#2D2D2D` background) to create visual depth — this follows both iOS Human Interface Guidelines and Material Design conventions for bottom navigation bars.

**Why brand teal for active tab (not white)?**
White active icons provide maximum contrast but lose brand identity. Brand teal (`primary`) in both modes keeps the pharmacy brand consistent, provides sufficient contrast (3:1+ on UI components per WCAG), and follows Material Design 3 where active navigation uses brand color.

**Why MD3 pill indicator?**
The semi-transparent pill provides clear active state feedback without relying on color alone (accessibility), works cross-platform (iOS, Android, Web), and is the standard pattern used by Google apps and Material Design 3. Shadow-based glow effects are iOS-only (Android elevation renders black shadows).
---

## 11. Responsive Design

### 11.1 Media Queries

Use Tamagui's `useMedia()` hook for responsive prop values:

```tsx
const media = useMedia();

// Responsive sizing
borderRadius={media.gtMd ? 16 : media.gtSm ? 14 : 12}
height={media.gtMd ? 60 : media.gtSm ? 56 : 52}
paddingHorizontal={media.gtMd ? 24 : media.gtSm ? 20 : 16}
gap={media.gtMd ? '$4' : media.gtSm ? '$3' : '$2'}
```

### 11.2 Platform Detection

Use `utils/deviceInfo.ts` for platform-specific logic:

```typescript
import { isIos, isAndroid, isWeb, isMobile } from '@/utils/deviceInfo';
```

### 11.3 Platform-Aware Components

The `BottomSheet` component demonstrates the pattern — native `@gorhom/bottom-sheet` on mobile, Tamagui-based overlay on web:

```tsx
if (isWeb) {
  // Web fallback with YStack overlay
  return <YStack position="absolute" ... />;
}
// Native implementation
return <RNBottomSheet ... />;
```

---

## 12. Accessibility

### 12.1 Touch Targets

**Minimum 48px** (`MIN_TOUCH_TARGET`) for all interactive elements.

```tsx
// Icon button with proper touch target
<XStack
  minWidth={MIN_TOUCH_TARGET}
  minHeight={MIN_TOUCH_TARGET}
  alignItems="center"
  justifyContent="center"
>
  <AntDesign name="edit" size={24} />
</XStack>

// Pressable action with minWidth/minHeight
<Pressable style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
```

### 12.2 Accessibility Props

All interactive components must include:

```tsx
// Buttons
accessibilityRole="button"
accessibilityLabel="Descriptive label"
accessibilityHint="What happens when pressed"
accessibilityState={{ disabled: isDisabled, busy: isLoading }}

// Inputs
accessibilityLabel={label || placeholder}
accessibilityHint="Optional hint"
accessibilityLiveRegion={error ? 'polite' : undefined}

// Search
accessibilityRole="search"
accessibilityLabel="Cari produk"
```

#### Web Fallback: `aria-description`

For web accessibility, use platform-conditional `aria-description` alongside native props:

```tsx
// Profile / edit-profile — web fallback pattern
accessibilityRole="summary"
accessibilityLabel="User profile information"
{...(Platform.OS === 'web' ? { 'aria-description': 'Displays user avatar, name, and email' } : {})}
```

### 12.3 Contrast Requirements

- **Normal text (< 18px):** Minimum 4.5:1 contrast ratio (WCAG AA)
- **Large text (≥ 18px bold or ≥ 24px):** Minimum 3:1 contrast ratio
- **UI components:** Minimum 3:1 contrast against adjacent colors
- Primary teal on white: verify `#0D9488` meets 4.5:1 for button text

---

## 13. Anti-Patterns

### ❌ Never Do

```tsx
// ❌ StyleSheet.create (exception: RN Modal overlay — see AppAlertDialog)
const styles = StyleSheet.create({ container: { flex: 1 } });

// ❌ Hardcoded colors in Tamagui components
<YStack backgroundColor="#FFFFFF" />
<Text color="#000" />

// ❌ Raw <View> or <Text> from React Native
import { View, Text } from 'react-native';

// ❌ Type suppression
as any
// @ts-ignore
// @ts-expect-error

// ❌ Inline hex for theme-dependent colors
<Button style={{ backgroundColor: '#0D9488' }} />

// ❌ Using $primary for non-Tamagui APIs without getThemeColor()
<AntDesign color="$primary" />  // Won't resolve — it's a string literal
```

### ✅ Always Do

```tsx
// ✅ Tamagui tokens for Tamagui components
<YStack backgroundColor="$background" />;

// ✅ getThemeColor() for non-Tamagui APIs
const color = getThemeColor(theme, 'primary');
<AntDesign color={color} />;

// ✅ Tamagui layout primitives
import { YStack, XStack, Text } from 'tamagui';

// ✅ Constants from constants/ui.ts
import { MIN_TOUCH_TARGET, CARD_SHADOW } from '@/constants/ui';

// ✅ THEME_FALLBACKS provides automatic defaults — no inline hex needed
import { THEME_FALLBACKS } from '@/constants/ui';
getThemeColor(theme, 'primary'); // Falls back to THEME_FALLBACKS.primary
```

### Known Exception

`AppAlertDialog` uses `StyleSheet.create()` for the Modal overlay — this is acceptable because React Native `<Modal>` requires a non-Tamagui root `<View>` for proper overlay behavior. The dialog **content** inside still uses Tamagui tokens.

---

## 14. Quick Reference

### Token Cheat Sheet

```
Background    → $background
Text          → $color
Secondary     → $colorPress / $colorSubtle
Brand         → $primary / $brandPrimary
Surface       → $surface / $surfaceSubtle / $surfaceElevated
Border        → $borderColor / $surfaceBorder
Success       → $success / $successSoft
Warning       → $warning / $warningSoft
Danger/Error  → $danger / $dangerSoft
White         → $white
Shadow        → $shadowColor
Header BG     → $headerBackground
Hover BG      → $backgroundHover
Placeholder → $placeholderColor
Disabled    → $colorDisabled / $backgroundDisabled / $borderColorDisabled
Focus       → $backgroundFocus / $borderColorFocus / $outlineColor
Info        → $info / $infoSoft
```

### Component Import Map

```typescript
// Tamagui primitives
import { YStack, XStack, Text, Card, Button, Input, Spinner, Checkbox, Image } from 'tamagui';
import { AnimatePresence, useTheme, useThemeName, useMedia, GetProps, styled } from 'tamagui';

// Project elements
import Button from '@/components/elements/Button';
import FormInput from '@/components/elements/FormInput';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import Avatar from '@/components/elements/Avatar';
import ErrorMessage from '@/components/elements/ErrorMessage';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import Image from '@/components/elements/Image';
import OAuthButton from '@/components/elements/OAuthButton';
import BottomSheet from '@/components/elements/BottomSheet';
import GradientButton from '@/components/elements/GradientButton';
import AddressCard from '@/components/elements/AddressCard';

// Project layouts
import BottomActionBar from '@/components/layouts/BottomActionBar';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import HeaderSearchAndCart from '@/components/layouts/HeaderSearchAndCart';
import BottomSheetContents from '@/components/layouts/BottomSheetContents';

// Utilities
import { getThemeColor, getStackHeaderOptions } from '@/utils/theme';
import {
  MIN_TOUCH_TARGET,
  ICON_SIZES,
  CARD_SHADOW,
  BOTTOM_BAR_SHADOW,
  PRIMARY_BUTTON_TITLE_STYLE,
  THEME_FALLBACKS,
} from '@/constants/ui';
import { isIos, isAndroid, isWeb, windowWidth, windowHeight } from '@/utils/deviceInfo';
```

### New Component Checklist

When creating a new component:

1. **Check Tamagui first** — `Card`, `Input`, `Button`, `ListItem`, `Avatar` may already exist
2. **Check `components/elements/`** for project-specific wrappers
3. **Use Tamagui tokens** — `$primary`, `$background`, `$color` — never hardcode
4. **Use `YStack` / `XStack`** — never raw `<View>`
5. **Use `Text` from `tamagui`** — never raw RN `<Text>`
6. **Define TypeScript interface** for all props
7. **Add `accessibilityRole`**, `accessibilityLabel` to interactive elements
8. **Ensure 48px minimum** touch targets
9. **Use `getThemeColor()`** for non-Tamagui API color values
10. **Write a test file** — one `.test.tsx` per component

---

_Last updated: February 2026_
_Tamagui version: 1.144.3 · Expo SDK 54 · React Native 0.81.5_
