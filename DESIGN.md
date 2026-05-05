# Design System: Apotek Online

**Project:** Pharmacy E-Commerce Mobile App  
**Framework:** Tamagui 1.144 + Expo SDK 54  
**Platforms:** iOS, Android, Web  
**Last Updated:** 2026-05-05

---

## 1. Visual Theme & Atmosphere

The Apotek Online design system projects a **clean, clinical, and trustworthy** aesthetic befitting a healthcare e-commerce platform. The visual language balances professional authority with approachable warmth—never feeling cold or sterile.

**Atmosphere Keywords:**
- **Airy & Breathable** — Generous whitespace and soft backgrounds prevent visual fatigue during browsing and form completion.
- **Professional & Trustworthy** — The teal-cyan palette evokes medical cleanliness and pharmacy professionalism without feeling institutional.
- **Modern & Accessible** — High contrast ratios (WCAG AAA for primary text), large touch targets, and perceptible elevation hierarchies ensure the app is usable by everyone, including elderly users and those with visual impairments.
- **Layered & Grounded** — A subtle elevation model (especially in dark mode) creates clear spatial relationships between cards, sheets, and the app canvas without heavy drop shadows.

**Design Philosophy:**
The interface prioritizes **scannability** and **confidence**. Product listings, cart items, and order statuses are presented with clear typographic hierarchy. Interactive elements use the brand accent color sparingly to guide attention toward primary actions ("Add to Cart," "Checkout," "Confirm Payment"). The system avoids decorative clutter—every pixel serves readability or navigation.

---

## 2. Color Palette & Roles

### 2.1 Brand Colors

| Descriptive Name | Hex Code | Functional Role |
|---|---|---|
| **Deep Pharmacy Teal** | `#0F766E` | Primary interactive color. Used for primary buttons, active tab indicators, key CTAs, and focus rings in light mode. |
| **Bright Cyan Spark** | `#06B6D4` | Dark mode primary accent. Ensures visibility and vibrancy against charcoal backgrounds. Used for buttons, links, and active states in dark mode. |
| **Forest Mint** | `#0A7F4F` | Secondary action color. Used for success states, confirmation badges, and positive feedback (e.g., "Stock Available"). |

### 2.2 Light Mode Palette

| Descriptive Name | Hex Code | Functional Role |
|---|---|---|
| **Pure White Canvas** | `#FFFFFF` | App background, card surfaces, and input fields. Maximum readability base. |
| **Soft Cloud Gray** | `#F9FAFB` | Hover states on canvas, subtle surface differentiation. |
| **Deep Teal Ink** | `#0F2F2B` | Primary text color. High-contrast headings, labels, and body text. |
| **Slate Gray** | `#4B5563` | Subtle text for secondary labels, metadata, and inactive tab icons. |
| **Cool Silver** | `#64748B` | Muted text for hints, placeholders, and disabled content descriptions. |
| **Feather Gray** | `#E5E7EB` | Default border color for inputs, cards, and dividers. |
| **Warm Ash** | `#D1D5DB` | Border hover state for interactive form elements. |
| **Soft Ambient Shadow** | `rgba(0,0,0,0.06)` | Light mode shadow color for cards and bottom sheets. Whisper-soft depth. |

### 2.3 Dark Mode Palette (Warm Charcoal Hierarchy)

The dark mode abandons pure black in favor of a **warm charcoal progression** that reduces eye strain while maintaining clear elevation hierarchy.

| Descriptive Name | Hex Code | Functional Role |
|---|---|---|
| **Warm Charcoal Deep** | `#1A1F26` | Level 0 — App canvas. The deepest background layer. |
| **Charcoal Surface** | `#252B33` | Level 1 — Cards, containers, bottom sheets, and press states. |
| **Elevated Charcoal** | `#303840` | Level 2 — Modals, dialogs, and elevated cards. |
| **Peak Charcoal** | `#3B454D` | Level 3 — Dropdowns, tooltips, and highest elevation surfaces. |
| **Frosted Pearl** | `#F0F4F8` | Primary text in dark mode. High-contrast headings and labels. |
| **Misted Silver** | `#A8B8C4` | Secondary text for body copy and descriptions. |
| **Dusk Gray** | `#7A8A9A` | Muted text for placeholders, hints, and inactive states. |
| **Deep Night Shadow** | `rgba(0,0,0,0.4)` | Dark mode shadow color. Deeper shadows for perceptible depth. |

### 2.4 Semantic Colors

| Role | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Success** | `#0A7F4F` | `#34D399` | Order placed, payment confirmed, stock available. |
| **Error / Danger** | `#DC2626` (red10) | `#FF8F8F` | Payment failed, invalid input, out-of-stock, critical alerts. |
| **Warning** | `#C2410C` | `#FB923C` | Low stock, delayed shipping, prescription pending. |
| **Info** | `#2563EB` | `#60A5FA` | Helpful tips, shipping updates, promotional notices. |

### 2.5 Alpha & Overlay Colors

| Descriptive Name | Value | Functional Role |
|---|---|---|
| **Teal Tint Pill (Light)** | `hsla(175, 66%, 46%, 0.12)` | Active tab pill background in light mode. Subtle indication without overwhelming. |
| **Cyan Tint Pill (Dark)** | `rgba(6,182,212,0.20)` | Active tab pill background in dark mode. Slightly stronger for visibility on charcoal. |
| **Teal Focus Aura** | `rgba(15,118,110,0.3)` | Focus ring for inputs and buttons in light mode. |
| **Cyan Focus Aura** | `rgba(6,182,212,0.3)` | Focus ring for inputs and buttons in dark mode. |
| **Sheet Dimming (Light)** | `rgba(0,0,0,0.4)` | Overlay behind bottom sheets and modals in light mode. |
| **Sheet Dimming (Dark)** | `rgba(0,0,0,0.7)` | Overlay behind bottom sheets and modals in dark mode. Deeper dimming for focus. |

---

## 3. Typography Rules

### 3.1 Font Family

**Primary Typeface:** Poppins  
A geometric sans-serif with friendly, open letterforms. Poppins conveys modern professionalism while remaining highly legible at small sizes—critical for pharmaceutical information and elderly users.

| Weight | Font File | Usage |
|---|---|---|
| **400 Regular** | `poppins_regular` | Body text, descriptions, order details. |
| **400 Italic** | `poppins_regular_italic` | Emphasis within body text (rarely used). |
| **500/600 SemiBold** | `poppins_semiBold` | Subheadings, card titles, button labels, tab labels. |
| **700/800/900 Bold** | `poppins_bold` | Page headers, price displays, alert titles, primary CTAs. |

### 3.2 Type Scale

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| **Header Title** | 18px | 600 (SemiBold) | 1.3 | 0 | Stack navigation titles, modal headers. |
| **Screen Title** | 20px | 700 (Bold) | 1.25 | -0.02em | Major screen headings (e.g., "Keranjang," "Pesanan Saya"). |
| **Card Title** | 16px | 600 (SemiBold) | 1.4 | 0 | Product names, address labels, order IDs. |
| **Body** | 14px | 400 (Regular) | 1.5 | 0 | Descriptions, addresses, order summaries, terms. |
| **Caption / Label** | 12px | 500 (SemiBold) | 1.4 | 0.01em | Badges, timestamps, form labels, metadata. |
| **Tab Label** | 11–14px | 500 (SemiBold) | 1.2 | 0 | Bottom navigation labels (adapts to screen width). |
| **Price / Big Number** | 18–24px | 700 (Bold) | 1.2 | -0.02em | Total price, shipping cost, item quantity. |

### 3.3 Typography Principles
- **Hierarchy through weight, not just size.** Headers use Bold (700+), subheaders use SemiBold (600), body uses Regular (400).
- **Color reinforces hierarchy.** Primary text (`#0F2F2B` / `#F0F4F8`) for headings, muted (`#64748B` / `#7A8A9A`) for secondary info, subtle (`#4B5563` / `#A8B8C4`) for tertiary metadata.
- **Line height is generous.** Body text uses 1.5x to prevent fatigue when reading prescription details or long product descriptions.

---

## 4. Component Stylings

### 4.1 Buttons

**Primary Button (CTA)**
- **Shape:** Full-width, height 48px, with **generously rounded corners** (border-radius ~12–16px, approaching pill-shaped for small buttons).
- **Color:** Deep Pharmacy Teal (`#0F766E`) background with Pure White (`#FFFFFF`) text in light mode; Bright Cyan Spark (`#06B6D4`) background with Charcoal Deep (`#0F1419`) text in dark mode.
- **Typography:** 16px, SemiBold (600), centered.
- **Behavior:** Subtle opacity reduction on press (`backgroundPress` state). Disabled state uses Cool Silver (`#9CA3AF`) text on Soft Cloud Gray (`#F3F4F6`) background.
- **Shadow:** None for flat primary buttons; bottom action bars may use an upward-casting soft shadow.

**Secondary Button**
- **Shape:** Same dimensions as primary, outlined style.
- **Color:** Transparent background with Deep Pharmacy Teal border and text.
- **Usage:** "Cancel," "Back," "Save for Later."

**Icon Button**
- **Touch Target:** Minimum 48×48dp (per WCAG 2.2 / Material Design).
- **Icon Size:** 24px standard, 20px compact, 32px prominent.
- **Padding:** 4px internal padding around the icon glyph.

### 4.2 Cards / Containers

**Product Card**
- **Shape:** Subtly rounded corners (border-radius ~12–14px).
- **Background:** Pure White (`#FFFFFF`) in light mode; Charcoal Surface (`#252B33`) in dark mode.
- **Shadow:** Soft Ambient Shadow in light mode (`rgba(0,0,0,0.06)`); Deep Night Shadow in dark mode (`rgba(0,0,0,0.4)`).
- **Border:** 1px Feather Gray (`#E5E7EB`) in light mode; 1px Peak Charcoal (`#3B454D`) in dark mode.
- **Padding:** 16px internal padding.

**Bottom Sheet / Modal**
- **Shape:** Top corners only, generously rounded (~20–24px radius).
- **Background:** Pure White / Charcoal Surface.
- **Overlay:** Sheet Dimming color behind the sheet.
- **Behavior:** Swipe-to-dismiss gesture supported.

### 4.3 Inputs / Forms

**Text Field**
- **Height:** 56px (optimal thumb-zone accessibility).
- **Border Radius:** 14px (rounded rectangle, friendly but professional).
- **Border:** 1.5px Feather Gray default; 2px Deep Pharmacy Teal on focus.
- **Background:** Pure White in light mode; Charcoal Surface in dark mode.
- **Placeholder:** Cool Silver (`#6B7280`) in light mode; Dusk Gray (`#7A8A9A`) in dark mode.
- **Horizontal Padding:** 18px.
- **Focus Ring:** Teal Focus Aura / Cyan Focus Aura (3px spread, 30% opacity).

**Search Field**
- **Height:** Same as text field (56px) or slightly compact (~48px) inside headers.
- **Icon:** Search icon (24px) inside left padding area.
- **Placeholder:** "Cari obat, vitamin, suplemen..." in muted color.

### 4.4 Tab Bar (Bottom Navigation)

**Container**
- **Height:** 80px total (including safe area).
- **Background:** Pure White / Charcoal Surface with a subtle top border (1px).
- **Shadow:** Upward-casting soft shadow (`shadowOffset: {0, -4}`, radius 12, opacity 0.18).

**Active Tab**
- **Indicator:** Pill-shaped background (64×32dp, fully rounded `rounded-full` / 16px radius).
- **Pill Color:** Teal Tint Pill (Light) / Cyan Tint Pill (Dark).
- **Icon & Label:** Deep Pharmacy Teal / Bright Cyan Spark.

**Inactive Tab**
- **Icon & Label:** Slate Gray (`#4B5563`) / Dusk Gray (`#7A8A9A`).

### 4.5 Badges & Chips

**Status Badge**
- **Shape:** Pill-shaped (`rounded-full`), compact height (~24px).
- **Colors:**
  - Success: Forest Mint background with white text.
  - Warning: Warning color background with white text.
  - Error: Error color background with white text.
- **Typography:** 12px, SemiBold, uppercase or sentence case depending on context.

---

## 5. Layout Principles

### 5.1 Spacing Scale

The app uses a **base-4 spacing grid** (multiples of 4px) for consistency:

| Token | Value | Usage |
|---|---|---|
| `$1` | 4px | Tight gaps, icon padding. |
| `$2` | 8px | Compact internal padding, label margins. |
| `$3` | 12px | Button internal padding, badge horizontal padding. |
| `$4` | 16px | Standard card padding, container gap, section spacing. |
| `$5` | 20px | Screen edge padding, comfortable container padding. |
| `$6+` | 24px+ | Section breaks, modal insets, large dividers. |

### 5.2 Touch Targets & Accessibility

- **Minimum touch target:** 48×48dp for all interactive elements (buttons, icons, list items).
- **Primary CTA height:** 48px (minimum) to 56px (comfortable).
- **Form field height:** 56px for optimal thumb-zone reach.
- **Bottom action bar height:** 64px total (button 48px + padding).

### 5.3 Elevation & Depth

**Light Mode:**
- Flat design with subtle shadows. Cards float slightly above the canvas using a whisper-soft ambient shadow.
- No heavy drop shadows; depth is communicated through border contrast and background differentiation.

**Dark Mode (Warm Charcoal Elevation Model):**
Depth is communicated through **surface luminosity** rather than shadows:
- **Level 0 (Background):** `#1A1F26` — Deepest layer, app canvas.
- **Level 1 (Surface):** `#252B33` — Cards, containers. ~8% lighter than background.
- **Level 2 (SurfaceSubtle):** `#303840` — Modals, elevated cards. ~16% lighter.
- **Level 3 (SurfaceElevated):** `#3B454D` — Dropdowns, highest elevation. ~24% lighter.

This creates a perceptible depth hierarchy without harsh contrast jumps.

### 5.4 Responsive Behavior

The app adapts layout based on device width using Tamagui media queries:

| Breakpoint | Width | Adaptation |
|---|---|---|
| **xs** | ≤660px | Default mobile layout. Full-width cards, stacked forms. |
| **sm** | ≤860px | Slightly wider padding, possibly 2-column grids on tablets. |
| **md** | ≤980px | Tablet layout. Side-by-side forms, wider cards. |
| **lg** | ≤1120px | Large tablet / small desktop. Multi-column product grids. |
| **tabXs** | ≤320px | Compact tab bar labels (11px), reduced padding. |
| **tabSm** | 321–375px | Standard tab bar (12px labels). |
| **tabMd** | 376–430px | Comfortable tab bar (13px labels). |
| **tabLg** | ≥431px | Large tab bar (14px labels), more spacious icons. |

### 5.5 Shadows

**Bottom Bar Shadow:**
- **Web:** `box-shadow: 0px -6px 20px {shadowColor}`
- **Native:** `shadowOffset: {0, -4}`, `shadowOpacity: 0.18`, `shadowRadius: 12`

**Card Shadow:**
- **Web:** `box-shadow: 0px 10px 30px {shadowColor}`
- **Native:** `shadowOffset: {0, 8}`, `shadowOpacity: 0.16`, `shadowRadius: 18`

### 5.6 Empty States

- **Icon Container:** 120×120dp, centered, with muted opacity (0.6).
- **Title:** 20px, Bold.
- **Body:** 14px, Regular, max-width 280px, centered.
- **Color:** Muted text color.

---

## 6. Design Tokens Summary

### 6.1 Quick Reference: Light vs Dark

| Element | Light Mode | Dark Mode |
|---|---|---|
| **Background** | `#FFFFFF` | `#1A1F26` |
| **Surface** | `#FFFFFF` | `#252B33` |
| **Surface Elevated** | `#FFFFFF` | `#3B454D` |
| **Primary Text** | `#0F2F2B` | `#F0F4F8` |
| **Secondary Text** | `#4B5563` | `#A8B8C4` |
| **Muted Text** | `#64748B` | `#7A8A9A` |
| **Primary Action** | `#0F766E` | `#06B6D4` |
| **Success** | `#0A7F4F` | `#34D399` |
| **Error** | `#DC2626` | `#FF8F8F` |
| **Warning** | `#C2410C` | `#FB923C` |
| **Border** | `#E5E7EB` | `#3B454D` |
| **Shadow** | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.4)` |

### 6.2 Source Files

| Token Category | Source File | Notes |
|---|---|---|
| **Theme Definition** | `themes.ts` | Complete light/dark palette, semantic colors, accent steps. |
| **Tamagui Config** | `tamagui.config.ts` | Font registration (Poppins), media breakpoints, settings. |
| **UI Constants** | `constants/ui.ts` | Touch targets, dimensions, shadows, form fields, tab bar specs, theme fallbacks. |
| **Theme Bridge** | `utils/theme.ts` | Non-Tamagui color access for React Navigation headers and StyleSheet. |

---

*This document is a living design specification. Update it whenever new theme tokens, components, or layout patterns are introduced.*
