import { DARK_THEME_FALLBACKS, THEME_FALLBACKS } from '@/constants/ui';
import { fonts } from '@/utils/fonts';

function resolveThemeValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  const variable = value as { get?: () => string; val?: string };
  if (typeof variable.get === 'function') {
    const got = variable.get();
    if (typeof got === 'string') return got;
  }
  if (typeof value === 'string') return value;
  return variable?.val;
}

function getFallbackSet(theme: unknown) {
  const background = resolveThemeValue((theme as Record<string, unknown>)?.background);
  const primary = resolveThemeValue((theme as Record<string, unknown>)?.primary);

  const isDark =
    background === DARK_THEME_FALLBACKS.background || primary === DARK_THEME_FALLBACKS.primary;
  return isDark ? DARK_THEME_FALLBACKS : THEME_FALLBACKS;
}

/**
 * Safe theme color access for non-Tamagui APIs (e.g. React Native StyleSheet,
 * headerStyle, backgroundStyle). Per Tamagui docs, theme values are Variable
 * objects with .val and .get(); use token props (e.g. color="$color") in
 * Tamagui components instead of reading theme in JS.
 *
 * @see https://tamagui.dev/docs/core/use-theme
 */
export function getThemeColor(theme: unknown, key: string, fallback?: string): string {
  const v = (theme as Record<string, unknown>)?.[key];
  if (v == null) {
    const fallbackSet = getFallbackSet(theme);
    return (fallbackSet[key as keyof typeof fallbackSet] as string) ?? fallback ?? '#000000';
  }
  return resolveThemeValue(v) ?? fallback ?? '#000000';
}

export function getStackHeaderOptions(theme: unknown) {
  const backgroundColor = getThemeColor(theme, 'background');

  return {
    headerTintColor: getThemeColor(theme, 'color'),
    headerStyle: {
      backgroundColor,
    },
    contentStyle: {
      backgroundColor,
    },
    headerTitleStyle: {
      fontSize: 18,
      fontFamily: fonts.poppins.semiBold,
      fontWeight: '600' as const,
      color: getThemeColor(theme, 'color'),
    },
    headerShadowVisible: false,
  };
}
