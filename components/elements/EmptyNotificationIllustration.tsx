import React from 'react';
import Svg, { SvgProps, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export function EmptyNotificationIllustration({
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
        <LinearGradient id="bell-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surfaceColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primarySoftColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Circle cx="60" cy="105" r="40" fill="rgba(0,0,0,0.03)" />
      <Circle cx="60" cy="105" r="20" fill="rgba(0,0,0,0.02)" />

      <Path
        d="M60 20a24 24 0 0 0-24 24v24s-8 12-8 16h64c0-4-8-16-8-16V44a24 24 0 0 0-24-24z"
        fill="url(#bell-grad)"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M52 84a8 8 0 0 0 16 0"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path d="M60 12v8" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />

      <Path
        d="M72 40a12 12 0 0 1-12 12"
        stroke={borderColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={0.5}
      />

      <Path
        d="M15 70v4m-2-2h4"
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
      <Circle cx="95" cy="30" r="3" fill={accentColor} opacity={0.3} />
      <Circle cx="25" cy="35" r="2" fill={accentColor} opacity={0.4} />
      <Circle cx="30" cy="85" r="3" fill={accentColor} opacity={0.2} />
    </Svg>
  );
}

export default EmptyNotificationIllustration;
