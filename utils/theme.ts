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
 * Uses headerBackground (theme-aware) for header background and white for tint (text/icons).
 * Light mode: brandPrimary (teal) for brand consistency.
 * Dark mode: darker teal (accent4) for better contrast with white text (WCAG compliant).
 * Per Tamagui docs: getThemeColor extracts resolved values for non-Tamagui APIs.
 *
 * @see https://tamagui.dev/docs/core/use-theme
 */
export function getStackHeaderOptions(theme: unknown) {
  return {
    headerTintColor: getThemeColor(theme, 'white'),
    // Use headerBackground which is theme-aware (lighter teal for light, darker teal for dark)
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
