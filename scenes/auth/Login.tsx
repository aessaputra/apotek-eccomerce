import { useState } from 'react';
import { YStack, XStack, Text, Input, useTheme } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { signInWithPassword } from '@/services/auth.service';
import { getThemeColor } from '@/utils/theme';

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (err) {
        setError(err.message ?? 'Login gagal. Periksa email dan password.');
        return;
      }
      if (data?.session) {
        router.replace('/(main)/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text
              fontSize={12}
              letterSpacing={1.2}
              marginBottom={8}
              fontWeight="600"
              color="$primary">
              APOTEK
            </Text>
            <Text
              fontSize={32}
              marginBottom={8}
              fontWeight="700"
              letterSpacing={-0.5}
              color="$color">
              Masuk
            </Text>
            <Text fontSize={16} marginBottom={28} color="$colorPress">
              Gunakan akun Anda untuk mengakses layanan
            </Text>

            <YStack
              borderRadius={16}
              paddingVertical={24}
              paddingHorizontal={20}
              marginBottom={24}
              backgroundColor="$backgroundHover"
              shadowColor="$shadowColor"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.06}
              shadowRadius={8}
              elevation={3}>
              {error ? (
                <Text fontSize={14} marginBottom={12} fontWeight="600" color="$red10">
                  {error}
                </Text>
              ) : null}

              <Input
                height={52}
                borderWidth={1.5}
                borderRadius={12}
                paddingHorizontal={16}
                fontSize={16}
                marginBottom={20}
                fontFamily="$body"
                backgroundColor="$background"
                borderColor="$borderColor"
                color="$color"
                placeholder="Email"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
                accessibilityLabel="Email"
              />
              <Input
                height={52}
                borderWidth={1.5}
                borderRadius={12}
                paddingHorizontal={16}
                fontSize={16}
                marginBottom={20}
                fontFamily="$body"
                backgroundColor="$background"
                borderColor="$borderColor"
                color="$color"
                placeholder="Password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                accessibilityLabel="Password"
              />

              <Button
                title="Masuk"
                paddingVertical={14}
                borderRadius={12}
                height={52}
                marginBottom={20}
                backgroundColor="$primary"
                titleStyle={{ color: '$white', fontSize: 16, fontWeight: '600' }}
                onPress={handleSubmit}
                isLoading={loading}
                loaderColor="$white"
              />
            </YStack>

            <XStack flexDirection="row" justifyContent="center" marginTop={8}>
              <Link href="/(auth)/signup">
                <Text fontSize={15} fontWeight="600" color="$primary">
                  Belum punya akun? Daftar
                </Text>
              </Link>
            </XStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
