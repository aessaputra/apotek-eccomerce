import { createTamagui } from 'tamagui';
import { defaultConfig } from '@tamagui/config/v5';
import { themes } from './themes';

export const config = createTamagui({
  ...defaultConfig,
  themes,
});

export type Conf = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
