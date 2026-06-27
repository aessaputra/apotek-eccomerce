import React from 'react';
import Svg, { SvgProps, Rect, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export function EmptyOrdersIllustration({
  size = 120,
  ...props
}: SvgProps & { size?: number | string; color?: string }) {
  const theme = useTheme();

  const surfaceColor = getThemeColor(theme, 'surface');
  const primarySoftColor =
    getThemeColor(theme, 'brandPrimarySoft') || getThemeColor(theme, 'primary');
  const borderColor = getThemeColor(theme, 'borderColor');
  const accentColor = getThemeColor(theme, 'colorSubtle');

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none" {...props}>
      <Defs>
        <LinearGradient id="receipt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surfaceColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primarySoftColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Circle cx="60" cy="105" r="40" fill="rgba(0,0,0,0.03)" />
      <Circle cx="60" cy="105" r="20" fill="rgba(0,0,0,0.02)" />

      <Path
        d="M36 28h48v60a4 4 0 0 1-6.83 2.83L72 86l-6 6-6-6-6 6-6-6-6 6-6-6-4.83 4.83A4 4 0 0 1 36 88V28z"
        fill="url(#receipt-grad)"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path
        d="M48 44h24M48 56h24M48 68h12"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />

      <Circle cx="90" cy="30" r="16" fill={surfaceColor} stroke={borderColor} strokeWidth="3" />
      <Path
        d="M90 24v6l4 4"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path
        d="M20 70v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.5}
      />
      <Path
        d="M100 80v4m-2-2h4"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Circle cx="24" cy="40" r="3" fill={accentColor} opacity={0.3} />
      <Circle cx="85" cy="75" r="2" fill={accentColor} opacity={0.4} />
    </Svg>
  );
}

export default EmptyOrdersIllustration;
