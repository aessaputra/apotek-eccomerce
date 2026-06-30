import React, { useEffect } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// --- Constants ---
const VIEWBOX_SIZE = 24;
const CIRCLE_RADIUS = 11;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
// Exact path length for "M8 12.5l3 3 5-6" is sqrt(3^2+3^2) + sqrt(5^2+6^2) ≈ 4.24 + 7.81 = 12.05
const CHECKMARK_PATH_LENGTH = 12.1;

const ANIMATION_DURATION_CIRCLE_MS = 500;
const ANIMATION_DURATION_CHECK_MS = 400;
const ANIMATION_DELAY_CHECK_MS = 350;

interface AnimatedCheckCircleProps {
  size?: number;
  color?: string;
}

export default function AnimatedCheckCircle({
  size = 40,
  color = '#10b981',
}: AnimatedCheckCircleProps) {
  const circleProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);

  const startDrawingAnimation = React.useCallback(() => {
    circleProgress.value = withTiming(1, {
      duration: ANIMATION_DURATION_CIRCLE_MS,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
    });

    checkProgress.value = withDelay(
      ANIMATION_DELAY_CHECK_MS,
      withTiming(1, {
        duration: ANIMATION_DURATION_CHECK_MS,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      }),
    );
  }, [circleProgress, checkProgress]);

  useEffect(() => {
    startDrawingAnimation();
  }, [startDrawingAnimation]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCLE_CIRCUMFERENCE * (1 - circleProgress.value),
  }));

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECKMARK_PATH_LENGTH * (1 - checkProgress.value),
  }));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} fill="none">
      <AnimatedCircle
        cx={VIEWBOX_SIZE / 2}
        cy={VIEWBOX_SIZE / 2}
        r={CIRCLE_RADIUS}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CIRCLE_CIRCUMFERENCE}
        animatedProps={animatedCircleProps}
      />
      <AnimatedPath
        d="M8 12.5l3 3 5-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECKMARK_PATH_LENGTH}
        animatedProps={animatedPathProps}
      />
    </Svg>
  );
}
