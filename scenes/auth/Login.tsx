import { useState } from 'react';
import { YStack, XStack, Text, Image, useMedia, useTheme, styled } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import OAuthButton from '@/components/elements/OAuthButton';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { signInWithPassword, signInWithGoogle } from '@/services/auth.service';
import {
  getAuthErrorMessage,
  isCancellationError,
  isEmailNotVerifiedError,
} from '@/constants/auth.errors';
import { images } from '@/utils/images';
import { validateEmail } from '@/utils/validation';
import { PRIMARY_BUTTON_TITLE_STYLE, getCardShadow } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

export default function Login() {
  const media = useMedia();
  const theme = useTheme();
  const router = useRouter();
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
        const errorMessage = getAuthErrorMessage(err);
        setError(errorMessage);

        if (isEmailNotVerifiedError(err)) {
          router.push({
            pathname: '/(auth)/verify-email',
            params: { email: trimmedEmail },
          });
          return;
        }

        const lowerMessage = err.message?.toLowerCase() ?? '';
        if (
          lowerMessage.includes('email') ||
          lowerMessage.includes('invalid login credentials') ||
          lowerMessage.includes('user not found')
        ) {
          setEmailError(true);
        }
        return;
      }
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
        if (isCancellationError(err)) return;
        const errorMessage = getAuthErrorMessage(err);
        setError(errorMessage);
        return;
      }
    } catch (thrown: unknown) {
      if (__DEV__) {
        console.log('[Login] handleGoogleLogin exception:', thrown);
      }

      const errorMessage = thrown instanceof Error ? thrown.message : String(thrown ?? '');
      if (!isCancellationError({ message: errorMessage })) {
        setError('Terjadi kesalahan saat login dengan Google. Silakan coba lagi.');
      }
    } finally {
      setOauthLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']}>
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        padding="$4">
        <KeyboardAvoidingWrapper
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
                <Text fontSize={15} color="$colorHover" lineHeight={22}>
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
                borderColor="$borderColorHover"
                elevation={4}
                {...getCardShadow(getThemeColor(theme, 'shadowColor'))}
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
                      aria-label="Email"
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
                    loaderColor="$onPrimary"
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
                          color="$colorSubtle"
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
                <XStack flex={1} height={1.5} backgroundColor="$borderColor" borderRadius={1} />
                <Text fontSize={13} fontWeight="600" color="$colorHover" letterSpacing={0.5}>
                  ATAU
                </Text>
                <XStack flex={1} height={1.5} backgroundColor="$borderColor" borderRadius={1} />
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
        </KeyboardAvoidingWrapper>
      </YStack>
    </SafeAreaView>
  );
}

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  alignSelf: 'stretch',
});
