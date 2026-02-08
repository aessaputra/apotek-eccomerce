import { XStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { getThemeColor } from '@/utils/theme';
import { AntDesign } from '@expo/vector-icons';

const CART_ICON_SIZE = 24;

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
  const color = colorProp ?? getThemeColor(theme, 'background', '#ffffff');
  const router = useRouter();
  return (
    <XStack
      minWidth={44}
      alignItems="center"
      justifyContent="center"
      paddingRight={forHeaderRight ? 16 : 0}>
      <XStack
        padding={8}
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
