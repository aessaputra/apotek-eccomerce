import { blue, green, red, yellow } from '@tamagui/colors';

const brandPalette = {
  background: '#FFFFFF',
  backgroundHover: '#F9FAFB',
  backgroundPress: '#F3F4F6',
  color: '#022C22',
  colorHover: '#111827',
  colorPress: '#052E16',
  colorFocus: '#022C22',
  colorTransparent: 'rgba(2,44,34,0)',
  borderColor: '#E5E7EB',
  borderColorHover: '#D1D5DB',
  borderColorFocus: 'hsla(175, 66%, 46%, 1)',
  shadowColor: 'rgba(0,0,0,0.06)',
};

const accentBrand = {
  accent1: 'hsla(175, 72%, 36%, 1)',
  accent3: 'hsla(175, 68%, 42%, 1)',
  accent4: 'hsla(175, 66%, 46%, 1)',
};

const accentBrandAlpha = {
  pillBg: 'hsla(175, 66%, 46%, 0.12)',
  focusRing: 'hsla(175, 66%, 46%, 0.3)',
};

export const themes = {
  brand: {
    ...brandPalette,
    white: '#FFFFFF',
    red10: red.red10,
    primary: accentBrand.accent4,
    accent: accentBrand.accent4,
    error: red.red10,
    brandPrimary: accentBrand.accent4,
    brandPrimarySoft: accentBrand.accent3,
    brandAccent: yellow.yellow9,
    brandAccentSoft: yellow.yellow3,
    surface: '#FFFFFF',
    surfaceSubtle: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    surfaceBorder: '#E5E7EB',
    success: green.green9,
    successSoft: green.green3,
    warning: yellow.yellow9,
    warningSoft: yellow.yellow3,
    danger: red.red10,
    dangerSoft: red.red3,
    headerBackground: accentBrand.accent1,
    colorSubtle: '#4B5563',
    tabBarInactive: '#4B5563',
    tabBarPillBackground: accentBrandAlpha.pillBg,
    placeholderColor: '#6B7280',
    colorDisabled: '#9CA3AF',
    backgroundDisabled: '#F3F4F6',
    borderColorDisabled: '#E5E7EB',
    outlineColor: accentBrandAlpha.focusRing,
    backgroundFocus: '#FFFFFF',
    info: blue.blue9,
    infoSoft: blue.blue3,
  },
} as const;

export type Themes = typeof themes;

export const DEFAULT_THEME_VALUES = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  borderColor: '#E5E7EB',
  color: '#022C22',
  colorPress: '#052E16',
  colorSubtle: '#4B5563',
  primary: accentBrand.accent4,
  brandPrimary: accentBrand.accent4,
  shadowColor: 'rgba(0,0,0,0.06)',
  white: '#FFFFFF',
  placeholderColor: '#6B7280',
  colorDisabled: '#9CA3AF',
  backgroundDisabled: '#F3F4F6',
  borderColorDisabled: '#E5E7EB',
  outlineColor: accentBrandAlpha.focusRing,
  backgroundFocus: '#FFFFFF',
  borderColorFocus: accentBrand.accent4,
  danger: red.red10,
  info: blue.blue9,
  infoSoft: blue.blue3,
  tabBarPillBackground: accentBrandAlpha.pillBg,
  tabBarInactive: '#4B5563',
} as const;
