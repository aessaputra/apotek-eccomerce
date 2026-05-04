import { Platform } from 'react-native';
import { themes } from '@/themes';

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

export const TAB_BAR_LABEL_SIZES = {
  xs: 11,
  sm: 12,
  md: 13,
  lg: 14,
} as const;
export const TAB_BAR_LABEL_NUMBER_OF_LINES = 1;
export const TAB_BAR_LABEL_WIDTH = '100%';
export const TAB_BAR_SMALL_SCREEN_WIDTH = 320;
export const TAB_BAR_COMPACT_SCREEN_WIDTH = 375;
export const TAB_BAR_LARGE_SCREEN_WIDTH = 430;
export const TAB_BAR_ITEM_PADDING_VERTICAL_TOKEN = '$1';
export const TAB_BAR_ITEM_PADDING_VERTICAL = 4;
export const TAB_BAR_ITEM_PADDING_VERTICAL_COMPACT = 2;
export const TAB_BAR_ITEM_PADDING_HORIZONTAL = 3;
export const TAB_BAR_ITEM_PADDING_HORIZONTAL_COMPACT = 1;
export const TAB_BAR_LABEL_MARGIN_TOP_TOKEN = '$1';
export const TAB_BAR_LABEL_MARGIN_TOP = 3;
export const TAB_BAR_LABEL_MARGIN_TOP_COMPACT = 1;

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
  white: themes.brand.white,
  onPrimary: themes.brand.onPrimary,
  onDanger: themes.brand.onDanger,
  color: themes.brand.color,
  colorHover: themes.brand.colorHover,
  colorTransparent: themes.brand.colorTransparent,
  background: themes.brand.background,
  primary: themes.brand.primary,
  secondary: themes.brand.secondary,
  brandPrimary: themes.brand.brandPrimary,
  brandPrimarySoft: themes.brand.brandPrimarySoft,
  headerBackground: themes.brand.headerBackground,
  surface: themes.brand.surface,
  surfaceSubtle: themes.brand.surfaceSubtle,
  surfaceElevated: themes.brand.surfaceElevated,
  surfaceBorder: themes.brand.surfaceBorder,
  borderColor: themes.brand.borderColor,
  borderColorHover: themes.brand.borderColorHover,
  placeholderColor: themes.brand.placeholderColor,
  searchPlaceholderColor: themes.brand.searchPlaceholderColor,
  colorDisabled: themes.brand.colorDisabled,
  backgroundDisabled: themes.brand.backgroundDisabled,
  borderColorDisabled: themes.brand.borderColorDisabled,
  outlineColor: themes.brand.outlineColor,
  backgroundFocus: themes.brand.backgroundFocus,
  borderColorFocus: themes.brand.borderColorFocus,
  error: themes.brand.error,
  danger: themes.brand.danger,
  dangerSoft: themes.brand.dangerSoft,
  success: themes.brand.success,
  successSoft: themes.brand.successSoft,
  warning: themes.brand.warning,
  warningSoft: themes.brand.warningSoft,
  info: themes.brand.info,
  infoSoft: themes.brand.infoSoft,
  colorPress: themes.brand.colorPress,
  colorSubtle: themes.brand.colorSubtle,
  colorMuted: themes.brand.colorMuted,
  tabBarInactive: themes.brand.tabBarInactive,
  tabBarPillBackground: themes.brand.tabBarPillBackground,
  shadowColor: themes.brand.shadowColor,
  sheetOverlay: themes.brand.sheetOverlay,
} as const;

/** Fallback colors for `getThemeColor()` when theme isn't ready (dark mode). */
export const DARK_THEME_FALLBACKS = {
  white: themes.brand_dark.white,
  onPrimary: themes.brand_dark.onPrimary,
  onDanger: themes.brand_dark.onDanger,
  color: themes.brand_dark.color,
  colorHover: themes.brand_dark.colorHover,
  colorTransparent: themes.brand_dark.colorTransparent,
  background: themes.brand_dark.background,
  primary: themes.brand_dark.primary,
  secondary: themes.brand_dark.secondary,
  brandPrimary: themes.brand_dark.brandPrimary,
  brandPrimarySoft: themes.brand_dark.brandPrimarySoft,
  headerBackground: themes.brand_dark.headerBackground,
  surface: themes.brand_dark.surface,
  surfaceSubtle: themes.brand_dark.surfaceSubtle,
  surfaceElevated: themes.brand_dark.surfaceElevated,
  surfaceBorder: themes.brand_dark.surfaceBorder,
  borderColor: themes.brand_dark.borderColor,
  borderColorHover: themes.brand_dark.borderColorHover,
  placeholderColor: themes.brand_dark.placeholderColor,
  searchPlaceholderColor: themes.brand_dark.searchPlaceholderColor,
  colorDisabled: themes.brand_dark.colorDisabled,
  backgroundDisabled: themes.brand_dark.backgroundDisabled,
  borderColorDisabled: themes.brand_dark.borderColorDisabled,
  outlineColor: themes.brand_dark.outlineColor,
  backgroundFocus: themes.brand_dark.backgroundFocus,
  borderColorFocus: themes.brand_dark.borderColorFocus,
  error: themes.brand_dark.error,
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
