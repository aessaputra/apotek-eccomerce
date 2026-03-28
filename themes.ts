import { createThemes } from '@tamagui/config/v4';
import {
  blue,
  blueDark,
  green,
  greenDark,
  red,
  redDark,
  yellow,
  yellowDark,
} from '@tamagui/colors';
import { defaultComponentThemes } from '@tamagui/theme-builder';

const lightPaletteSteps = [
  '#F5FFFE',
  '#F0FBFA',
  '#EBF8F6',
  '#E5F5F2',
  '#DFF2EE',
  '#D4E4E1',
  '#C4D4D0',
  '#B0C4BE',
  '#9AB4AC',
  '#7FA39A',
  '#4B5563',
  '#0F2F2B',
];

const darkPaletteSteps = [
  '#0F1419',
  '#1A2329',
  '#242D35',
  '#2D3A44',
  '#364654',
  '#445A68',
  '#526E7C',
  '#608290',
  '#6E96A4',
  '#7CAAB8',
  '#A8B8C4',
  '#F0F4F8',
];

const accentLightSteps = [
  '#7CAAB8',
  '#76A5B2',
  '#70A0AC',
  '#6A9BA6',
  '#6496A0',
  '#5E919A',
  '#588C94',
  '#52878E',
  '#0F766E',
  '#4C7D88',
  '#0F2F2B',
  '#051513',
];

const accentDarkSteps = [
  '#3D5A68',
  '#456A78',
  '#4D7A88',
  '#558A98',
  '#5D9AA8',
  '#65AAB8',
  '#6DBAC8',
  '#75CAD8',
  '#06B6D4',
  '#14B8A6',
  '#F0F4F8',
  '#E8EEF3',
];

const generatedThemes = createThemes({
  componentThemes: defaultComponentThemes,
  base: {
    palette: {
      light: lightPaletteSteps,
      dark: darkPaletteSteps,
    },
    extra: {
      light: {
        ...blue,
        ...green,
        ...red,
        ...yellow,
        onPrimary: '#FFFFFF',
      },
      dark: {
        ...blueDark,
        ...greenDark,
        ...redDark,
        ...yellowDark,
        onPrimary: '#0F1419',
      },
    },
  },
  childrenThemes: {
    accent: {
      palette: {
        light: accentLightSteps,
        dark: accentDarkSteps,
      },
    },
  },
});

/**
 * PHARMACY DARK-MODE COLOR SYSTEM
 * ================================
 *
 * This theme system provides a cohesive light/dark palette optimized for pharmacy
 * e-commerce applications, with accessibility and visual hierarchy as primary concerns.
 *
 * LIGHT MODE PALETTE RATIONALE
 * ----------------------------
 * - Background: Pure white (#FFFFFF) for maximum readability
 * - Primary text: Deep teal (#0F2F2B) - pharmacy brand alignment
 * - Accent: Teal/cyan spectrum (HSL 175) - professional healthcare aesthetic
 * - Surfaces: Subtle gray progression for elevation hierarchy
 *
 * DARK MODE PALETTE RATIONALE (Soft-Charcoal Hierarchy)
 * -----------------------------------------------------
 * The dark mode uses a "soft-charcoal" approach rather than pure black, reducing
 * eye strain while maintaining clear visual hierarchy through elevation.
 *
 * ELEVATION MODEL (Dark Mode):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Level 0: Background    #0F1419  (Deepest - app canvas)          │
 * │ Level 1: Surface       #1A2329  (Cards, containers)             │
 * │ Level 2: SurfaceSubtle #242D35  (Elevated cards, modals)        │
 * │ Level 3: SurfaceElevated #2D3A44 (Highest elevation, dropdowns)  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each elevation level increases luminosity by ~8% to create perceptible
 * depth without harsh contrast jumps.
 *
 * TEXT HIERARCHY (Dark Mode):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Primary text:   #F0F4F8  (High contrast - headings, labels)    │
 * │ Secondary text: #A8B8C4  (Medium contrast - body text)          │
 * │ Tertiary text:  #7A8A9A  (Low contrast - hints, placeholders)   │
 * │ Disabled text:  #5A6A7A  (Lowest contrast - disabled states)    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * BRAND ACCENT (Cyan #06B6D4):
 * - Primary interactive elements (buttons, links, active states)
 * - Tab bar pill background uses 20% opacity for subtle highlighting
 * - Maintains pharmacy/healthcare professional aesthetic
 *
 * CONTRAST RATIOS (Static Analysis):
 * - Primary text on background: ~14.5:1 (WCAG AAA)
 * - Secondary text on background: ~8.2:1 (WCAG AAA)
 * - Tertiary text on background: ~4.8:1 (WCAG AA)
 * - Brand cyan on background: ~7.1:1 (WCAG AA+)
 *
 * Note: Runtime/manual validation required for final accessibility certification.
 */

// ============================================================================
// LIGHT MODE PALETTE (Default)
// ============================================================================

const lightPalette = {
  // Base backgrounds - white canvas with subtle hover/press states
  background: '#FFFFFF',
  backgroundHover: '#F9FAFB',
  backgroundPress: '#F3F4F6',

  // Text colors - deep teal primary for pharmacy brand alignment
  color: '#0F2F2B',
  colorHover: '#123732',
  colorPress: '#051513',
  colorFocus: '#0F2F2B',
  colorTransparent: 'rgba(15,47,43,0)',

  // Border colors - subtle gray progression
  borderColor: '#E5E7EB',
  borderColorHover: '#D1D5DB',
  borderColorFocus: '#0F766E',

  // Shadow - soft ambient shadow for light mode
  shadowColor: 'rgba(0,0,0,0.06)',

  // Muted text for secondary content
  colorMuted: '#64748B',
};

// ============================================================================
// DARK MODE PALETTE (Soft-Charcoal Hierarchy)
// ============================================================================

const darkPalette = {
  // Base backgrounds - soft-charcoal progression for elevation
  // Level 0: App canvas (deepest)
  background: '#0F1419',
  // Level 0.5: Hover state on canvas
  backgroundHover: '#141B22',
  // Level 1: Press state on canvas
  backgroundPress: '#1A2329',

  // Text colors - perceptible hierarchy for accessibility
  // Primary: High contrast for headings and important labels
  color: '#F0F4F8',
  // Secondary: Medium contrast for body text
  colorHover: '#E8EEF4',
  colorPress: '#D8E2EA',
  colorFocus: '#F0F4F8',
  colorTransparent: 'rgba(240,244,248,0)',

  // Border colors - subtle elevation indication
  borderColor: '#2D3A44',
  borderColorHover: '#5A7887',
  borderColorFocus: '#06B6D4', // Cyan focus ring for brand consistency

  // Shadow - deeper shadow for dark mode depth
  shadowColor: 'rgba(0,0,0,0.4)',

  colorMuted: '#7A8A9A',
};

// ============================================================================
// BRAND ACCENT PALETTES
// ============================================================================

// Light mode accent - teal spectrum for pharmacy brand
const accentBrand = {
  accent1: '#0B5A53', // Deep teal - headers, primary actions
  accent3: '#0C6961', // Medium teal - secondary actions
  accent4: '#0F766E',
};

// Dark mode accent - cyan spectrum for visibility on dark backgrounds
// Uses higher lightness values to maintain contrast against dark backgrounds
const accentBrandDark = {
  accent1: 'hsla(187, 94%, 43%, 1)', // Deep cyan - headers, primary actions
  accent3: 'hsla(187, 92%, 47%, 1)', // Medium cyan - secondary actions
  accent4: '#06B6D4', // Bright cyan - interactive elements (exact brand color)
};

// Alpha variants for overlays and focus states
const accentBrandAlpha = {
  // Light mode pill background - subtle teal tint
  pillBgLight: 'hsla(175, 66%, 46%, 0.12)',
  // Dark mode pill background - cyan tint for tab bar active indicator
  pillBgDark: 'rgba(6,182,212,0.20)',
  // Focus ring - consistent across modes
  focusRing: 'rgba(15,118,110,0.3)',
  // Dark mode focus ring - cyan for brand consistency
  focusRingDark: 'rgba(6,182,212,0.3)',
};

// ============================================================================
// THEME EXPORTS
// ============================================================================

export const themes = {
  // --------------------------------------------------------------------------
  // BRAND THEME (Light Mode - Default)
  // --------------------------------------------------------------------------
  brand: {
    ...generatedThemes.light,
    ...lightPalette,
    white: '#FFFFFF',
    onPrimary: '#FFFFFF',
    onDanger: '#FFFFFF',
    red10: red.red10,

    // Primary accent colors
    primary: accentBrand.accent4,
    secondary: '#0A7F4F',
    accent: accentBrand.accent4,

    // Error/semantic colors
    error: red.red10,

    // Brand-specific tokens
    brandPrimary: accentBrand.accent4,
    brandPrimarySoft: accentBrand.accent3,
    brandAccent: yellow.yellow9,
    brandAccentSoft: yellow.yellow3,

    // Surface hierarchy (elevation)
    surface: '#FFFFFF',
    surfaceSubtle: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    surfaceBorder: '#E5E7EB',

    // Semantic colors
    success: '#0A7F4F',
    successSoft: green.green3,
    warning: '#C2410C',
    warningSoft: yellow.yellow3,
    danger: red.red10,
    dangerSoft: red.red3,

    headerBackground: accentBrand.accent1,

    // Text hierarchy
    colorSubtle: '#4B5563',
    colorMuted: '#64748B',

    // Tab bar
    tabBarInactive: '#4B5563',
    tabBarPillBackground: accentBrandAlpha.pillBgLight,

    // Form states
    placeholderColor: '#6B7280',
    searchPlaceholderColor: '#6B7280',
    colorDisabled: '#9CA3AF',
    backgroundDisabled: '#F3F4F6',
    borderColorDisabled: '#E5E7EB',
    outlineColor: accentBrandAlpha.focusRing,
    backgroundFocus: '#FFFFFF',

    // Info
    info: '#2563EB',
    infoSoft: blue.blue3,

    // Sheet/modal overlay
    sheetOverlay: 'rgba(0,0,0,0.4)',
  },

  // --------------------------------------------------------------------------
  // BRAND_DARK THEME (Dark Mode - Soft-Charcoal Hierarchy)
  // --------------------------------------------------------------------------
  brand_dark: {
    ...generatedThemes.dark,
    ...darkPalette,
    white: '#F0F4F8',
    onPrimary: '#0F1419',
    onDanger: '#0F1419',
    red10: red.red5,

    // Primary accent colors - cyan for dark mode visibility
    primary: accentBrandDark.accent4,
    secondary: '#34D399',
    accent: accentBrandDark.accent4,

    // Error/semantic colors - adjusted for dark mode
    error: '#FF8F8F',

    // Brand-specific tokens
    brandPrimary: accentBrandDark.accent4,
    brandPrimarySoft: accentBrandDark.accent3,
    brandAccent: yellow.yellow5,
    brandAccentSoft: yellow.yellow1,

    // Surface hierarchy (elevation model)
    // Level 1: Base surface for cards/containers
    surface: '#1A2329',
    // Level 2: Subtle elevation for modals/dialogs
    surfaceSubtle: '#242D35',
    // Level 3: Highest elevation for dropdowns/tooltips
    surfaceElevated: '#2D3A44',
    // Surface border - matches elevation level 3
    surfaceBorder: '#2D3A44',

    // Semantic colors - adjusted for dark mode
    success: '#34D399',
    successSoft: green.green1,
    warning: '#FB923C',
    warningSoft: yellow.yellow1,
    danger: '#FF8F8F',
    dangerSoft: red.red1,

    headerBackground: accentBrandDark.accent1,

    // Text hierarchy - perceptible contrast levels
    colorSubtle: '#A8B8C4',
    colorMuted: '#7A8A9A',

    // Tab bar
    tabBarInactive: '#7A8A9A', // Tertiary text color
    tabBarPillBackground: accentBrandAlpha.pillBgDark, // Cyan 20% opacity

    // Form states
    placeholderColor: '#7A8A9A',
    searchPlaceholderColor: '#B0B0B0',
    colorDisabled: '#5A6A7A', // Disabled text color
    backgroundDisabled: '#1A2329', // Surface level 1
    borderColorDisabled: '#2D3A44', // Surface level 3
    outlineColor: accentBrandAlpha.focusRingDark, // Cyan focus ring
    backgroundFocus: '#1A2329', // Surface level 1

    // Info
    info: '#60A5FA',
    infoSoft: blue.blue1,

    // Sheet/modal overlay - darker for dark mode
    sheetOverlay: 'rgba(0,0,0,0.7)',
  },
} as const;

export type Themes = typeof themes;

// ============================================================================
// DEFAULT THEME VALUES (Fallbacks for non-Tamagui consumers)
// ============================================================================

/**
 * Default theme values for use when Tamagui theme is not available.
 * These match the light theme (brand) and are used by getThemeColor()
 * in utils/theme.ts for React Native StyleSheet and navigation theming.
 *
 * IMPORTANT: When updating themes, ensure these fallbacks stay in sync
 * with the light theme values above.
 */
export const DEFAULT_THEME_VALUES = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  borderColor: '#E5E7EB',
  color: '#0F2F2B',
  colorPress: '#051513',
  colorSubtle: '#4B5563',
  primary: accentBrand.accent4,
  secondary: '#0A7F4F',
  brandPrimary: accentBrand.accent4,
  shadowColor: 'rgba(0,0,0,0.06)',
  white: '#FFFFFF',
  onPrimary: '#FFFFFF',
  onDanger: '#FFFFFF',
  placeholderColor: '#6B7280',
  searchPlaceholderColor: '#6B7280',
  colorDisabled: '#9CA3AF',
  backgroundDisabled: '#F3F4F6',
  borderColorDisabled: '#E5E7EB',
  outlineColor: accentBrandAlpha.focusRing,
  backgroundFocus: '#FFFFFF',
  borderColorFocus: accentBrand.accent4,
  danger: red.red10,
  info: blue.blue9,
  infoSoft: blue.blue3,
  tabBarPillBackground: accentBrandAlpha.pillBgLight,
  tabBarInactive: '#4B5563',
} as const;
