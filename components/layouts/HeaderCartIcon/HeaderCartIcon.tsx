import { XStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { getThemeColor } from '@/utils/theme';
import { AntDesign } from '@expo/vector-icons';

const CART_ICON_SIZE = 24;
const MIN_TOUCH_TARGET = 44;

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
    ? getThemeColor(theme, 'white', '#ffffff')
    : getThemeColor(theme, 'background', '#ffffff');
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
        <AntDesign name="shopping-cart" size={CART_ICON_SIZE} color={color} />
      </XStack>
    </XStack>
  );
}
