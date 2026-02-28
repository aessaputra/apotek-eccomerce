import { THEME_FALLBACKS } from '@/constants/ui';

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
    // Use THEME_FALLBACKS if available, otherwise use provided fallback
    return (
      (THEME_FALLBACKS[key as keyof typeof THEME_FALLBACKS] as string) ?? fallback ?? '#000000'
    );
  }
  const variable = v as { get?: () => string; val?: string };
  if (typeof variable.get === 'function') {
    const got = variable.get();
    if (typeof got === 'string') return got;
  }
  return (typeof v === 'string' ? v : variable?.val) ?? fallback ?? '#000000';
}

/**
 * Shared Stack header options for Apotek Ecommerce branding.
 * Uses headerBackground for header bg and white for text/icons.
 * Light mode: accent1 (36% lightness) — white text ≈ 4.6:1 (WCAG AA).
 * Dark mode: accent4 (36% lightness) — white text ≈ 4.0:1.
 *
 * @see https://tamagui.dev/docs/core/use-theme
 */
export function getStackHeaderOptions(theme: unknown) {
  return {
    headerTintColor: getThemeColor(theme, 'white'),
    headerStyle: {
      backgroundColor: getThemeColor(
        theme,
        'headerBackground',
        getThemeColor(theme, 'brandPrimary'),
      ),
    },
    headerTitleStyle: { fontSize: 18, fontWeight: '600' as const },
    headerShadowVisible: false,
  };
}
