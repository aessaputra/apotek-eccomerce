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
 * Shadow configuration for elevated bottom bars (iOS-style elevation).
 * Creates subtle top shadow for visual separation from content.
 * Compatible with Android elevation prop (both work together).
 *
 * - shadowColor: Pure black for natural shadow
 * - shadowOffset: Negative Y for top shadow
 * - shadowOpacity: Subtle (0.1) to avoid heavy appearance
 * - shadowRadius: Medium blur (4px) for soft edges
 */
export const BOTTOM_BAR_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
} as const;

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

/**
 * Theme fallback colors for getThemeColor() utility function.
 * Used when theme values are not available (e.g., during initialization).
 * These values match the light theme defaults as single source of truth.
 *
 * @see utils/theme.ts - getThemeColor() function
 */
export const THEME_FALLBACKS = {
  /** White color fallback */
  white: '#FFFFFF',
  /** Text color fallback (dark for light mode) */
  color: '#000000',
  /** Background color fallback */
  background: '#FFFFFF',
  /** Primary brand color fallback (teal) */
  primary: '#0D9488',
  /** Brand primary fallback */
  brandPrimary: '#0D9488',
} as const;
