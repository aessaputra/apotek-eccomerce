import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import useColorScheme from '@/hooks/useColorScheme';
import Button from '@/components/elements/Button';
import { colors } from '@/theme';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  buttonTitle: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: colors.primary,
    height: 44,
    width: '50%',
  },
});

export default function Home() {
  const router = useRouter();
  const { isDark } = useColorScheme();
  return (
    <View style={[styles.root, isDark && { backgroundColor: colors.surfaceDark }]}>
      <View style={styles.content}>
        <Text style={[styles.title, isDark && { color: colors.textSecondaryDark }]}>Beranda</Text>
        <Button
          title="Go to Details"
          titleStyle={styles.buttonTitle}
          style={styles.button}
          onPress={() =>
            router.push({ pathname: '(main)/(tabs)/home/details', params: { from: 'Home' } })
          }
        />
      </View>
    </View>
  );
}
