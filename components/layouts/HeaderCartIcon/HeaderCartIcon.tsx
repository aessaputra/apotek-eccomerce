import { Text, XStack, YStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { getThemeColor } from '@/utils/theme';
import { ICON_SIZES, MIN_TOUCH_TARGET, THEME_FALLBACKS } from '@/constants/ui';
import { CartIcon } from '@/components/icons';
import { useCartPaginated } from '@/hooks';
import { useAppSlice } from '@/slices';

export interface HeaderCartIconProps {
  /** Warna ikon (hex atau token). Default: warna teks tema aktif */
  color?: string;
  /** Tambah padding kanan (untuk headerRight di Stack). Default: false */
  forHeaderRight?: boolean;
}

export default function HeaderCartIcon({
  color: colorProp,
  forHeaderRight = false,
}: HeaderCartIconProps) {
  const theme = useTheme();
  const defaultColor = getThemeColor(theme, 'color', THEME_FALLBACKS.color);
  const color = colorProp ?? defaultColor;
  const router = useRouter();
  const { user } = useAppSlice();
  const { snapshot: cartSnapshot } = useCartPaginated({ userId: user?.id });

  const cartItemCount = cartSnapshot.itemCount;
  const cartItemCountLabel = cartItemCount > 99 ? '99+' : cartItemCount;

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
        onPress={() => router.push('/cart')}
        hitSlop={12}
        cursor="pointer"
        role="button"
        aria-label="Keranjang">
        <CartIcon size={ICON_SIZES.BUTTON} color={color} />
        {cartItemCount > 0 && (
          <YStack
            position="absolute"
            top={4}
            right={4}
            backgroundColor="$primary"
            borderRadius={100}
            borderWidth={1.5}
            borderColor="$surface"
            minWidth={18}
            height={18}
            justifyContent="center"
            alignItems="center"
            px={cartItemCount > 9 ? '$1.5' : 0}
            zIndex={10}
            pointerEvents="none">
            <Text color="$onPrimary" fontSize={9} fontWeight="900" lineHeight={11}>
              {cartItemCountLabel}
            </Text>
          </YStack>
        )}
      </XStack>
    </XStack>
  );
}
