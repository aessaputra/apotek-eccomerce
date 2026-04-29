import { describe, expect, test } from '@jest/globals';
import { DARK_THEME_FALLBACKS, THEME_FALLBACKS } from '@/constants/ui';
import { themes } from '@/themes';
import { getStackHeaderOptions, getThemeColor } from '@/utils/theme';

describe('theme utilities', () => {
  test('keeps every light fallback color synchronized with the brand theme', () => {
    for (const key of Object.keys(THEME_FALLBACKS) as Array<keyof typeof THEME_FALLBACKS>) {
      expect(THEME_FALLBACKS[key]).toBe(themes.brand[key]);
    }
  });

  test('keeps every dark fallback color synchronized with the brand dark theme', () => {
    expect(Object.keys(DARK_THEME_FALLBACKS)).toEqual(Object.keys(THEME_FALLBACKS));

    for (const key of Object.keys(DARK_THEME_FALLBACKS) as Array<
      keyof typeof DARK_THEME_FALLBACKS
    >) {
      expect(DARK_THEME_FALLBACKS[key]).toBe(themes.brand_dark[key]);
    }
  });

  test('uses light fallbacks for missing non-Tamagui theme values by default', () => {
    expect(getThemeColor({}, 'error')).toBe(themes.brand.error);
    expect(getThemeColor({}, 'colorTransparent')).toBe(themes.brand.colorTransparent);
  });

  test('uses dark fallbacks when the active theme matches the dark palette', () => {
    expect(getThemeColor({ background: themes.brand_dark.background }, 'error')).toBe(
      themes.brand_dark.error,
    );
    expect(getThemeColor({ primary: themes.brand_dark.primary }, 'colorTransparent')).toBe(
      themes.brand_dark.colorTransparent,
    );
  });

  test('preserves fallback alpha when Tamagui normalizes an rgba token to rgb', () => {
    expect(
      getThemeColor(
        {
          background: themes.brand_dark.background,
          shadowColor: { val: 'rgb(0,0,0)', get: () => 'rgb(0,0,0)' },
        },
        'shadowColor',
      ),
    ).toBe(themes.brand_dark.shadowColor);
  });

  test('builds stack header options from the active theme', () => {
    const options = getStackHeaderOptions({
      background: themes.brand_dark.background,
      color: themes.brand_dark.color,
    });

    expect(options.headerTintColor).toBe(themes.brand_dark.color);
    expect(options.headerStyle.backgroundColor).toBe(themes.brand_dark.background);
    expect(options.contentStyle.backgroundColor).toBe(themes.brand_dark.background);
    expect(options.headerTitleStyle.color).toBe(themes.brand_dark.color);
  });
});
