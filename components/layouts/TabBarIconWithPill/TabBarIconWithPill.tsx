import React, { useEffect, memo } from 'react';
import { useTheme } from 'tamagui';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { getThemeColor } from '@/utils/theme';
import { MD3_PILL } from '@/constants/ui';

interface TabBarIconWithPillProps {
  /** Whether this tab is currently active/focused */
  focused: boolean;
  /** The icon element to render inside the pill */
  children: React.ReactNode;
}

/**
 * MD3-style active indicator wrapper for bottom tab bar icons.
 *
 * Renders a semi-transparent teal pill behind the active icon following
 * Material Design 3 Navigation Bar specifications:
 * - Pill: 64×32dp, borderRadius 16dp
 * - Light mode: 12% opacity primary teal on white
 * - Dark mode: 42% opacity primary teal on dark surface (higher contrast)
 *
 * Uses react-native-reanimated for smooth opacity + scaleX transitions.
 * Color comes from theme token `tabBarPillBackground` (defined in themes.ts).
 *
 * @see https://m3.material.io/components/navigation-bar/specs
 */
function TabBarIconWithPill({ focused, children }: TabBarIconWithPillProps) {
  const theme = useTheme();
  const pillBgColor = getThemeColor(theme, 'tabBarPillBackground');

  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const pillScaleX = useSharedValue(focused ? 1 : MD3_PILL.INACTIVE_SCALE_X);

  useEffect(() => {
    pillOpacity.value = withTiming(focused ? 1 : 0, { duration: MD3_PILL.ANIMATION_OPACITY_MS });
    pillScaleX.value = withTiming(focused ? 1 : MD3_PILL.INACTIVE_SCALE_X, {
      duration: MD3_PILL.ANIMATION_SCALE_MS,
    });
  }, [focused, pillOpacity, pillScaleX]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scaleX: pillScaleX.value }],
  }));

  return (
    <Animated.View
      style={{
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: MD3_PILL.WIDTH,
            height: MD3_PILL.HEIGHT,
            borderRadius: MD3_PILL.RADIUS,
            backgroundColor: pillBgColor,
          },
          pillAnimatedStyle,
        ]}
      />
      {children}
    </Animated.View>
  );
}

export default memo(TabBarIconWithPill);
