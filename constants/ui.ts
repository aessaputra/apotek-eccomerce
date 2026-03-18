import { Platform } from 'react-native';

/**
 * UI Constants for Apotek E-commerce App
 *
 * Centralized UI constants following mobile-design principles and accessibility guidelines.
 * All values comply with WCAG 2.2 and mobile platform standards (iOS/Android).
 *
 * @see mobile-design skill: thumb zone, Fitts' Law, touch target minimums
 * @see WCAG 2.2: Minimum touch target sizes
 */

/**
 * Minimum touch target size for mobile interfaces.
 * - iOS: 44pt minimum (Apple HIG)
 * - Android: 48dp minimum (Material Design)
 * Using 48px to satisfy both platforms and WCAG 2.2 requirements.
 *
 * @see https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 */
export const MIN_TOUCH_TARGET = 48;

/**
 * Bottom action bar total height (padding + button + spacing).
 * Calculation: paddingTop ($2 = ~8px) + button (48px) + paddingBottom (8px) = 64px
 * Used for scroll padding calculations to ensure content doesn't hide behind sticky button.
 */
export const BOTTOM_BAR_HEIGHT = 64;

/**
 * Extra scroll padding configurations for forms with bottom action bar.
 * Different values based on content density and last interactive element position.
 *
 * - COMPACT (16px): For simple forms where last input is far from button (e.g., edit-profile)
 * - SPACIOUS (24px): For complex forms with checkboxes/toggles near bottom (e.g., address-form)
 */
export const FORM_SCROLL_PADDING = {
  /** Minimal spacing for simple forms */
  COMPACT: 16,
  /** Extra spacing for forms with bottom interactive elements (checkboxes, toggles) */
  SPACIOUS: 24,
} as const;

/**
 * Platform-aware shadow configuration for elevated bottom bars.
 * - Web: uses CSS boxShadow (shadow* props are deprecated in react-native-web)
 * - Native: uses iOS shadow* props for natural elevation
 */
export const BOTTOM_BAR_SHADOW =
  Platform.OS === 'web'
    ? ({ boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' } as const)
    : ({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      } as const);

/**
 * Platform-aware shadow configuration for elevated cards (auth forms, dialogs).
 * - Web: uses CSS boxShadow (shadow* props are deprecated in react-native-web)
 * - Native: uses iOS shadow* props for natural card elevation
 */
export const CARD_SHADOW =
  Platform.OS === 'web'
    ? ({ boxShadow: '0px 4px 12px rgba(0,0,0,0.08)' } as const)
    : ({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      } as const);

/**
 * Primary button title styling for action buttons.
 * Used in bottom action bars and primary CTAs across the app.
 *
 * - color: $white token (theme-aware white)
 * - fontSize: 16px (optimal readability on mobile)
 * - fontWeight: 600 (semibold for emphasis)
 */
export const PRIMARY_BUTTON_TITLE_STYLE = {
  color: '$white',
  fontSize: 16,
  fontWeight: '600',
} as const;

/**
 * Standard icon sizes for buttons and UI elements.
 * Ensures consistency across the app and follows mobile design guidelines.
 *
 * - BUTTON: 24px - Standard size for button icons (matches tab bar icons)
 * - SMALL: 20px - Compact size for smaller buttons or dense layouts
 * - LARGE: 32px - Prominent size for important actions or empty states
 *
 * @see mobile-design skill: icon sizing consistency
 */
export const ICON_SIZES = {
  /** Standard button icon size (24px) */
  BUTTON: 24,
  /** Small icon size for compact buttons (20px) */
  SMALL: 20,
  /** Large icon size for prominent buttons (32px) */
  LARGE: 32,
} as const;

export const FORM_FIELD = {
  HEIGHT: 56,
  MULTILINE_MIN_HEIGHT: 100,
  HORIZONTAL_PADDING: 18,
  BORDER_RADIUS: 14,
  BORDER_WIDTH: 1.5,
  ACTIVE_BORDER_WIDTH: 2,
  ICON_BUTTON_PADDING: 4,
  ICON_BUTTON_MARGIN_LEFT: 8,
} as const;

/**
 * Material Design 3 Navigation Bar active indicator (pill) dimensions.
 * The pill is a semi-transparent background behind the active tab icon.
 *
 * - WIDTH: 64dp (MD3 spec)
 * - HEIGHT: 32dp (MD3 spec)
 * - RADIUS: 16dp (fully rounded pill)
 *
 * @see https://m3.material.io/components/navigation-bar/specs
 */
export const MD3_PILL = {
  /** Pill width in dp (MD3 spec: 64dp) */
  WIDTH: 64,
  /** Pill height in dp (MD3 spec: 32dp) */
  HEIGHT: 32,
  /** Pill border radius in dp (MD3 spec: 16dp, fully rounded) */
  RADIUS: 16,
  /** Opacity animation duration in ms (smooth fade) */
  ANIMATION_OPACITY_MS: 200,
  /** ScaleX animation duration in ms (slightly longer for natural feel) */
  ANIMATION_SCALE_MS: 250,
  /** Inactive pill horizontal scale (0.6 = 60% width before expanding to 100%) */
  INACTIVE_SCALE_X: 0.6,
} as const;

/**
 * Tab bar label font size.
 * 12px is the standard label size for bottom navigation (iOS HIG & Material Design).
 */
export const TAB_BAR_LABEL_SIZE = 12;

/** Tab bar container height (matches WhatsApp-style bottom nav). */
export const TAB_BAR_HEIGHT = 78;
/** Tab bar inner padding. */
export const TAB_BAR_PADDING_TOP = 8;
export const TAB_BAR_PADDING_BOTTOM = 6;

/** Fallback colors for `getThemeColor()` when theme isn't ready. */
export const THEME_FALLBACKS = {
  white: '#FFFFFF',
  color: '#000000',
  background: '#FFFFFF',
  primary: '#0D9488',
  brandPrimary: '#0D9488',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceBorder: '#E5E7EB',
  borderColor: '#E5E7EB',
  placeholderColor: '#9CA3AF',
  colorDisabled: '#9CA3AF',
  backgroundDisabled: '#F3F4F6',
  borderColorDisabled: '#E5E7EB',
  outlineColor: 'hsla(175, 66%, 46%, 0.3)',
  backgroundFocus: '#FFFFFF',
  borderColorFocus: '#0D9488',
  danger: '#DC2626',
  info: '#0091FF',
  infoSoft: '#D5EFFF',
  colorPress: '#052E16',
  colorSubtle: '#4B5563',
  tabBarInactive: '#4B5563',
  accent5: 'hsla(175, 64%, 49%, 1)',
  color5: '#9CA3AF',
  tabBarPillBackground: 'hsla(175, 66%, 46%, 0.12)',
} as const;
