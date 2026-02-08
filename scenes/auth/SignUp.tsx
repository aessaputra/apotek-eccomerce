import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import useColorScheme from '@/hooks/useColorScheme';
import Button from '@/components/elements/Button';
import { colors, fonts } from '@/theme';
import { signUp } from '@/services/auth.service';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  inner: {
    paddingTop: 40,
    paddingBottom: 32,
  },
  brandLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
    fontFamily: fonts.openSan.semiBold,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    fontFamily: fonts.openSan.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 28,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 14,
    fontFamily: fonts.openSan.regular,
  },
  inputLast: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    fontFamily: fonts.openSan.semiBold,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    height: 52,
    marginBottom: 20,
  },
  buttonTitle: {
    fontSize: 16,
    fontFamily: fonts.openSan.semiBold,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  link: {
    fontSize: 15,
    fontFamily: fonts.openSan.semiBold,
  },
});

export default function SignUp() {
  const { isDark } = useColorScheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerBg = isDark ? colors.surfaceDark : colors.surfaceLight;
  const cardBg = isDark ? colors.cardDark : colors.cardLight;
  const titleColor = isDark ? colors.textPrimaryDark : colors.textPrimaryLight;
  const subtitleColor = isDark ? colors.textSecondaryDark : colors.textSecondaryLight;
  const brandColor = colors.primary;
  const inputBg = isDark ? colors.cardDark : colors.cardLight;
  const inputBorder = isDark ? colors.borderDark : colors.borderLight;
  const inputColor = isDark ? colors.textPrimaryDark : colors.textPrimaryLight;

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await signUp({
      email: trimmedEmail,
      password,
      options: { data: { full_name: fullName.trim() || undefined } },
    });
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Pendaftaran gagal. Coba lagi.');
      return;
    }
    if (data?.session) {
      router.replace('/(main)/(tabs)');
    } else if (data?.user && !data.session) {
      setError('Periksa email Anda untuk tautan konfirmasi.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.brandLabel, { color: brandColor }]}>APOTEK</Text>
          <Text style={[styles.title, { color: titleColor }]}>Daftar</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Buat akun untuk belanja obat dan layanan kesehatan
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: inputColor,
                },
              ]}
              placeholder="Nama lengkap (opsional)"
              placeholderTextColor={subtitleColor}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: inputColor,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={subtitleColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              style={[
                styles.input,
                styles.inputLast,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: inputColor,
                },
              ]}
              placeholder="Password (min. 6 karakter)"
              placeholderTextColor={subtitleColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Button
              title="Daftar"
              style={[styles.button, { backgroundColor: colors.primary }]}
              titleStyle={[styles.buttonTitle, { color: colors.white }]}
              onPress={handleSubmit}
              isLoading={loading}
              loaderColor={colors.white}
            />
          </View>

          <View style={styles.linkRow}>
            <Link href="/(auth)/login">
              <Text style={[styles.link, { color: colors.primary }]}>Sudah punya akun? Masuk</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
