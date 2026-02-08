/**
 * Safe theme color access for non-Tamagui APIs (e.g. React Native StyleSheet,
 * headerStyle, backgroundStyle). Per Tamagui docs, theme values are Variable
 * objects with .val and .get(); use token props (e.g. color="$color") in
 * Tamagui components instead of reading theme in JS.
 *
 * @see https://tamagui.dev/docs/core/use-theme
 */
export function getThemeColor(theme: unknown, key: string, fallback: string): string {
  const v = (theme as Record<string, unknown>)?.[key];
  if (v == null) return fallback;
  const variable = v as { get?: () => string; val?: string };
  if (typeof variable.get === 'function') {
    const got = variable.get();
    if (typeof got === 'string') return got;
  }
  return (typeof v === 'string' ? v : variable?.val) ?? fallback;
}
