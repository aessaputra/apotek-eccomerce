import { Platform } from 'react-native';
import { DEFAULT_THEME_VALUES, themes } from '@/themes';

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

export const getBottomBarShadow = (shadowColor: string) =>
  Platform.OS === 'web'
    ? ({ boxShadow: `0px -6px 20px ${shadowColor}` } as const)
    : ({
        shadowColor,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      } as const);

export const getCardShadow = (shadowColor: string) =>
  Platform.OS === 'web'
    ? ({ boxShadow: `0px 10px 30px ${shadowColor}` } as const)
    : ({
        shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      } as const);

/**
 * Primary button title styling for action buttons.
 * Used in bottom action bars and primary CTAs across the app.
 *
 * - color: $onPrimary token (theme-aware text on primary backgrounds)
 * - fontSize: 16px (optimal readability on mobile)
 * - fontWeight: 600 (semibold for emphasis)
 */
export const PRIMARY_BUTTON_TITLE_STYLE = {
  color: '$onPrimary',
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
  /** Extra large icon size for empty states (48px) */
  XL: 48,
} as const;

export const GOOGLE_BRAND_BLUE = '#4285F4' as const;

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

export const EMPTY_STATE = {
  ICON_CONTAINER_SIZE: 120,
  TITLE_FONT_SIZE: 20,
  BODY_FONT_SIZE: 14,
  LABEL_FONT_SIZE: 12,
  SUBTITLE_MAX_WIDTH: 280,
  SUBTITLE_LINE_HEIGHT: 20,
  MUTED_OPACITY: 0.6,
  BORDER_WIDTH: 1,
} as const;

export const TAB_BAR_LABEL_SIZE = 12;
export const TAB_BAR_LABEL_NUMBER_OF_LINES = 2;
export const TAB_BAR_LABEL_MIN_FONT_SCALE = 0.85;
export const TAB_BAR_LABEL_WIDTH = '100%';
export const TAB_BAR_ITEM_PADDING_VERTICAL_TOKEN = '$1';
export const TAB_BAR_ITEM_PADDING_VERTICAL = 4;
export const TAB_BAR_LABEL_MARGIN_TOP_TOKEN = '$1';

/** Tab bar container height (matches WhatsApp-style bottom nav). */
export const TAB_BAR_HEIGHT = 80;
/** Tab bar inner padding. */
export const TAB_BAR_PADDING_TOP = 8;
export const TAB_BAR_PADDING_BOTTOM = 6;
/** Tab bar border width (top border in dp). */
export const TAB_BAR_BORDER_TOP_WIDTH = 1;
/** Tab bar elevation for Android shadow effect. */
export const TAB_BAR_ELEVATION = 8;

export const SPACING_TOKENS = {
  CONTAINER_PADDING: '$5',
  CONTAINER_GAP: '$4',
  ICON_CONTAINER_RADIUS: '$10',
  BADGE_PADDING_HORIZONTAL: '$3',
  BADGE_PADDING_VERTICAL: '$1.5',
  BADGE_MARGIN_TOP: '$2',
  BADGE_BORDER_RADIUS: '$4',
  MAINTENANCE_ROW_GAP: '$2',
  MAINTENANCE_ROW_MARGIN_TOP: '$4',
  CONTENT_STACK_GAP: '$2',
} as const;

/** Fallback colors for `getThemeColor()` when theme isn't ready (light mode). */
export const THEME_FALLBACKS = {
  white: DEFAULT_THEME_VALUES.white,
  onPrimary: DEFAULT_THEME_VALUES.onPrimary,
  onDanger: DEFAULT_THEME_VALUES.onDanger,
  color: DEFAULT_THEME_VALUES.color,
  colorHover: '#123732',
  background: DEFAULT_THEME_VALUES.background,
  primary: DEFAULT_THEME_VALUES.primary,
  secondary: DEFAULT_THEME_VALUES.secondary,
  brandPrimary: DEFAULT_THEME_VALUES.brandPrimary,
  brandPrimarySoft: themes.brand.brandPrimarySoft,
  headerBackground: 'transparent',
  surface: DEFAULT_THEME_VALUES.surface,
  surfaceSubtle: themes.brand.surfaceSubtle,
  surfaceElevated: DEFAULT_THEME_VALUES.surfaceElevated,
  surfaceBorder: DEFAULT_THEME_VALUES.borderColor,
  borderColor: DEFAULT_THEME_VALUES.borderColor,
  borderColorHover: '#D1D5DB',
  placeholderColor: DEFAULT_THEME_VALUES.placeholderColor,
  searchPlaceholderColor: DEFAULT_THEME_VALUES.searchPlaceholderColor,
  colorDisabled: DEFAULT_THEME_VALUES.colorDisabled,
  backgroundDisabled: DEFAULT_THEME_VALUES.backgroundDisabled,
  borderColorDisabled: DEFAULT_THEME_VALUES.borderColorDisabled,
  outlineColor: DEFAULT_THEME_VALUES.outlineColor,
  backgroundFocus: DEFAULT_THEME_VALUES.backgroundFocus,
  borderColorFocus: DEFAULT_THEME_VALUES.borderColorFocus,
  danger: DEFAULT_THEME_VALUES.danger,
  dangerSoft: themes.brand.dangerSoft,
  success: themes.brand.success,
  successSoft: themes.brand.successSoft,
  warning: themes.brand.warning,
  warningSoft: themes.brand.warningSoft,
  info: DEFAULT_THEME_VALUES.info,
  infoSoft: DEFAULT_THEME_VALUES.infoSoft,
  colorPress: DEFAULT_THEME_VALUES.colorPress,
  colorSubtle: DEFAULT_THEME_VALUES.colorSubtle,
  colorMuted: themes.brand.colorMuted,
  tabBarInactive: DEFAULT_THEME_VALUES.tabBarInactive,
  tabBarPillBackground: DEFAULT_THEME_VALUES.tabBarPillBackground,
  shadowColor: DEFAULT_THEME_VALUES.shadowColor,
  sheetOverlay: themes.brand.sheetOverlay,
} as const;

/** Fallback colors for `getThemeColor()` when theme isn't ready (dark mode). */
export const DARK_THEME_FALLBACKS = {
  white: themes.brand_dark.white,
  onPrimary: themes.brand_dark.onPrimary,
  onDanger: themes.brand_dark.onDanger,
  color: themes.brand_dark.color,
  colorHover: themes.brand_dark.colorHover,
  background: '#1A1F26',
  primary: themes.brand_dark.primary,
  secondary: themes.brand_dark.secondary,
  brandPrimary: themes.brand_dark.brandPrimary,
  brandPrimarySoft: themes.brand_dark.brandPrimarySoft,
  headerBackground: 'transparent',
  surface: '#252B33',
  surfaceSubtle: '#303840',
  surfaceElevated: '#3B454D',
  surfaceBorder: '#3B454D',
  borderColor: '#3B454D',
  borderColorHover: themes.brand_dark.borderColorHover,
  placeholderColor: themes.brand_dark.placeholderColor,
  searchPlaceholderColor: themes.brand_dark.searchPlaceholderColor,
  colorDisabled: themes.brand_dark.colorDisabled,
  backgroundDisabled: '#252B33',
  borderColorDisabled: '#3B454D',
  outlineColor: themes.brand_dark.outlineColor,
  backgroundFocus: '#252B33',
  borderColorFocus: themes.brand_dark.borderColorFocus,
  danger: themes.brand_dark.danger,
  dangerSoft: themes.brand_dark.dangerSoft,
  success: themes.brand_dark.success,
  successSoft: themes.brand_dark.successSoft,
  warning: themes.brand_dark.warning,
  warningSoft: themes.brand_dark.warningSoft,
  info: themes.brand_dark.info,
  infoSoft: themes.brand_dark.infoSoft,
  colorPress: themes.brand_dark.colorPress,
  colorSubtle: themes.brand_dark.colorSubtle,
  colorMuted: themes.brand_dark.colorMuted,
  tabBarInactive: themes.brand_dark.tabBarInactive,
  tabBarPillBackground: themes.brand_dark.tabBarPillBackground,
  shadowColor: themes.brand_dark.shadowColor,
  sheetOverlay: themes.brand_dark.sheetOverlay,
} as const;
