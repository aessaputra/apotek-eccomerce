import { View, Pressable, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import useColorScheme from '@/hooks/useColorScheme';
import { colors } from '@/theme';

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    minWidth: 0,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
  },
});

export default function HeaderSearchAndCart() {
  const { isDark } = useColorScheme();
  const placeholderColor = isDark ? colors.textSecondaryDark : colors.textSecondaryLight;
  const searchBg = isDark ? colors.cardDark : colors.white;

  function onSearchPress() {
    // TODO: navigate to search screen when implemented
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.searchTouchable, { backgroundColor: searchBg }]}
        onPress={onSearchPress}
        accessibilityRole="search"
        accessibilityLabel="Cari produk">
        <AntDesign name="search" size={20} color={placeholderColor} />
        <Text style={[styles.searchPlaceholder, { color: placeholderColor }]}>Cari produk...</Text>
      </Pressable>
      <HeaderCartIcon color={colors.white} />
    </View>
  );
}
