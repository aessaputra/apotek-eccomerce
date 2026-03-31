import {
  TAB_BAR_LABEL_MAX_SIZE,
  TAB_BAR_LABEL_MIN_SIZE,
  TAB_BAR_LABEL_SIZE,
  TAB_BAR_LARGE_SCREEN_WIDTH,
  TAB_BAR_SMALL_SCREEN_WIDTH,
} from '@/constants/ui';

export function getTabBarLabelFontSize(screenWidth: number): number {
  if (screenWidth <= TAB_BAR_SMALL_SCREEN_WIDTH) {
    return TAB_BAR_LABEL_MIN_SIZE;
  }

  if (screenWidth >= TAB_BAR_LARGE_SCREEN_WIDTH) {
    return TAB_BAR_LABEL_MAX_SIZE;
  }

  if (screenWidth <= 375) {
    const progressToBase =
      (screenWidth - TAB_BAR_SMALL_SCREEN_WIDTH) / (375 - TAB_BAR_SMALL_SCREEN_WIDTH);

    return Math.round(
      TAB_BAR_LABEL_MIN_SIZE + progressToBase * (TAB_BAR_LABEL_SIZE - TAB_BAR_LABEL_MIN_SIZE),
    );
  }

  const progressToLarge = (screenWidth - 375) / (TAB_BAR_LARGE_SCREEN_WIDTH - 375);

  return Math.round(
    TAB_BAR_LABEL_SIZE + progressToLarge * (TAB_BAR_LABEL_MAX_SIZE - TAB_BAR_LABEL_SIZE),
  );
}
