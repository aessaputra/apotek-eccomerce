import { createThemes } from '@tamagui/config/v5';
import { defaultComponentThemes } from '@tamagui/theme-builder';
import { yellow, yellowDark, red, redDark, green, greenDark } from '@tamagui/colors';

// base.extra: semantic keys (white, red10, shadowColor) so useTheme() returns theme.white.val etc. per Tamagui docs.

const darkPalette = [
  'hsla(0, 0%, 15%, 1)',
  'hsla(0, 0%, 19%, 1)',
  'hsla(0, 0%, 23%, 1)',
  'hsla(0, 0%, 27%, 1)',
  'hsla(0, 0%, 31%, 1)',
  'hsla(0, 0%, 34%, 1)',
  'hsla(0, 0%, 38%, 1)',
  'hsla(0, 0%, 42%, 1)',
  'hsla(0, 0%, 46%, 1)',
  'hsla(0, 0%, 50%, 1)',
  'hsla(0, 15%, 93%, 1)',
  'hsla(0, 15%, 99%, 1)',
];
const lightPalette = [
  'hsla(0, 0%, 99%, 1)',
  'hsla(0, 0%, 94%, 1)',
  'hsla(0, 0%, 88%, 1)',
  'hsla(0, 0%, 83%, 1)',
  'hsla(0, 0%, 77%, 1)',
  'hsla(0, 0%, 72%, 1)',
  'hsla(0, 0%, 66%, 1)',
  'hsla(0, 0%, 61%, 1)',
  'hsla(0, 0%, 55%, 1)',
  'hsla(0, 0%, 50%, 1)',
  'hsla(0, 15%, 15%, 1)',
  'hsla(0, 15%, 1%, 1)',
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
      light: lightPalette,
      dark: darkPalette,
    },
    extra: {
      light: {
        white: lightPalette[0],
        red10: red.red10,
        shadowColor: 'rgba(0,0,0,0.06)',
        primary: accentLight.accent9,
        accent: accentLight.accent9,
        error: red.red10,
        // Override template-derived values so login/cards match Theme Builder (white card, dark text)
        background: lightPalette[0],
        backgroundHover: lightPalette[1],
        color: lightPalette[11],
        colorPress: lightPalette[10],
        borderColor: lightPalette[3],
      },
      dark: {
        white: darkPalette[11],
        red10: redDark.red10,
        shadowColor: 'rgba(0,0,0,0.3)',
        primary: accentDark.accent9,
        accent: accentDark.accent9,
        error: redDark.red10,
        background: darkPalette[0],
        backgroundHover: darkPalette[1],
        color: darkPalette[11],
        colorPress: darkPalette[10],
        borderColor: darkPalette[3],
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
  },
  componentThemes: defaultComponentThemes,
});

export type Themes = typeof builtThemes;

export const themes: Themes = builtThemes;
