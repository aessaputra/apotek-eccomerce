import React from 'react';
import Svg, { SvgProps, Rect, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export function EmptyAddressIllustration({
  size = 120,
  ...props
}: SvgProps & { size?: number | string }) {
  const theme = useTheme();

  const surfaceColor = getThemeColor(theme, 'surface');
  const primarySoftColor =
    getThemeColor(theme, 'brandPrimarySoft') || getThemeColor(theme, 'primary');
  const borderColor = getThemeColor(theme, 'borderColor');
  const accentColor = getThemeColor(theme, 'colorSubtle');

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none" {...props}>
      <Defs>
        <LinearGradient id="map-pin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surfaceColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primarySoftColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Circle cx="60" cy="105" r="40" fill="rgba(0,0,0,0.03)" />
      <Circle cx="60" cy="105" r="20" fill="rgba(0,0,0,0.02)" />

      <Path
        d="M60 84s-28-20-28-44A28 28 0 0 1 88 40c0 24-28 44-28 44z"
        fill="url(#map-pin-grad)"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Circle cx="60" cy="40" r="10" fill={surfaceColor} stroke={borderColor} strokeWidth="3" />

      <Path
        d="M20 90c10-20 20 0 40-10"
        stroke={accentColor}
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeLinecap="round"
        opacity={0.3}
      />
      <Path
        d="M100 95c-10-15-20-5-40-5"
        stroke={accentColor}
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeLinecap="round"
        opacity={0.3}
      />

      <Path
        d="M25 50v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M95 65v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Circle cx="90" cy="25" r="3" fill={accentColor} opacity={0.3} />
      <Circle cx="30" cy="25" r="2" fill={accentColor} opacity={0.4} />
      <Circle cx="85" cy="85" r="3" fill={accentColor} opacity={0.2} />
    </Svg>
  );
}

export default EmptyAddressIllustration;
