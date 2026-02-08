import { Text, View, StyleSheet } from 'react-native';
import GradientButton from '@/components/elements/GradientButton';
import { useRouter, useLocalSearchParams } from 'expo-router';
import useColorScheme from '@/hooks/useColorScheme';
import { colors } from '@/theme';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
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
    height: 44,
    width: '50%',
  },
});

export default function Details() {
  const router = useRouter();
  const { isDark } = useColorScheme();
  const { from } = useLocalSearchParams();
  return (
    <View style={[styles.root, isDark && { backgroundColor: colors.surfaceDark }]}>
      <Text
        style={[
          styles.title,
          isDark && { color: colors.textSecondaryDark },
        ]}>{`Details (from ${from})`}</Text>
      <GradientButton
        title="Go back to Home"
        titleStyle={[styles.buttonTitle, isDark && { color: colors.surfaceDark }]}
        style={styles.button}
        gradientBackgroundProps={{
          colors: [colors.primary, colors.accent],
          start: { x: 0, y: 1 },
          end: { x: 0.8, y: 0 },
        }}
        onPress={() => router.back()}
      />
    </View>
  );
}
