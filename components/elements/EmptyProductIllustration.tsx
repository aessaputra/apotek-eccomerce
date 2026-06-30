import React from 'react';
import Svg, { SvgProps, Rect, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export function EmptyProductIllustration(props: SvgProps) {
  const theme = useTheme();

  const surfaceColor = getThemeColor(theme, 'surface');
  const primarySoftColor =
    getThemeColor(theme, 'brandPrimarySoft') || getThemeColor(theme, 'primary');
  const borderColor = getThemeColor(theme, 'borderColor');
  const accentColor = getThemeColor(theme, 'colorSubtle');

  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none" {...props}>
      <Defs>
        <LinearGradient id="box-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surfaceColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primarySoftColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Shadow */}
      <Circle cx="60" cy="105" r="40" fill="rgba(0,0,0,0.03)" />
      <Circle cx="60" cy="105" r="20" fill="rgba(0,0,0,0.02)" />

      {/* Main Container / Box */}
      <Rect
        x="24"
        y="32"
        width="72"
        height="64"
        rx="12"
        fill="url(#box-grad)"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Box Lid / Opening */}
      <Path d="M24 54h72" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />

      {/* Medical Cross (Empty / Missing symbol) */}
      <Path
        d="M52 64h16M60 56v16"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />

      {/* Floating Elements */}
      <Path
        d="M92 24a4 4 0 0 1 5.66 0l2.83 2.83a4 4 0 0 1-5.66 5.66l-2.83-2.83a4 4 0 0 1 0-5.66z"
        fill={surfaceColor}
        stroke={borderColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path d="M94.83 26.83l5.66 5.66" stroke={borderColor} strokeWidth="2" />

      <Circle cx="20" cy="35" r="4" fill={surfaceColor} stroke={borderColor} strokeWidth="2" />
      <Circle cx="30" cy="20" r="2" fill={accentColor} opacity={0.4} />

      {/* Dust/Stars */}
      <Path
        d="M15 80v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M100 85v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
    </Svg>
  );
}

export default EmptyProductIllustration;
