import { createThemes } from '@tamagui/config/v5';
import { defaultComponentThemes } from '@tamagui/theme-builder';
import { yellow, yellowDark, red, redDark, green, greenDark } from '@tamagui/colors';

// base.extra: semantic keys (white, primary, shadowColor, dll)
// sehingga useTheme() mengembalikan theme.white.val, theme.primary.val, dst. (sesuai docs Tamagui).
// Palet disesuaikan untuk brand Apotek (neutral klinis + aksen hijau/amber).

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
const darkPalette = [
  '#020617', // 0 - background utama (hampir hitam kebiruan)
  '#030712', // 1
  '#0B1120', // 2
  '#0F172A', // 3
  '#111827', // 4
  '#1F2937', // 5
  '#374151', // 6
  '#4B5563', // 7
  '#6B7280', // 8
  '#9CA3AF', // 9
  '#E5E7EB', // 10
  '#F9FAFB', // 11
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
        // Gunakan hijau yang lebih gelap untuk teks/link & tombol agar kontras di atas putih lebih kuat.
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
        brandPrimary: accentDark.accent9,
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
