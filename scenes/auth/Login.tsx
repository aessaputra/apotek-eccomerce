import { useState } from 'react';
import { YStack, XStack, Text, useTheme, Image } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import OAuthButton from '@/components/elements/OAuthButton';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { signInWithPassword, signInWithOAuth, signOut } from '@/services/auth.service';
import { getCurrentUser } from '@/services/user.service';
import { getThemeColor } from '@/utils/theme';
import { images } from '@/utils/images';
import { validateEmail } from '@/utils/validation';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);

  /**
   * Handles form submission with validation
   * Validates email before calling signInWithPassword service
   */
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
        // Only set emailError if error is email-related
        const errorMessage = err.message?.toLowerCase() ?? '';
        if (
          errorMessage.includes('email') ||
          errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('user not found')
        ) {
          setEmailError(true);
        }
        return;
      }
      if (data?.session) {
        // CRITICAL: Check role BEFORE redirect to prevent admin from getting session token
        const result = await getCurrentUser();
        if (result?.profile.role === 'admin') {
          await signOut();
          setError('Hanya customer yang boleh login di app ini. Admin gunakan panel Refine.');
          return;
        }
        if (result?.profile.is_banned) {
          await signOut();
          setError('Akun Anda telah dinonaktifkan.');
          return;
        }
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
              maxWidth={420}
              $gtSm={{
                maxWidth: 480,
              }}
              $gtMd={{
                maxWidth: 520,
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
                {/* Error Message dengan height collapse animation (best practice) */}
                <ErrorMessage message={error} onDismiss={() => setError(null)} dismissible={true} />

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
                      ...PRIMARY_BUTTON_TITLE_STYLE,
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

              {/* OAuth Buttons side-by-side dengan enhanced spacing dan responsive width */}
              <XStack
                width="100%"
                maxWidth={420}
                $gtSm={{
                  maxWidth: 480,
                }}
                $gtMd={{
                  maxWidth: 520,
                }}
                gap="$3"
                $gtSm={{
                  gap: '$4',
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
              </XStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
