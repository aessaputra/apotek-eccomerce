import { describe, expect, test } from '@jest/globals';
import {
  TAB_BAR_ITEM_PADDING_HORIZONTAL,
  TAB_BAR_ITEM_PADDING_HORIZONTAL_COMPACT,
  TAB_BAR_ITEM_PADDING_VERTICAL,
  TAB_BAR_ITEM_PADDING_VERTICAL_COMPACT,
  TAB_BAR_LABEL_MARGIN_TOP,
  TAB_BAR_LABEL_MARGIN_TOP_COMPACT,
  TAB_BAR_LABEL_SIZES,
} from '@/constants/ui';
import { getTabBarLayoutMetrics } from '@/utils/tabBarTypography';

describe('tab bar label sizes', () => {
  test('define responsive sizes for each media breakpoint', () => {
    expect(TAB_BAR_LABEL_SIZES).toEqual({
      xs: 11,
      sm: 12,
      md: 13,
      lg: 14,
    });
  });
});

describe('getTabBarLayoutMetrics', () => {
  test('uses compact spacing on 375px screens', () => {
    expect(getTabBarLayoutMetrics(375)).toEqual({
      itemPaddingHorizontal: TAB_BAR_ITEM_PADDING_HORIZONTAL_COMPACT,
      itemPaddingVertical: TAB_BAR_ITEM_PADDING_VERTICAL_COMPACT,
      labelMarginTop: TAB_BAR_LABEL_MARGIN_TOP_COMPACT,
    });
  });

  test('uses default spacing above compact widths', () => {
    expect(getTabBarLayoutMetrics(430)).toEqual({
      itemPaddingHorizontal: TAB_BAR_ITEM_PADDING_HORIZONTAL,
      itemPaddingVertical: TAB_BAR_ITEM_PADDING_VERTICAL,
      labelMarginTop: TAB_BAR_LABEL_MARGIN_TOP,
    });
  });
});
