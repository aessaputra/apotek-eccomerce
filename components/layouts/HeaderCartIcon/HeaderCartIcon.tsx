import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { colors } from '@/theme';

const CART_ICON_SIZE = 24;

const styles = StyleSheet.create({
  wrapper: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withRightPadding: {
    paddingRight: 16,
  },
  touchable: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export interface HeaderCartIconProps {
  /** Warna ikon. Default: colors.white */
  color?: string;
  /** Tambah padding kanan (untuk headerRight di Stack). Default: false */
  forHeaderRight?: boolean;
}

export default function HeaderCartIcon({
  color = colors.white,
  forHeaderRight = false,
}: HeaderCartIconProps) {
  const router = useRouter();
  return (
    <View style={[styles.wrapper, forHeaderRight && styles.withRightPadding]}>
      <Pressable
        style={styles.touchable}
        onPress={() => router.push('/(main)/(tabs)/cart')}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Keranjang">
        <AntDesign name="shopping-cart" size={CART_ICON_SIZE} color={color} />
      </Pressable>
    </View>
  );
}
