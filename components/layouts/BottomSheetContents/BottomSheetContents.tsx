import GradientButton from '@/components/elements/GradientButton';
import { StyleSheet, View, Text } from 'react-native';
import useColorScheme from '@/hooks/useColorScheme';
import { windowWidth } from '@/utils/deviceInfo';
import { colors, fonts } from '@/theme';
import config from '@/utils/config';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.openSan.bold,
    color: colors.textPrimaryLight,
    marginTop: 16,
    marginBottom: 32,
    width: '100%',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.openSan.regular,
    width: '100%',
  },
  buttonTitle: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  button: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    width: windowWidth / 2,
    backgroundColor: colors.primary,
    marginBottom: 40,
  },
  envContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  envTitle: {
    fontSize: 14,
    fontFamily: fonts.openSan.bold,
    color: colors.textPrimaryLight,
  },
  envValue: {
    fontSize: 14,
    fontFamily: fonts.openSan.regular,
    color: colors.textPrimaryLight,
  },
});

type WelcomeBottomSheetContentsProps = {
  onClose: () => void;
};

export default function BottomSheetContents({ onClose }: WelcomeBottomSheetContentsProps) {
  const { isDark } = useColorScheme();
  return (
    <View style={[styles.root, isDark && { backgroundColor: colors.surfaceDark }]}>
      <Text style={[styles.title, isDark && { color: colors.textPrimaryDark }]}>🎉 Selamat datang! </Text>
      <Text style={[styles.subtitle, { marginBottom: 32 }, isDark && { color: colors.textSecondaryDark }]}>
        Aplikasi Apotek Eccomerce berjalan di environment
        <Text style={{ fontFamily: fonts.openSan.bold }}>{` ${config.env} `}</Text>🚀
      </Text>
      <Text style={[styles.subtitle, { marginBottom: 8 }, isDark && { color: colors.textSecondaryDark }]}>
        Variabel environment yang dimuat:
      </Text>
      {Object.entries(config).map(([key, value]) => (
        <View key={key} style={styles.envContainer}>
          <Text style={[styles.envTitle, isDark && { color: colors.textSecondaryDark }]}>{`✅ ${key}: `}</Text>
          <Text style={[styles.envValue, isDark && { color: colors.textSecondaryDark }]}>{value}</Text>
        </View>
      ))}
      <Text style={[styles.subtitle, { marginVertical: 32 }, isDark && { color: colors.textSecondaryDark }]}>
        {`Setup selesai. Selamat berbelanja di Apotek Eccomerce.\n\nHappy coding!`}
      </Text>
      <GradientButton
        title="OK"
        titleStyle={styles.buttonTitle}
        style={styles.button}
        gradientBackgroundProps={{
          colors: [colors.primary, colors.accent],
          start: { x: 0, y: 1 },
          end: { x: 0.8, y: 0 },
        }}
        onPress={onClose}
      />
    </View>
  );
}
