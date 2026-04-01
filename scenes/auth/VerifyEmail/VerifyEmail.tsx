import { useState, useCallback, useEffect } from 'react';
import { YStack, XStack, Text, useMedia, useTheme, styled, Spinner } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import EmailInput from '@/components/elements/EmailInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { resendVerificationEmail, verifyEmailOtp } from '@/services/auth.service';
import { getAuthErrorMessage, isOtpExpiredError, AuthErrorCode } from '@/constants/auth.errors';
import { PRIMARY_BUTTON_TITLE_STYLE, getCardShadow } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

type VerificationStatus = 'pending' | 'verifying' | 'success' | 'error';

export default function VerifyEmail() {
  const media = useMedia();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    token_hash?: string;
    type?: string;
    error?: string;
  }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const tokenHash = params.token_hash;
    const type = params.type ?? 'email';

    if (tokenHash) {
      setStatus('verifying');
      setError(null);

      verifyEmailOtp({
        tokenHash,
        type: type as 'email' | 'signup' | 'recovery',
      }).then(({ error: verifyError }) => {
        if (verifyError) {
          const errorMessage = getAuthErrorMessage(verifyError);
          setError(errorMessage);
          setStatus('error');

          if (__DEV__) {
            console.log('[VerifyEmail] Verification failed:', verifyError);
          }
          return;
        }

        setStatus('success');

        setTimeout(() => {
          router.replace('/home');
        }, 2000);
      });
    } else if (params.error) {
      const errorMessage = getAuthErrorMessage({ code: params.error });
      setError(errorMessage);
      setStatus('error');
    }
  }, [params, router]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendEmail = useCallback(async () => {
    if (!email || countdown > 0) return;

    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    const { error: resendError } = await resendVerificationEmail(email);

    setResendLoading(false);

    if (resendError) {
      const errorMessage = getAuthErrorMessage(resendError);
      setError(errorMessage);

      if (__DEV__) {
        console.log('[VerifyEmail] Resend failed:', resendError);
      }
      return;
    }

    setResendSuccess(true);
    setCountdown(60);

    setTimeout(() => {
      setResendSuccess(false);
    }, 5000);
  }, [email, countdown]);

  const handleGoToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <YStack gap="$6" alignItems="center" paddingVertical="$8">
            <Spinner size="large" color="$primary" />
            <Text fontSize={16} color="$colorSubtle" textAlign="center">
              Memverifikasi email Anda...
            </Text>
          </YStack>
        );

      case 'success':
        return (
          <YStack gap="$6" alignItems="center" paddingVertical="$8">
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor="rgba(6, 182, 212, 0.1)"
              alignItems="center"
              justifyContent="center">
              <Text fontSize={40}>✓</Text>
            </YStack>
            <YStack gap="$2" alignItems="center">
              <Text fontSize={24} fontWeight="700" color="$color" textAlign="center">
                Verifikasi Berhasil!
              </Text>
              <Text fontSize={15} color="$colorSubtle" textAlign="center">
                Email Anda telah diverifikasi. Mengalihkan ke beranda...
              </Text>
            </YStack>
          </YStack>
        );

      case 'error':
        return (
          <YStack gap="$6" paddingVertical="$4">
            <YStack gap="$4" alignItems="center">
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="rgba(239, 68, 68, 0.1)"
                alignItems="center"
                justifyContent="center">
                <Text fontSize={40}>✕</Text>
              </YStack>
              <YStack gap="$2" alignItems="center">
                <Text fontSize={24} fontWeight="700" color="$color" textAlign="center">
                  Verifikasi Gagal
                </Text>
                <Text fontSize={15} color="$colorSubtle" textAlign="center">
                  Tautan verifikasi tidak valid atau telah kedaluwarsa.
                </Text>
              </YStack>
            </YStack>

            <ErrorMessage message={error} onDismiss={() => setError(null)} dismissible={true} />

            {error && isOtpExpiredError({ message: error, code: AuthErrorCode.OTP_EXPIRED }) && (
              <YStack gap="$4">
                <Text fontSize={14} color="$colorSubtle" textAlign="center">
                  Masukkan email Anda untuk menerima tautan verifikasi baru.
                </Text>
                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  aria-label="Email"
                />
                <Button
                  title={
                    countdown > 0
                      ? `Kirim Ulang (${countdown}s)`
                      : resendLoading
                        ? 'Mengirim...'
                        : 'Kirim Ulang Email'
                  }
                  onPress={handleResendEmail}
                  isLoading={resendLoading}
                  disabled={!email || countdown > 0}
                  paddingVertical={14}
                  borderRadius={12}
                  backgroundColor="$primary"
                  titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
                />
                {resendSuccess && (
                  <Text fontSize={14} color="$success" textAlign="center">
                    Email verifikasi berhasil dikirim ulang!
                  </Text>
                )}
              </YStack>
            )}

            <Button
              title="Kembali ke Login"
              onPress={handleGoToLogin}
              paddingVertical={14}
              borderRadius={12}
              backgroundColor="$surfaceElevated"
              borderColor="$borderColor"
              borderWidth={1}
              titleStyle={{
                ...PRIMARY_BUTTON_TITLE_STYLE,
                color: theme.color?.val ?? '$color',
              }}
            />
          </YStack>
        );

      case 'pending':
      default:
        return (
          <YStack gap="$6" paddingVertical="$4">
            <YStack gap="$4" alignItems="center">
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="rgba(6, 182, 212, 0.1)"
                alignItems="center"
                justifyContent="center">
                <Text fontSize={40}>✉</Text>
              </YStack>
              <YStack gap="$2" alignItems="center">
                <Text fontSize={24} fontWeight="700" color="$color" textAlign="center">
                  Verifikasi Email
                </Text>
                <Text fontSize={15} color="$colorSubtle" textAlign="center">
                  {params.email
                    ? `Kami telah mengirim tautan verifikasi ke ${params.email}. Silakan periksa kotak masuk Anda.`
                    : 'Kami telah mengirim tautan verifikasi ke email Anda. Silakan periksa kotak masuk Anda.'}
                </Text>
              </YStack>
            </YStack>

            <ErrorMessage message={error} onDismiss={() => setError(null)} dismissible={true} />

            {resendSuccess && (
              <Text fontSize={14} color="$success" textAlign="center">
                Email verifikasi berhasil dikirim ulang!
              </Text>
            )}

            <YStack gap="$4">
              <Text fontSize={14} color="$colorSubtle" textAlign="center">
                Tidak menerima email? Periksa folder spam atau kirim ulang.
              </Text>
              <EmailInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                aria-label="Email"
              />
              <Button
                title={
                  countdown > 0
                    ? `Kirim Ulang (${countdown}s)`
                    : resendLoading
                      ? 'Mengirim...'
                      : 'Kirim Ulang Email'
                }
                onPress={handleResendEmail}
                isLoading={resendLoading}
                disabled={!email || countdown > 0}
                paddingVertical={14}
                borderRadius={12}
                backgroundColor="$primary"
                titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
              />
            </YStack>

            <XStack justifyContent="center" paddingTop="$2">
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text fontSize={15} fontWeight="600" color="$primary">
                    Sudah verifikasi? Login sekarang
                  </Text>
                </Pressable>
              </Link>
            </XStack>
          </YStack>
        );
    }
  };

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
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <YStack
              width="100%"
              maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
              gap={media.gtSm ? '$6' : '$5'}>
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
                  Verifikasi Email
                </Text>
              </YStack>

              <YStack
                borderRadius={20}
                paddingVertical={media.gtMd ? 36 : media.gtSm ? 32 : 28}
                paddingHorizontal={media.gtMd ? 40 : media.gtSm ? 32 : 24}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColorHover"
                elevation={4}
                {...getCardShadow(getThemeColor(theme, 'shadowColor'))}
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                {renderContent()}
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
