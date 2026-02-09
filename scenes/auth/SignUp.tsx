import { useState } from 'react';
import { YStack, XStack, Text, useTheme, Image, AnimatePresence } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Button from '@/components/elements/Button';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import { signUp } from '@/services/auth.service';
import { getThemeColor } from '@/utils/theme';
import { images } from '@/utils/images';

export default function SignUp() {
  const theme = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleSubmit() {
    setError(null);
    setEmailError(false);
    setPasswordError(false);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      if (!trimmedEmail) setEmailError(true);
      if (!password) setPasswordError(true);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError(true);
      setError('Format email tidak valid.');
      return;
    }

    if (password.length < 6) {
      setPasswordError(true);
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: fullName.trim() || undefined } },
      });
      if (err) {
        setError(err.message ?? 'Pendaftaran gagal. Coba lagi.');
        setEmailError(true);
        return;
      }
      if (data?.session) {
        router.replace('/(main)/(tabs)');
      } else if (data?.user && !data.session) {
        setError('Periksa email Anda untuk tautan konfirmasi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        padding="$4">
        <KeyboardAvoidingView
          style={{ flex: 1, alignSelf: 'stretch' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <YStack
              width="100%"
              maxWidth={400}
              $gtSm={{
                maxWidth: 450,
              }}
              $gtMd={{
                maxWidth: 500,
              }}
              space="$5"
              $gtSm={{
                space: '$6',
              }}>
              {/* Logo dengan subtle animation dan responsive sizing */}
              <YStack
                alignItems="center"
                space="$3"
                $gtSm={{
                  space: '$4',
                }}
                animation="quick"
                enterStyle={{ opacity: 0, y: -20, scale: 0.95 }}
                opacity={1}
                y={0}
                scale={1}>
                <Image
                  source={images.logo}
                  width="100%"
                  maxWidth={120}
                  height={120}
                  $gtSm={{
                    maxWidth: 160,
                    height: 160,
                  }}
                  $gtMd={{
                    maxWidth: 180,
                    height: 180,
                  }}
                  resizeMode="contain"
                />
              </YStack>

              {/* Header dengan enhanced typography */}
              <YStack
                space="$2"
                animation="quick"
                enterStyle={{ opacity: 0, y: -10 }}
                opacity={1}
                y={0}>
                <Text
                  fontSize={32}
                  fontWeight="800"
                  letterSpacing={-0.8}
                  color="$color"
                  lineHeight={38}>
                  Daftar
                </Text>
                <Text fontSize={15} color="$colorPress" lineHeight={22}>
                  Buat akun baru untuk belanja obat dan layanan kesehatan dengan lebih cepat.
                </Text>
              </YStack>

              {/* Form Card dengan enhanced styling dan responsive padding */}
              <YStack
                borderRadius={20}
                paddingVertical={28}
                paddingHorizontal={24}
                $gtSm={{
                  paddingVertical: 32,
                  paddingHorizontal: 32,
                }}
                $gtMd={{
                  paddingVertical: 36,
                  paddingHorizontal: 40,
                }}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$surfaceBorder"
                shadowColor="$shadowColor"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.08}
                shadowRadius={12}
                elevation={4}
                space="$4"
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                {/* Error Message dengan animation */}
                <AnimatePresence>
                  {error && (
                    <XStack
                      key="error"
                      alignItems="center"
                      space="$2"
                      paddingVertical={12}
                      paddingHorizontal={16}
                      backgroundColor="$dangerSoft"
                      borderRadius={12}
                      borderWidth={1}
                      borderColor="$danger"
                      animation="quick"
                      enterStyle={{ opacity: 0, x: -10, scale: 0.95 }}
                      exitStyle={{ opacity: 0, x: -10, scale: 0.95 }}
                      opacity={1}
                      x={0}
                      scale={1}>
                      <FontAwesome5
                        name="exclamation-circle"
                        size={16}
                        color={getThemeColor(theme, 'danger', '#DC2626')}
                      />
                      <Text flex={1} fontSize={14} fontWeight="600" color="$danger" lineHeight={20}>
                        {error}
                      </Text>
                      <Pressable onPress={() => setError(null)} style={{ padding: 4 }}>
                        <FontAwesome5
                          name="times"
                          size={14}
                          color={getThemeColor(theme, 'danger', '#DC2626')}
                        />
                      </Pressable>
                    </XStack>
                  )}
                </AnimatePresence>

                <YStack space="$4">
                  {/* Full Name Input */}
                  <YStack space="$1.5">
                    <EmailInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Nama lengkap (opsional)"
                      disabled={loading}
                      keyboardType="default"
                      autoCapitalize="words"
                      accessibilityLabel="Nama lengkap"
                    />
                  </YStack>

                  {/* Email Input dengan enhanced focus states */}
                  <YStack space="$1.5">
                    <EmailInput
                      value={email}
                      onChangeText={text => {
                        setEmail(text);
                        setEmailError(false);
                        setError(null);
                      }}
                      placeholder="Email"
                      error={emailError}
                      disabled={loading}
                      keyboardType="email-address"
                      accessibilityLabel="Email"
                    />
                  </YStack>

                  {/* Password Input dengan visibility toggle */}
                  <YStack space="$1.5">
                    <PasswordInput
                      value={password}
                      onChangeText={text => {
                        setPassword(text);
                        setPasswordError(false);
                        setError(null);
                      }}
                      placeholder="Password (min. 6 karakter)"
                      error={passwordError}
                      disabled={loading}
                    />
                  </YStack>

                  {/* Submit Button dengan enhanced styling */}
                  <Button
                    title="Daftar"
                    paddingVertical={16}
                    borderRadius={14}
                    height={56}
                    backgroundColor="$primary"
                    titleStyle={{
                      color: '$white',
                      fontSize: 17,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                    }}
                    onPress={handleSubmit}
                    isLoading={loading}
                    loaderColor="$white"
                    animation="quick"
                    hoverStyle={{
                      backgroundColor: '$primary',
                      scale: 1.02,
                    }}
                    pressStyle={{
                      scale: 0.98,
                    }}
                  />

                  {/* Login Link di dalam card dengan enhanced styling */}
                  <XStack
                    justifyContent="center"
                    paddingTop="$3"
                    animation="quick"
                    enterStyle={{ opacity: 0 }}
                    opacity={1}>
                    <Link href="/(auth)/login" asChild>
                      <Pressable>
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          color="$colorPress"
                          letterSpacing={0.2}>
                          Sudah punya akun?{' '}
                          <Text fontWeight="800" color="$primary" textDecorationLine="underline">
                            Masuk
                          </Text>
                        </Text>
                      </Pressable>
                    </Link>
                  </XStack>
                </YStack>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
