import { describe, expect, test } from '@jest/globals';
import { TAB_BAR_LABEL_MAX_SIZE, TAB_BAR_LABEL_MIN_SIZE, TAB_BAR_LABEL_SIZE } from '@/constants/ui';
import { getTabBarLabelFontSize } from '@/utils/tabBarTypography';

describe('getTabBarLabelFontSize', () => {
  test('returns 10px for 320px screens', () => {
    expect(getTabBarLabelFontSize(320)).toBe(TAB_BAR_LABEL_MIN_SIZE);
  });

  test('returns 11px for 375px screens', () => {
    expect(getTabBarLabelFontSize(375)).toBe(TAB_BAR_LABEL_SIZE);
  });

  test('returns 12px for 430px screens', () => {
    expect(getTabBarLabelFontSize(430)).toBe(TAB_BAR_LABEL_MAX_SIZE);
  });

  test('clamps widths below 320px to 10px', () => {
    expect(getTabBarLabelFontSize(280)).toBe(TAB_BAR_LABEL_MIN_SIZE);
  });

  test('clamps widths above 430px to 14px', () => {
    expect(getTabBarLabelFontSize(500)).toBe(TAB_BAR_LABEL_MAX_SIZE);
  });
});
