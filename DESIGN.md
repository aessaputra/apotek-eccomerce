---
name: SiFarma
description: Warm clinical mobile pharmacy commerce for Indonesian customers.
colors:
  primary-teal: "#0F766E"
  primary-teal-deep: "#0F2F2B"
  secondary-green: "#0A7F4F"
  accent-gold: "#FACC15"
  danger-red: "#E5484D"
  warning-rust: "#C2410C"
  info-blue: "#2563EB"
  light-canvas: "#FFFFFF"
  light-surface-subtle: "#F9FAFB"
  light-surface-press: "#F3F4F6"
  light-border: "#E5E7EB"
  light-text-subtle: "#4B5563"
  light-text-muted: "#64748B"
  dark-canvas: "#1A1F26"
  dark-surface: "#252B33"
  dark-surface-subtle: "#303840"
  dark-surface-elevated: "#3B454D"
  dark-text: "#F0F4F8"
  dark-text-subtle: "#A8B8C4"
  dark-text-muted: "#7A8A9A"
  dark-primary-cyan: "#06B6D4"
  dark-success-green: "#34D399"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.17
    letterSpacing: "-0.8px"
  headline:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.19
    letterSpacing: "-0.8px"
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.31
rounded:
  sm: "8px"
  md: "12px"
  field: "14px"
  lg: "16px"
  card: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-teal}"
    textColor: "{colors.light-canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: "48px"
    padding: "0 16px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-teal}"
    textColor: "{colors.light-canvas}"
    rounded: "{rounded.field}"
    height: "48px"
  input-default:
    backgroundColor: "{colors.light-canvas}"
    textColor: "{colors.primary-teal-deep}"
    rounded: "{rounded.field}"
    height: "56px"
    padding: "0 18px"
  card-product:
    backgroundColor: "{colors.light-canvas}"
    textColor: "{colors.primary-teal-deep}"
    rounded: "{rounded.card}"
    padding: "12px"
  badge-status:
    backgroundColor: "{colors.light-surface-subtle}"
    textColor: "{colors.light-text-subtle}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  tab-pill-active:
    backgroundColor: "{colors.primary-teal}"
    textColor: "{colors.primary-teal}"
    rounded: "{rounded.pill}"
    width: "64px"
    height: "32px"
---

# Design System: SiFarma

## 1. Overview

**Creative North Star: "The Neighborhood Counter"**

This system should feel like a familiar pharmacy counter translated to a phone: orderly shelves, readable labels, a calm attendant nearby, and no pressure to rush a health decision. PRODUCT.md defines the posture as a "trusted neighborhood pharmacy on the phone," so the interface must prioritize confidence, recovery paths, and clear Indonesian copy before promotional energy.

The current implementation is a Tamagui-first React Native system using teal healthcare accents, Poppins typography, rounded tactile surfaces, safe-area-aware bottom actions, and mobile controls sized for real thumbs. The aesthetic is warm clinical restraint: professional enough for medication and payment trust, but softened by local pharmacy warmth, generous spacing, and plain-language guidance.

It explicitly rejects discount-marketplace density. Flash-sale urgency, cluttered product cards, hidden fees, tiny controls, ambiguous medication copy, and decorative healthcare teal clichés are forbidden.

**Key Characteristics:**
- Mobile-first, product-register UI for shopping, checkout, order tracking, profile, and support workflows.
- Teal is the primary trust signal; semantic colors are functional and restrained.
- Poppins carries both headings and body copy for a friendly, readable, contemporary voice.
- Surfaces are rounded, bordered, and softly layered rather than glassy or dramatic.
- Every purchase-critical screen needs clear recovery paths: retry, resume payment, edit address, track shipment, or contact support.

## 2. Colors

The palette is a restrained pharmacy palette: deep teal for trust, cyan for dark-mode visibility, green for completion, rust for warnings, red for danger, and quiet neutral surfaces for readable product information.

### Primary
- **Counter Teal**: The primary action, focus, active-navigation, and brand accent color. Use it for checkout actions, selected tabs, add-to-cart controls, focused fields, and high-confidence links.
- **Deep Label Teal**: The primary light-mode text color. It gives headings and product names a warmer, more pharmacy-specific tone than neutral black.
- **Night Cyan**: The dark-mode primary. It replaces teal where contrast against charcoal surfaces needs more light and energy.

### Secondary
- **Service Green**: Success, completed states, and reassuring confirmations. It can support the pharmacy identity, but it must not compete with primary actions.
- **Shelf Gold**: Promotional warmth and soft attention in controlled doses. Use it for gentle merchandising and fallback product/category illustration, not urgent sale noise.

### Tertiary
- **Rust Warning**: Payment countdowns, stock warnings, and reversible caution states.
- **Clinical Blue**: Informational states, unread notification emphasis, and non-critical guidance.
- **Dispense Red**: Destructive actions, validation errors, payment failures, and irreversible warnings.

### Neutral
- **Clean Counter Canvas**: The light app canvas and primary card surface. It is already implemented as a clean white surface, so future work should tint surrounding soft states rather than adding stark black-white contrast.
- **Paper Slip Surface**: The light hover/subtle surface used for skeletons, secondary cards, and low-emphasis panels.
- **Quiet Divider**: The light border and skeleton block color. Use it for structure, not decoration.
- **Warm Charcoal Canvas**: The dark app canvas, tuned away from pure black for long-session readability.
- **Charcoal Surface Stack**: Dark surfaces step through base, subtle, and elevated levels for cards, dialogs, and dropdown-like panels.
- **Muted Label Text**: Secondary and tertiary text colors. Use them for helper copy, prices in compact cards, timestamps, placeholders, and explanatory text.

### Named Rules

**The Teal Earns Trust Rule.** Primary teal is for decisive, helpful actions and selected state, not decorative striping or arbitrary emphasis.

**The Soft Semantic Rule.** Success, warning, danger, and info colors must appear with their soft backgrounds in badges or notices whenever possible. Never rely on color alone for order or payment status.

**The No Flash-Sale Rule.** Promotions may guide discovery, but the color system must never create marketplace urgency that overpowers medication safety, price clarity, delivery expectations, or support.

## 3. Typography

**Display Font:** Poppins, with system sans fallbacks.
**Body Font:** Poppins, with system sans fallbacks.
**Label/Mono Font:** Poppins only. There is no mono role in the current app.

**Character:** Poppins makes the app feel friendly and modern without losing clinical clarity. The system uses weight contrast more than typeface contrast: 700-800 for section anchors and totals, 500-600 for labels, and regular or semibold body copy for explanations.

### Hierarchy
- **Display** (800, 36-42px, 1.15-1.2 line-height): Home hero and rare top-level emotional anchors. Use sparingly because this is a product UI, not a marketing landing page.
- **Headline** (800, 28-32px, 1.18 line-height): Auth titles, success states, and major screen introductions.
- **Title** (700, 18-24px, 1.25-1.35 line-height): Section headers, order totals, product-detail names, and dialog titles.
- **Body** (400-500, 14-16px, 1.45-1.6 line-height): Product descriptions, helper copy, checkout explanations, and empty-state bodies. Keep long body lines visually capped around 65-75 characters on web or tablet layouts.
- **Label** (500-700, 11-14px, tight line-height): Tab labels, field labels, badges, prices in compact cards, timestamps, and CTA text.

### Named Rules

**The Label-First Rule.** Medicine names, prices, address details, and payment status must stay legible before the layout tries to be expressive.

**The Weight Is the Accent Rule.** Use font weight and spacing for emphasis before adding another color. This protects the restrained pharmacy tone.

## 4. Elevation

This is a soft tactile layer system. It uses borders and tonal surfaces at rest, then adds gentle shadows or native elevation only where the surface needs to feel actionable, floating, or safe-area anchored. Depth is functional: cards separate product information, bottom bars preserve checkout actions, and dialogs interrupt only when confirmation is truly needed.

### Shadow Vocabulary
- **Bottom Safe-Area Lift** (`box-shadow: 0px -6px 20px {shadowColor}` on web; native offset y -4, opacity 0.18, radius 12): Sticky checkout and form action bars.
- **Card Ambient Lift** (`box-shadow: 0px 10px 30px {shadowColor}` on web; native offset y 8, opacity 0.16, radius 18): Auth cards and important contained forms.
- **Banner Soft Lift** (`shadowOffset: { width: 0, height: 2 }; shadowOpacity: 0.15; shadowRadius: 8`): Home banners with image or fallback promotional content.
- **Native Utility Elevation** (`elevation: 8` for tab/action bars; `elevation: 3-4` for important cards/buttons): Android depth where shadows need platform-native support.

### Named Rules

**The Surface Before Shadow Rule.** Start with `$surface`, `$surfaceSubtle`, borders, and spacing. Add shadow only when the user needs to understand persistence, action priority, or modal interruption.

**The No Decorative Glass Rule.** Blur and glassmorphism are not part of this system. Use solid surfaces and readable contrast.

## 5. Components

For every component, preserve the product-register purpose: reduce uncertainty, keep controls thumb-sized, and make the next safe action obvious.

### Buttons
- **Shape:** Gently rounded rectangles for full-width actions (12-14px radius), circular pills for icon-only or banner CTAs.
- **Primary:** `$primary` background, `$onPrimary` text, 48px minimum height, 16px title, 600-700 weight. Used for checkout, payment, add address, confirm, and retry.
- **Hover / Focus:** Press feedback is subtle opacity and scale, usually opacity 0.85-0.98 and scale 0.95-0.98. Focus color is primary teal through the input/outline tokens.
- **Secondary / Ghost:** Bordered `$surface` buttons with `$borderColor` and `$colorSubtle` text. Use for cancellation, OAuth, or lower-priority choices.
- **Payment CTAs:** May switch to warning or primary based on urgency, but must keep clear labels and spinner/busy states.

### Chips
- **Style:** Status badges use soft semantic backgrounds with semibold text. Compact chips use `$2` horizontal padding and `$2` radius; default chips use `$3` horizontal padding and `$3` radius.
- **State:** Success, warning, danger, primary, and neutral variants are reserved for status communication. Pair every color state with explicit text.

### Cards / Containers
- **Corner Style:** Product cards use a friendly rounded card radius (`$5`, roughly 20px). Form cards and empty states range from 14-20px. Category cards are rounder (`$6-$7`) to feel tappable.
- **Background:** Default card background is `$surface`; skeleton blocks use `$surfaceBorder`; soft panels use `$surfaceSubtle`; dark mode steps through `$surface`, `$surfaceSubtle`, and `$surfaceElevated`.
- **Shadow Strategy:** Most cards are bordered and flat at rest. Auth cards, order cards, banners, and persistent bars may use soft elevation.
- **Border:** `$surfaceBorder` is the default structural border. Selected or focused cards use `$primary` and may increase border width.
- **Internal Padding:** Common card padding is `$3-$5` depending on density. Product cards are compact (`$3`), auth/order hero cards are more generous (`$5`).

### Inputs / Fields
- **Style:** 56px height, 14px radius, 18px horizontal padding, `$surface` background, 1.5px border at rest.
- **Focus:** 2px `$primary` border. Do not add glow or extra color fills.
- **Error / Disabled:** 2px `$danger` border with explicit error text and icon; disabled opacity is roughly 0.6 with disabled background/border tokens.
- **Multiline:** Minimum height is 100px with top-aligned text and extra vertical padding.

### Navigation
- **Bottom Tabs:** Four customer tabs: Beranda, Pesanan, Notifikasi, Akun. The tab bar is 80px high plus Android inset, `$surface` background, `$surfaceBorder` top border, and native elevation.
- **Active State:** MD3-style active icon pill, 64x32px with 16px radius. The pill animates opacity over 200ms and scaleX over 250ms.
- **Labels:** Poppins semibold, one line only, responsive sizes 11-14px. Never let tab labels wrap.
- **Order Status Tabs:** Horizontal icon tabs with 48px minimum touch targets, count badges, and explicit selected accessibility state.

### Product Cards
- **Character:** Compact shelf items, not marketplace tiles.
- **Structure:** 120px image shell, two-line 14px semibold product name, 12px price, and a 36px circular `$primary` add-to-cart control.
- **Fallback:** If product imagery is missing, use the pill icon and a semantic soft background rather than a broken image placeholder.
- **Skeleton:** Static blocks match the final layout proportions using `$surfaceBorder`, no shimmer required.

### Home Banners
- **Character:** Helpful merchandising, not loud advertising.
- **Structure:** Rounded card (`$5`), 3:1 or 2:1 aspect ratio, optional image, bottom overlay, and pill CTA.
- **Image Text:** White overlay text may use subtle text shadow for legibility. If there is no valid image, fallback to soft intent backgrounds.
- **Rule:** Banners can promote, inform, or brand, but they must not obscure product safety or checkout clarity.

### Bottom Action Bars
- **BottomActionBar:** Use for forms and single-primary-action screens. It is safe-area aware, toolbar-labeled, and contains one full-width primary button.
- **StickyBottomBar:** Use for cart and checkout when the user needs total context beside the confirm action. It reserves safe-area height and shows high-weight totals.
- **Boundary:** Do not create a third footer pattern unless one of these cannot express the flow.

### Dialogs / Sheets
- **Dialogs:** Use `AppAlertDialog` for confirmation and alert moments. Overlay uses `$sheetOverlay`; content is `$surfaceSubtle`, elevated, 90% width, maxWidth `$20`, with stacked full-width actions.
- **Motion:** Dialogs animate transform and opacity only. Entrances can use y -20, opacity 0, scale 0.96.
- **Sheets:** Use bottom sheets for progressive details or onboarding content, not as the first answer to ordinary inline editing.

### Empty, Error, and Loading States
- **Empty States:** Icon-first, centered, title at 20px or `$5`, short body at 14px, then a primary CTA if recovery is possible.
- **Errors:** Use danger text, an icon, and retry or correction actions. Error states must be recoverable, not just descriptive.
- **Skeletons:** Static `$surfaceBorder` blocks should preserve the final content rhythm. Avoid shimmer unless it is implemented centrally.

## 6. Do's and Don'ts

### Do:
- **Do** use `$primary` Counter Teal for primary actions, selected state, focused fields, and cart/payment progress.
- **Do** keep all tappable controls at 48px minimum unless the component is a clearly secondary nested control with an accessible parent.
- **Do** keep product names readable at two lines, prices visible, and checkout totals bold enough to scan.
- **Do** use Poppins 600-800 for important labels, totals, and headings; use muted color plus smaller size for helper copy.
- **Do** use `$surface`, `$surfaceSubtle`, `$surfaceBorder`, and soft elevation before adding new decorative effects.
- **Do** pair semantic color with explicit words: unpaid, packed, shipped, completed, failed, retry, edit, confirm.
- **Do** use `FormInput` as the preferred general form pattern and keep auth-specific inputs visually aligned with it.
- **Do** choose between `BottomActionBar` and `StickyBottomBar` intentionally, based on whether a total summary is part of the action.

### Don't:
- **Don't** create discount-marketplace patterns where flash-sale energy, dense cards, urgency tactics, or cluttered promotions overpower medicine safety and trust.
- **Don't** use colored side-stripe borders as a card accent. Existing left-accent hero usage is technical debt to avoid, not a pattern to expand.
- **Don't** introduce gradient text, decorative glassmorphism, or nested card grids.
- **Don't** hide delivery fees, stock limitations, prescription constraints, payment status, or support paths behind decorative hierarchy.
- **Don't** rely on color alone for order, payment, stock, notification, or validation state.
- **Don't** add a third bottom action/footer pattern unless both existing bars fail a concrete checkout or form need.
- **Don't** create new Tamagui theme tokens without updating `themes.ts`, `constants/ui.ts` fallbacks, and non-Tamagui theme bridges.
- **Don't** use raw black or raw white for new ad hoc styles. Use existing tokens and tinted surfaces so future dark/light modes stay coherent.
