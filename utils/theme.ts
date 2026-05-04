import { DARK_THEME_FALLBACKS, THEME_FALLBACKS } from '@/constants/ui';
import { fonts } from '@/utils/fonts';

function resolveThemeValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  const variable = value as { get?: () => string; val?: string };
  if (typeof value === 'string') return value;
  if (typeof variable.val === 'string') return variable.val;
  if (typeof variable.get === 'function') {
    const got = variable.get();
    if (typeof got === 'string') return got;
  }
  return undefined;
}

function getFallbackSet(theme: unknown) {
  const background = resolveThemeValue((theme as Record<string, unknown>)?.background);
  const primary = resolveThemeValue((theme as Record<string, unknown>)?.primary);

  const isDark =
    background === DARK_THEME_FALLBACKS.background || primary === DARK_THEME_FALLBACKS.primary;
  return isDark ? DARK_THEME_FALLBACKS : THEME_FALLBACKS;
}

function shouldPreferAlphaFallback(
  resolved: string | undefined,
  fallbackValue: string | undefined,
) {
  return Boolean(fallbackValue?.startsWith('rgba(') && resolved?.startsWith('rgb('));
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
  const fallbackSet = getFallbackSet(theme);
  const fallbackValue = (fallbackSet[key as keyof typeof fallbackSet] as string) ?? fallback;

  if (v == null) {
    return fallbackValue ?? '#000000';
  }

  const resolved = resolveThemeValue(v);

  if (shouldPreferAlphaFallback(resolved, fallbackValue)) {
    return fallbackValue;
  }

  return resolved ?? fallbackValue ?? '#000000';
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
