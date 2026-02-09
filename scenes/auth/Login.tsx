import { useState } from 'react';
import { YStack, XStack, Text, useTheme, Image, AnimatePresence } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Button from '@/components/elements/Button';
import OAuthButton from '@/components/elements/OAuthButton';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import { signInWithPassword, signInWithOAuth } from '@/services/auth.service';
import { getThemeColor } from '@/utils/theme';
import { images } from '@/utils/images';

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);

  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleSubmit() {
    setError(null);
    setEmailError(false);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError(true);
      setError('Format email tidak valid.');
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
        setEmailError(true);
        return;
      }
      if (data?.session) {
        router.replace('/(main)/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    setOauthLoading(provider);
    try {
      const { error: err } = await signInWithOAuth(provider);
      if (err) {
        setError(
          err.message ?? `Login dengan ${provider === 'google' ? 'Google' : 'Apple'} gagal.`,
        );
        setOauthLoading(null);
      }
      // OAuth akan redirect ke browser, jadi tidak perlu handle success di sini
    } catch (err) {
      setError('Terjadi kesalahan saat login.');
      setOauthLoading(null);
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
                  Masuk
                </Text>
                <Text fontSize={15} color="$colorPress" lineHeight={22}>
                  Gunakan akun Anda untuk mengakses layanan kesehatan dan belanja obat dengan aman.
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
                        setError(null);
                      }}
                      placeholder="Password"
                      error={false}
                      disabled={loading}
                    />
                  </YStack>

                  {/* Submit Button dengan enhanced styling */}
                  <Button
                    title="Masuk"
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

                  {/* Sign Up Link di dalam card dengan enhanced styling */}
                  <XStack
                    justifyContent="center"
                    paddingTop="$3"
                    animation="quick"
                    enterStyle={{ opacity: 0 }}
                    opacity={1}>
                    <Link href="/(auth)/signup" asChild>
                      <Pressable>
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          color="$colorPress"
                          letterSpacing={0.2}>
                          Belum punya akun?{' '}
                          <Text fontWeight="800" color="$primary" textDecorationLine="underline">
                            Daftar
                          </Text>
                        </Text>
                      </Pressable>
                    </Link>
                  </XStack>
                </YStack>
              </YStack>

              {/* Divider dengan enhanced styling */}
              <XStack
                alignItems="center"
                space="$3"
                paddingVertical="$3"
                animation="quick"
                enterStyle={{ opacity: 0 }}
                opacity={1}>
                <XStack flex={1} height={1.5} backgroundColor="$surfaceBorder" borderRadius={1} />
                <Text fontSize={13} fontWeight="600" color="$colorPress" letterSpacing={0.5}>
                  ATAU
                </Text>
                <XStack flex={1} height={1.5} backgroundColor="$surfaceBorder" borderRadius={1} />
              </XStack>

              {/* OAuth Buttons dengan enhanced spacing dan responsive width */}
              <YStack
                width="100%"
                maxWidth={400}
                $gtSm={{
                  maxWidth: 450,
                }}
                $gtMd={{
                  maxWidth: 500,
                }}
                space="$3"
                $gtSm={{
                  space: '$4',
                }}
                animation="quick"
                enterStyle={{ opacity: 0, y: 10 }}
                opacity={1}
                y={0}>
                <OAuthButton
                  provider="google"
                  onPress={() => handleOAuth('google')}
                  isLoading={oauthLoading === 'google'}
                />
                <OAuthButton
                  provider="apple"
                  onPress={() => handleOAuth('apple')}
                  isLoading={oauthLoading === 'apple'}
                />
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
