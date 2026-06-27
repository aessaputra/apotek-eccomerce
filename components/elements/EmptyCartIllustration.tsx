import React from 'react';
import Svg, { SvgProps, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export function EmptyCartIllustration(props: SvgProps) {
  const theme = useTheme();

  const surfaceColor = getThemeColor(theme, 'surface');
  const primarySoftColor =
    getThemeColor(theme, 'brandPrimarySoft') || getThemeColor(theme, 'primary');
  const borderColor = getThemeColor(theme, 'borderColor');
  const accentColor = getThemeColor(theme, 'colorSubtle');

  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none" {...props}>
      <Defs>
        <LinearGradient id="basket-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surfaceColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primarySoftColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Shadow */}
      <Circle cx="60" cy="105" r="35" fill="rgba(0,0,0,0.03)" />
      <Circle cx="60" cy="105" r="15" fill="rgba(0,0,0,0.02)" />

      {/* Basket Handle */}
      <Path
        d="M35 45 V 35 Q 35 15 60 15 Q 85 15 85 35 V 45"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Basket Body */}
      <Path
        d="M20 45 L100 45 L90 95 C89 98 86 100 83 100 L37 100 C34 100 31 98 30 95 Z"
        fill="url(#basket-grad)"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Basket Grid/Detail Lines */}
      <Path
        d="M45 45 V 100 M75 45 V 100"
        stroke={borderColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.3}
      />
      <Path
        d="M25 72 H 95"
        stroke={borderColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.3}
      />

      {/* Floating Elements (Empty state indicators) */}
      <Circle cx="20" cy="30" r="4" fill={surfaceColor} stroke={borderColor} strokeWidth="2" />
      <Circle cx="30" cy="15" r="2" fill={accentColor} opacity={0.4} />

      {/* Sparkles / Dust */}
      <Path
        d="M15 80v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M105 35v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Path
        d="M95 75v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}

export default EmptyCartIllustration;
