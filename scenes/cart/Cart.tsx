import { Text, View, StyleSheet } from 'react-native';
import useColorScheme from '@/hooks/useColorScheme';
import { colors, fonts } from '@/theme';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.openSan.semiBold,
    color: colors.textPrimaryLight,
    textAlign: 'center',
  },
});

export default function Cart() {
  const { isDark } = useColorScheme();
  return (
    <View style={[styles.root, isDark && { backgroundColor: colors.surfaceDark }]}>
      <Text style={[styles.title, isDark && { color: colors.textPrimaryDark }]}>
        Keranjang belanja Anda.
      </Text>
    </View>
  );
}
