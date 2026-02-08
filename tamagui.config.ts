import { createTamagui } from 'tamagui';
import { defaultConfig } from '@tamagui/config/v5';
import { themes } from './themes';

export const config = createTamagui({
  ...defaultConfig,
  themes,
});

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
