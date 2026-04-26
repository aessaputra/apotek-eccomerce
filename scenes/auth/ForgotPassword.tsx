import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, YStack, XStack, Text, Image, useMedia, useTheme, styled } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import EmailInput from '@/components/elements/EmailInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { CloseIcon } from '@/components/icons';
import {
  AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE,
  getAuthErrorMessage,
  isPrivacySafeForgotPasswordError,
  isRetryableError,
} from '@/constants/auth.errors';
import { FORM_SCROLL_PADDING, PRIMARY_BUTTON_TITLE_STYLE, getCardShadow } from '@/constants/ui';
import { requestPasswordReset } from '@/services/auth.service';
import { images } from '@/utils/images';
import { getThemeColor } from '@/utils/theme';
import { validateEmail } from '@/utils/validation';
import { normalizeAuthEmail } from './authForm.helpers';

const REQUIRED_EMAIL_MESSAGE = 'Email wajib diisi.';
const INVALID_EMAIL_MESSAGE = 'Format email tidak valid.';
const FORGOT_PASSWORD_EXCEPTION_MESSAGE =
  'Terjadi kesalahan saat meminta reset password. Silakan coba lagi.';

type ForgotPasswordSubmissionState = 'idle' | 'submitting';

export default function ForgotPassword() {
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const successColor = getThemeColor(theme, 'success');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<ForgotPasswordSubmissionState>('idle');
  const loading = submissionState === 'submitting';
  const scrollContentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingBottom: insets.bottom + FORM_SCROLL_PADDING.SPACIOUS + FORM_SCROLL_PADDING.COMPACT,
    }),
    [insets.bottom],
  );

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailError(false);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (loading) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEmailError(false);

    const trimmedEmail = normalizeAuthEmail(email);

    if (!trimmedEmail) {
      setEmailError(true);
      setError(REQUIRED_EMAIL_MESSAGE);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError(true);
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }

    setSubmissionState('submitting');

    try {
      const { error: resetError } = await requestPasswordReset(trimmedEmail);

      if (!resetError || isPrivacySafeForgotPasswordError(resetError)) {
        setSuccessMessage(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE);
        return;
      }

      if (isRetryableError(resetError)) {
        setError(getAuthErrorMessage(resetError));
        return;
      }

      setError(getAuthErrorMessage(resetError));
    } catch {
      setError(FORGOT_PASSWORD_EXCEPTION_MESSAGE);
    } finally {
      setSubmissionState('idle');
    }
  }, [email, loading]);

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
            contentContainerStyle={scrollContentContainerStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <YStack
              width="100%"
              maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
              gap={media.gtSm ? '$6' : '$5'}>
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
                  Lupa Password
                </Text>
                <Text fontSize={15} color="$colorHover" lineHeight={22}>
                  Masukkan email Anda. Jika sesuai, kami akan mengirim tautan untuk membuat password
                  baru dengan aman.
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
                gap="$4"
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                <ForgotPasswordSuccessMessage
                  message={successMessage}
                  onDismiss={dismissSuccessMessage}
                  successColor={successColor}
                />
                <ErrorMessage message={error} onDismiss={dismissError} dismissible={true} />

                <YStack gap="$4">
                  <YStack gap="$2">
                    <Text fontSize={14} fontWeight="600" color="$color" letterSpacing={0.2}>
                      Email
                      <Text fontSize={13} fontWeight="400" color="$danger" opacity={0.9}>
                        {' '}
                        *
                      </Text>
                    </Text>
                    <EmailInput
                      value={email}
                      onChangeText={handleEmailChange}
                      placeholder="contoh@email.com"
                      error={emailError}
                      disabled={loading}
                      keyboardType="email-address"
                      aria-label="Email"
                    />
                    <Text fontSize={12} color="$colorHover" lineHeight={18}>
                      Demi keamanan, pesan keberhasilan tidak memastikan apakah email tersimpan di
                      sistem kami.
                    </Text>
                  </YStack>

                  <Button
                    title="Kirim Tautan Reset"
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

                  <XStack
                    justifyContent="center"
                    paddingTop="$3"
                    animation="quick"
                    enterStyle={{ opacity: 0 }}
                    opacity={1}>
                    <Link href="/(auth)/login" asChild>
                      <Pressable aria-label="Kembali ke Login" role="button">
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          color="$colorSubtle"
                          letterSpacing={0.2}>
                          Ingat password?{' '}
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
        </KeyboardAvoidingWrapper>
      </YStack>
    </SafeAreaView>
  );
}

type ForgotPasswordSuccessMessageProps = {
  message: string | null;
  onDismiss: () => void;
  successColor: string;
};

function ForgotPasswordSuccessMessage({
  message,
  onDismiss,
  successColor,
}: ForgotPasswordSuccessMessageProps) {
  return (
    <AnimatePresence>
      {message && (
        <YStack
          key="forgot-password-success-message"
          overflow="hidden"
          animation="quick"
          enterStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
          exitStyle={{ opacity: 0, maxHeight: 0, scale: 0.95 }}
          opacity={1}
          maxHeight={200}
          scale={1}>
          <XStack
            alignItems="center"
            gap="$2"
            paddingVertical="$3"
            paddingHorizontal="$4"
            backgroundColor="$successSoft"
            borderRadius="$3"
            borderWidth={1}
            borderColor="$success">
            <Text fontSize={18} color="$success" fontWeight="800">
              ✓
            </Text>
            <Text flex={1} fontSize={14} fontWeight="600" color="$success" lineHeight={20}>
              {message}
            </Text>
            <Button
              onPress={onDismiss}
              backgroundColor="$colorTransparent"
              padding={4}
              aria-label="Dismiss success"
              role="button">
              <CloseIcon size={14} color={successColor} />
            </Button>
          </XStack>
        </YStack>
      )}
    </AnimatePresence>
  );
}

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  alignSelf: 'stretch',
});
