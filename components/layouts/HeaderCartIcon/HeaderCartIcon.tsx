import { XStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { getThemeColor } from '@/utils/theme';
import { ICON_SIZES, MIN_TOUCH_TARGET, THEME_FALLBACKS } from '@/constants/ui';
import { CartIcon } from '@/components/icons';

export interface HeaderCartIconProps {
  /** Warna ikon (hex atau token). Default: tema white */
  color?: string;
  /** Tambah padding kanan (untuk headerRight di Stack). Default: false */
  forHeaderRight?: boolean;
}

export default function HeaderCartIcon({
  color: colorProp,
  forHeaderRight = false,
}: HeaderCartIconProps) {
  const theme = useTheme();
  const defaultColor = forHeaderRight
    ? getThemeColor(theme, 'white', THEME_FALLBACKS.white)
    : getThemeColor(theme, 'background', THEME_FALLBACKS.background);
  const color = colorProp ?? defaultColor;
  const router = useRouter();
  return (
    <XStack
      minWidth={MIN_TOUCH_TARGET}
      minHeight={MIN_TOUCH_TARGET}
      alignItems="center"
      justifyContent="center"
      paddingRight={forHeaderRight ? 16 : 0}>
      <XStack
        padding={12}
        alignItems="center"
        justifyContent="center"
        onPress={() => router.push('/(main)/(tabs)/cart')}
        hitSlop={12}
        cursor="pointer"
        accessibilityRole="button"
        accessibilityLabel="Keranjang">
        <CartIcon size={ICON_SIZES.BUTTON} color={color} />
      </XStack>
    </XStack>
  );
}
