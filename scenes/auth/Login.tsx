import { useState } from 'react';
import { YStack, XStack, Text, Image, useMedia } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import OAuthButton from '@/components/elements/OAuthButton';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { signInWithPassword, signInWithGoogle } from '@/services/auth.service';
import { images } from '@/utils/images';
import { validateEmail } from '@/utils/validation';
import { PRIMARY_BUTTON_TITLE_STYLE, CARD_SHADOW } from '@/constants/ui';

export default function Login() {
  const media = useMedia();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

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
      const { error: err } = await signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (err) {
        setError(err.message ?? 'Login gagal. Periksa email dan password.');
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
      // Setelah login berhasil, AuthProvider.onAuthStateChange
      // akan menangani role/ban check dan set Redux state.
    } catch {
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setOauthLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) {
        setError(err.message ?? 'Login dengan Google gagal.');
        return;
      }
      // Setelah setSession berhasil, AuthProvider.onAuthStateChange
      // akan menangani role/ban check dan update Redux state.
    } catch {
      setError('Terjadi kesalahan saat login dengan Google.');
    } finally {
      setOauthLoading(false);
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
              maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
              gap={media.gtSm ? '$6' : '$5'}>
              {/* Logo dengan subtle animation dan responsive sizing */}
              <YStack
                alignItems="center"
                gap={media.gtSm ? '$4' : '$3'}
                animation="quick"
                enterStyle={{ opacity: 0, y: -20, scale: 0.95 }}
                opacity={1}
                y={0}
                scale={1}>
                <Image
                  source={images.logo}
                  width="100%"
                  maxWidth={media.gtMd ? 180 : media.gtSm ? 160 : 120}
                  height={media.gtMd ? 180 : media.gtSm ? 160 : 120}
                  resizeMode="contain"
                />
              </YStack>

              {/* Header dengan enhanced typography */}
              <YStack
                gap="$2"
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
                paddingVertical={media.gtMd ? 36 : media.gtSm ? 32 : 28}
                paddingHorizontal={media.gtMd ? 40 : media.gtSm ? 32 : 24}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$surfaceBorder"
                elevation={4}
                {...CARD_SHADOW}
                gap="$4"
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                {/* Error Message dengan height collapse animation (best practice) */}
                <ErrorMessage message={error} onDismiss={() => setError(null)} dismissible={true} />

                <YStack gap="$4">
                  {/* Email Input dengan enhanced focus states */}
                  <YStack gap="$1.5">
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
                  <YStack gap="$1.5">
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
                gap="$3"
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

              {/* Google OAuth Button dengan enhanced spacing dan responsive width */}
              <YStack
                width="100%"
                maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
                animation="quick"
                enterStyle={{ opacity: 0, y: 10 }}
                opacity={1}
                y={0}>
                <OAuthButton
                  provider="google"
                  onPress={handleGoogleLogin}
                  isLoading={oauthLoading}
                />
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
