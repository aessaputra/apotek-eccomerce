import React, { useEffect } from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSpring,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { THEME_FALLBACKS } from '@/constants/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface PaymentStatusAnimationProps {
  status: 'verifying' | 'success';
}

export function PaymentStatusAnimation({ status }: PaymentStatusAnimationProps) {
  const theme = useTheme();

  const primaryColor = getThemeColor(theme, 'primary', THEME_FALLBACKS.primary);
  const successColor = getThemeColor(theme, 'success', THEME_FALLBACKS.success);

  const rotation = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  useEffect(() => {
    if (status === 'verifying') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
      checkProgress.value = 0;
    } else if (status === 'success') {
      checkProgress.value = withDelay(150, withSpring(1, { damping: 14, stiffness: 120 }));
    }
  }, [status, rotation, checkProgress]);

  const animatedGroupProps = useAnimatedProps(() => {
    return {
      rotation: rotation.value,
      originX: 50,
      originY: 50,
    };
  });

  const checkAnimatedProps = useAnimatedProps(() => {
    const checkmarkLength = 60;
    return {
      strokeDashoffset: checkmarkLength - checkmarkLength * checkProgress.value,
      opacity: checkProgress.value > 0.05 ? 1 : 0,
    };
  });

  const spinnerAnimatedProps = useAnimatedProps(() => {
    return {
      opacity: interpolate(checkProgress.value, [0, 0.4], [1, 0]),
    };
  });

  return (
    <Svg width={80} height={80} viewBox="0 0 100 100">
      <AnimatedG animatedProps={animatedGroupProps}>
        <AnimatedCircle
          cx="50"
          cy="50"
          r="36"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="160 250"
          animatedProps={spinnerAnimatedProps}
        />
      </AnimatedG>
      <AnimatedPath
        d="M32 52 l12 12 l24 -24"
        stroke={successColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={60}
        animatedProps={checkAnimatedProps}
      />
    </Svg>
  );
}

export default PaymentStatusAnimation;
