import { createThemes } from '@tamagui/config/v5';
import { defaultComponentThemes } from '@tamagui/theme-builder';
import {
  yellow,
  yellowDark,
  red,
  redDark,
  green,
  greenDark,
  blue,
  blueDark,
} from '@tamagui/colors';

// 12-step palette: background -> foreground (light)
const lightPalette = [
  '#FFFFFF', // 0  - card / surface putih klinis
  '#F9FAFB', // 1  - hover lembut
  '#F3F4F6', // 2
  '#E5E7EB', // 3  - border default
  '#D1D5DB', // 4
  '#9CA3AF', // 5
  '#6B7280', // 6
  '#4B5563', // 7
  '#374151', // 8
  '#111827', // 9
  '#052E16', // 10 - aksen teks hijau gelap
  '#022C22', // 11 - kontras tertinggi
];

// 12-step palette: background -> foreground (dark)
// Smooth gradation from dark gray background (#2D2D2D) to light foreground (#F9FAFB)
const darkPalette = [
  '#2D2D2D', // 0 - background utama (abu-abu gelap)
  '#353535', // 1 - hover lembut
  '#3D3D3D', // 2 - surface elevated
  '#454545', // 3 - border default
  '#4D4D4D', // 4
  '#565656', // 5 - adjusted for smoother gradation
  '#6B7280', // 6 - medium gray (consistent with light mode for colorSubtle)
  '#7A7A7A', // 7
  '#8A8A8A', // 8
  '#9CA3AF', // 9
  '#E5E7EB', // 10
  '#F9FAFB', // 11 - foreground (text color)
];

const accentLight = {
  accent1: 'hsla(175, 72%, 36%, 1)',
  accent2: 'hsla(175, 70%, 39%, 1)',
  accent3: 'hsla(175, 68%, 42%, 1)',
  accent4: 'hsla(175, 66%, 46%, 1)',
  accent5: 'hsla(175, 64%, 49%, 1)',
  accent6: 'hsla(175, 61%, 52%, 1)',
  accent7: 'hsla(175, 59%, 55%, 1)',
  accent8: 'hsla(175, 57%, 59%, 1)',
  accent9: 'hsla(175, 55%, 62%, 1)',
  accent10: 'hsla(175, 53%, 65%, 1)',
  accent11: 'hsla(250, 50%, 95%, 1)',
  accent12: 'hsla(250, 50%, 95%, 1)',
};

const accentDark = {
  accent1: 'hsla(175, 53%, 24%, 1)',
  accent2: 'hsla(175, 53%, 28%, 1)',
  accent3: 'hsla(175, 53%, 32%, 1)',
  accent4: 'hsla(175, 53%, 36%, 1)',
  accent5: 'hsla(175, 53%, 40%, 1)',
  accent6: 'hsla(175, 53%, 44%, 1)',
  accent7: 'hsla(175, 53%, 48%, 1)',
  accent8: 'hsla(175, 53%, 52%, 1)',
  accent9: 'hsla(175, 53%, 56%, 1)',
  accent10: 'hsla(175, 53%, 60%, 1)',
  accent11: 'hsla(250, 50%, 90%, 1)',
  accent12: 'hsla(250, 50%, 95%, 1)',
};

const builtThemes = createThemes({
  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },
    extra: {
      light: {
        white: lightPalette[0],
        red10: red.red10,
        shadowColor: 'rgba(0,0,0,0.06)',
        primary: accentLight.accent4,
        accent: accentLight.accent4,
        error: red.red10,
        brandPrimary: accentLight.accent4,
        brandPrimarySoft: accentLight.accent3,
        brandAccent: yellow.yellow9,
        brandAccentSoft: yellow.yellow3,
        surface: lightPalette[0],
        surfaceSubtle: lightPalette[1],
        surfaceElevated: lightPalette[0],
        surfaceBorder: lightPalette[3],
        success: green.green9,
        successSoft: green.green3,
        warning: yellow.yellow9,
        warningSoft: yellow.yellow3,
        danger: red.red10,
        dangerSoft: red.red3,
        // Darker teal for white text readability (WCAG AA ≈ 4.6:1)
        headerBackground: accentLight.accent1,
        colorSubtle: lightPalette[7],
        tabBarPillBackground: 'hsla(175, 66%, 46%, 0.12)',
        background: lightPalette[0],
        backgroundHover: lightPalette[1],
        color: lightPalette[11],
        colorPress: lightPalette[10],
        borderColor: lightPalette[3],
        placeholderColor: lightPalette[6],
        colorDisabled: lightPalette[5],
        backgroundDisabled: lightPalette[2],
        borderColorDisabled: lightPalette[3],
        outlineColor: 'hsla(175, 66%, 46%, 0.3)',
        backgroundFocus: lightPalette[0],
        borderColorFocus: accentLight.accent4,
        info: blue.blue9,
        infoSoft: blue.blue3,
      },
      dark: {
        white: darkPalette[11],
        red10: redDark.red10,
        shadowColor: 'rgba(0,0,0,0.3)',
        // accent5 (40% lightness) — white text ≈ 4.8:1 WCAG AA
        primary: accentDark.accent5,
        accent: accentDark.accent5,
        error: redDark.red10,
        brandPrimary: accentDark.accent5,
        brandPrimarySoft: accentDark.accent3,
        brandAccent: yellowDark.yellow9,
        brandAccentSoft: yellowDark.yellow3,
        surface: darkPalette[0],
        surfaceSubtle: darkPalette[1],
        surfaceElevated: darkPalette[2],
        surfaceBorder: darkPalette[3],
        success: greenDark.green9,
        successSoft: greenDark.green3,
        warning: yellowDark.yellow9,
        warningSoft: yellowDark.yellow3,
        danger: redDark.red9,
        dangerSoft: redDark.red3,
        headerBackground: accentDark.accent4,
        colorSubtle: darkPalette[9],
        tabBarPillBackground: 'hsla(175, 53%, 40%, 0.15)',
        background: darkPalette[0],
        backgroundHover: darkPalette[1],
        color: darkPalette[11],
        colorPress: darkPalette[10],
        borderColor: darkPalette[3],
        placeholderColor: '#B0B8C1',
        colorDisabled: darkPalette[5],
        backgroundDisabled: darkPalette[2],
        borderColorDisabled: darkPalette[3],
        outlineColor: 'hsla(175, 53%, 40%, 0.3)',
        backgroundFocus: darkPalette[0],
        borderColorFocus: accentDark.accent5,
        info: blueDark.blue9,
        infoSoft: blueDark.blue3,
      },
    },
  },
  accent: {
    palette: {
      light: Object.values(accentLight),
      dark: Object.values(accentDark),
    },
  },
  childrenThemes: {
    warning: {
      palette: {
        light: Object.values(yellow),
        dark: Object.values(yellowDark),
      },
    },
    error: {
      palette: {
        light: Object.values(red),
        dark: Object.values(redDark),
      },
    },
    success: {
      palette: {
        light: Object.values(green),
        dark: Object.values(greenDark),
      },
    },
    info: {
      palette: {
        light: Object.values(blue),
        dark: Object.values(blueDark),
      },
    },
  },
  componentThemes: defaultComponentThemes,
});

export type Themes = typeof builtThemes;

export const themes: Themes = builtThemes;

/** Light-mode fallback values for `getThemeColor()`. */
export const DEFAULT_THEME_VALUES = {
  background: lightPalette[0],
  surface: lightPalette[0],
  surfaceElevated: lightPalette[0],
  borderColor: lightPalette[3],
  color: lightPalette[11],
  colorPress: lightPalette[10],
  colorSubtle: lightPalette[7],
  primary: accentLight.accent4,
  brandPrimary: accentLight.accent4,
  shadowColor: 'rgba(0,0,0,0.06)',
  white: lightPalette[0],
  placeholderColor: lightPalette[6],
  colorDisabled: lightPalette[5],
  backgroundDisabled: lightPalette[2],
  borderColorDisabled: lightPalette[3],
  outlineColor: 'hsla(175, 66%, 46%, 0.3)',
  backgroundFocus: lightPalette[0],
  borderColorFocus: accentLight.accent4,
  danger: red.red10,
  info: blue.blue9,
  infoSoft: blue.blue3,
  tabBarPillBackground: 'hsla(175, 66%, 46%, 0.12)',
  dark: {
    background: darkPalette[0],
    color: darkPalette[11],
    shadowColor: 'rgba(0,0,0,0.3)',
  },
} as const;
