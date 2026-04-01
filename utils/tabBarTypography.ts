import {
  TAB_BAR_COMPACT_SCREEN_WIDTH,
  TAB_BAR_ITEM_PADDING_HORIZONTAL,
  TAB_BAR_ITEM_PADDING_HORIZONTAL_COMPACT,
  TAB_BAR_ITEM_PADDING_VERTICAL,
  TAB_BAR_ITEM_PADDING_VERTICAL_COMPACT,
  TAB_BAR_LABEL_MARGIN_TOP,
  TAB_BAR_LABEL_MARGIN_TOP_COMPACT,
} from '@/constants/ui';

export interface TabBarLayoutMetrics {
  itemPaddingHorizontal: number;
  itemPaddingVertical: number;
  labelMarginTop: number;
}

export function getTabBarLayoutMetrics(screenWidth: number): TabBarLayoutMetrics {
  const isCompactScreen = screenWidth <= TAB_BAR_COMPACT_SCREEN_WIDTH;

  return {
    itemPaddingHorizontal: isCompactScreen
      ? TAB_BAR_ITEM_PADDING_HORIZONTAL_COMPACT
      : TAB_BAR_ITEM_PADDING_HORIZONTAL,
    itemPaddingVertical: isCompactScreen
      ? TAB_BAR_ITEM_PADDING_VERTICAL_COMPACT
      : TAB_BAR_ITEM_PADDING_VERTICAL,
    labelMarginTop: isCompactScreen ? TAB_BAR_LABEL_MARGIN_TOP_COMPACT : TAB_BAR_LABEL_MARGIN_TOP,
  };
}
