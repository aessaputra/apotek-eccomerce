import { createFont, createTamagui } from 'tamagui';
import { config as defaultConfig } from '@tamagui/config';
import { themes } from './themes';

const poppinsFont = createFont({
  family: 'poppins_regular',
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: {
    400: { normal: 'poppins_regular', italic: 'poppins_regular_italic' },
    600: { normal: 'poppins_semiBold', italic: 'poppins_semiBold_italic' },
    700: { normal: 'poppins_bold', italic: 'poppins_bold_italic' },
    800: { normal: 'poppins_bold', italic: 'poppins_bold_italic' },
    900: { normal: 'poppins_bold', italic: 'poppins_bold_italic' },
  },
});

export const config = createTamagui({
  ...defaultConfig,
  themes,
  fonts: {
    ...defaultConfig.fonts,
    body: poppinsFont,
    heading: poppinsFont,
  },
});

export type Conf = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

declare module '@tamagui/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
