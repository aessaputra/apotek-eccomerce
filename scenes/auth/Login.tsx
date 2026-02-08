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
import { colors } from '@/theme';
import { signInWithPassword } from '@/services/auth.service';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayPurple,
    paddingHorizontal: 24,
  },
  darkContainer: {
    backgroundColor: colors.blackGray,
  },
  scroll: {
    flex: 1,
  },
  inner: {
    paddingTop: 48,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    color: colors.darkPurple,
  },
  darkTitle: {
    color: colors.gray,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 32,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    color: colors.black,
    backgroundColor: colors.white,
  },
  darkInput: {
    borderColor: colors.gray,
    color: colors.white,
    backgroundColor: colors.blackGray,
  },
  errorText: {
    color: colors.pink,
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    height: 48,
    backgroundColor: colors.lightPurple,
    marginBottom: 16,
  },
  buttonTitle: {
    fontSize: 16,
    color: colors.white,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  link: {
    fontSize: 14,
    color: colors.lightPurple,
  },
});

export default function Login() {
  const { isDark } = useColorScheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await signInWithPassword({ email: trimmedEmail, password });
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Login gagal. Periksa email dan password.');
      return;
    }
    if (data?.session) {
      router.replace('/(main)/(tabs)');
    }
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, isDark && styles.darkTitle]}>Masuk</Text>
          <Text style={styles.subtitle}>Gunakan akun Anda untuk masuk</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Email"
            placeholderTextColor={colors.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Password"
            placeholderTextColor={colors.gray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Button
            title="Masuk"
            style={styles.button}
            titleStyle={styles.buttonTitle}
            onPress={handleSubmit}
            isLoading={loading}
          />

          <View style={styles.linkRow}>
            <Link href="/(auth)/signup">
              <Text style={styles.link}>Belum punya akun? Daftar</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
