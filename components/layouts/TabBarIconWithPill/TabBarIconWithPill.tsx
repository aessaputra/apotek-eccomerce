import React, { useEffect } from 'react';
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
export default function TabBarIconWithPill({ focused, children }: TabBarIconWithPillProps) {
  const theme = useTheme();
  const pillBgColor = getThemeColor(theme, 'tabBarPillBackground');

  // Animate pill opacity: 0 (inactive) → 1 (active)
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  // Animate pill scaleX: 0.6 (inactive) → 1 (active) for MD3-style horizontal expand
  const pillScaleX = useSharedValue(focused ? 1 : 0.6);

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
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* Semi-transparent pill background (visible only when focused) */}
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
      {/* Icon (rendered above the pill) */}
      {children}
    </Animated.View>
  );
}
