import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YStack, Text, Image, Spinner, useMedia, useTheme, styled } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import ErrorMessage from '@/components/elements/ErrorMessage';
import PasswordInput from '@/components/elements/PasswordInput';
import {
  AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE,
  AuthErrorCode,
  getAuthErrorMessage,
  getRecoveryTokenFailureMessage,
  isRetryableError,
} from '@/constants/auth.errors';
import { FORM_SCROLL_PADDING, PRIMARY_BUTTON_TITLE_STYLE, getCardShadow } from '@/constants/ui';
import {
  createSessionFromRecoveryCode,
  createSessionFromRecoveryTokens,
  signOut,
  updatePassword,
  verifyEmailOtp,
} from '@/services/auth.service';
import { images } from '@/utils/images';
import { getThemeColor } from '@/utils/theme';
import {
  buildLoginMessageRouteParams,
  LOGIN_RESET_SUCCESS_MESSAGE,
  validateAuthPassword,
} from './authForm.helpers';

const PASSWORD_MISMATCH_MESSAGE = 'Konfirmasi password tidak sama.';
const UPDATE_PASSWORD_EXCEPTION_MESSAGE =
  'Terjadi kesalahan saat memperbarui password. Silakan coba lagi.';
const RESET_PASSWORD_NETWORK_MESSAGE =
  'Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.';
const SIGN_OUT_FAILURE_MESSAGE =
  'Password berhasil diperbarui, tetapi kami gagal mengakhiri sesi reset. Silakan coba lagi.';
const UPDATE_PASSWORD_GENERIC_ERROR_MESSAGE =
  'Password belum dapat diperbarui. Silakan coba lagi atau minta tautan reset baru.';
const PASSWORD_RECOVERY_ROUTE = 'reset-password';

const ALLOWED_UPDATE_PASSWORD_ERROR_CODES = new Set<string>([
  AuthErrorCode.SAME_PASSWORD,
  AuthErrorCode.WEAK_PASSWORD,
  AuthErrorCode.NEW_PASSWORD_SHOULD_BE_DIFFERENT_FROM_THE_OLD_PASSWORD,
  AuthErrorCode.VALIDATION_FAILED,
]);

type ResetPasswordStatus = 'checking' | 'ready' | 'invalid';
type ResetPasswordSubmissionState = 'idle' | 'submitting';
type RecoverySearchParams = {
  token_hash?: string | string[];
  type?: string | string[];
  code?: string | string[];
  access_token?: string | string[];
  refresh_token?: string | string[];
  error?: string | string[];
  error_code?: string | string[];
  error_description?: string | string[];
};

type ParsedRecoveryParams = {
  tokenHash?: string;
  type?: string;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
};

function getFirstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getFirstSearchParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value ?? undefined;
}

function appendSearchParamsFromString(target: URLSearchParams, rawParams: string) {
  const params = new URLSearchParams(rawParams.replace(/^[?#]/, ''));

  params.forEach((value, key) => {
    if (!target.has(key)) {
      target.set(key, value);
    }
  });
}

function getUrlSegments(url: URL) {
  return [url.hostname, ...url.pathname.split('/')].map(segment => segment.trim()).filter(Boolean);
}

function isPasswordRecoveryUrl(url: URL) {
  return getUrlSegments(url).some(segment => segment === PASSWORD_RECOVERY_ROUTE);
}

function getRecoveryParamsFromUrl(url: string | null): ParsedRecoveryParams {
  if (!url) {
    return {};
  }

  try {
    const parsedUrl = new URL(url, 'apotek-ecommerce:///');

    if (!isPasswordRecoveryUrl(parsedUrl)) {
      return {};
    }

    const params = new URLSearchParams(parsedUrl.search);

    if (parsedUrl.hash) {
      appendSearchParamsFromString(params, parsedUrl.hash);
    }

    return {
      tokenHash: getFirstSearchParam(params, 'token_hash'),
      type: getFirstSearchParam(params, 'type'),
      code: getFirstSearchParam(params, 'code'),
      accessToken: getFirstSearchParam(params, 'access_token'),
      refreshToken: getFirstSearchParam(params, 'refresh_token'),
      error: getFirstSearchParam(params, 'error') ?? getFirstSearchParam(params, 'error_code'),
      errorDescription: getFirstSearchParam(params, 'error_description'),
    };
  } catch {
    return {};
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  if (typeof error === 'string') {
    return error;
  }

  return undefined;
}

function getErrorField(error: unknown, field: string): string | number | undefined {
  if (typeof error !== 'object' || error === null || !(field in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function logRecoveryVerificationFailure(context: string, error: unknown) {
  if (!__DEV__) {
    return;
  }

  console.log('[ResetPassword] Recovery verification failed', {
    context,
    code: getErrorField(error, 'code'),
    message: getErrorField(error, 'message'),
    name: getErrorField(error, 'name'),
    status: getErrorField(error, 'status'),
  });
}

function getRecoveryCredentialKey(params: ParsedRecoveryParams): string | null {
  if (params.code) {
    return `code:${params.code}`;
  }

  if (params.tokenHash && params.type === 'recovery') {
    return `token_hash:${params.tokenHash}`;
  }

  if (params.accessToken && params.refreshToken && (!params.type || params.type === 'recovery')) {
    return `session:${params.accessToken}`;
  }

  return null;
}

function getRecoveryVerificationErrorMessage(error: unknown): string {
  if (isRetryableError(error)) {
    return RESET_PASSWORD_NETWORK_MESSAGE;
  }

  return getRecoveryTokenFailureMessage(error) ?? AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE;
}

function getUpdatePasswordErrorMessage(error: unknown): string {
  if (isRetryableError(error)) {
    return RESET_PASSWORD_NETWORK_MESSAGE;
  }

  const errorCode = getErrorCode(error);
  if (errorCode && ALLOWED_UPDATE_PASSWORD_ERROR_CODES.has(errorCode)) {
    return getAuthErrorMessage({ code: errorCode });
  }

  return UPDATE_PASSWORD_GENERIC_ERROR_MESSAGE;
}

export default function ResetPassword() {
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<RecoverySearchParams>();
  const linkingUrl = Linking.useLinkingURL();
  const linkingParams = useMemo(() => getRecoveryParamsFromUrl(linkingUrl), [linkingUrl]);
  const routeParams = useMemo(
    () => ({
      tokenHash: getFirstRouteParam(params.token_hash) ?? linkingParams.tokenHash,
      type: getFirstRouteParam(params.type) ?? linkingParams.type,
      code: getFirstRouteParam(params.code) ?? linkingParams.code,
      accessToken: getFirstRouteParam(params.access_token) ?? linkingParams.accessToken,
      refreshToken: getFirstRouteParam(params.refresh_token) ?? linkingParams.refreshToken,
      error:
        getFirstRouteParam(params.error) ??
        getFirstRouteParam(params.error_code) ??
        linkingParams.error,
      errorDescription:
        getFirstRouteParam(params.error_description) ?? linkingParams.errorDescription,
    }),
    [
      linkingParams.accessToken,
      linkingParams.code,
      linkingParams.error,
      linkingParams.errorDescription,
      linkingParams.refreshToken,
      linkingParams.tokenHash,
      linkingParams.type,
      params.access_token,
      params.code,
      params.error,
      params.error_code,
      params.error_description,
      params.refresh_token,
      params.token_hash,
      params.type,
    ],
  );
  const [status, setStatus] = useState<ResetPasswordStatus>('checking');
  const [submissionState, setSubmissionState] = useState<ResetPasswordSubmissionState>('idle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedRecoveryCredentialRef = useRef<string | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    async function verifyRecoveryToken() {
      const recoveryCredentialKey = getRecoveryCredentialKey(routeParams);

      if (
        recoveryCredentialKey &&
        verifiedRecoveryCredentialRef.current === recoveryCredentialKey
      ) {
        setStatus('ready');
        setError(null);
        return;
      }

      setStatus('checking');
      setError(null);

      if (routeParams.error) {
        setError(
          getRecoveryVerificationErrorMessage({
            code: routeParams.error,
            message: routeParams.errorDescription ?? routeParams.error,
          }),
        );
        setStatus('invalid');
        return;
      }

      if (routeParams.tokenHash && routeParams.type === 'recovery') {
        try {
          const { error: verifyError } = await verifyEmailOtp({
            tokenHash: routeParams.tokenHash,
            type: 'recovery',
          });

          if (!isMounted) {
            return;
          }

          if (verifyError) {
            logRecoveryVerificationFailure('token_hash', verifyError);
            setError(getRecoveryVerificationErrorMessage(verifyError));
            setStatus('invalid');
            return;
          }

          verifiedRecoveryCredentialRef.current = recoveryCredentialKey;
          setStatus('ready');
        } catch (verificationError) {
          if (!isMounted) {
            return;
          }

          logRecoveryVerificationFailure('token_hash_exception', verificationError);
          setError(RESET_PASSWORD_NETWORK_MESSAGE);
          setStatus('invalid');
        }

        return;
      }

      if (routeParams.code) {
        try {
          const { error: exchangeError } = await createSessionFromRecoveryCode(routeParams.code);

          if (!isMounted) {
            return;
          }

          if (exchangeError) {
            logRecoveryVerificationFailure('code', exchangeError);
            setError(getRecoveryVerificationErrorMessage(exchangeError));
            setStatus('invalid');
            return;
          }

          verifiedRecoveryCredentialRef.current = recoveryCredentialKey;
          setStatus('ready');
        } catch (exchangeException) {
          if (!isMounted) {
            return;
          }

          logRecoveryVerificationFailure('code_exception', exchangeException);
          setError(RESET_PASSWORD_NETWORK_MESSAGE);
          setStatus('invalid');
        }

        return;
      }

      if (
        routeParams.accessToken &&
        routeParams.refreshToken &&
        (!routeParams.type || routeParams.type === 'recovery')
      ) {
        try {
          const { error: tokenSessionError } = await createSessionFromRecoveryTokens(
            routeParams.accessToken,
            routeParams.refreshToken,
          );

          if (!isMounted) {
            return;
          }

          if (tokenSessionError) {
            logRecoveryVerificationFailure('implicit_tokens', tokenSessionError);
            setError(getRecoveryVerificationErrorMessage(tokenSessionError));
            setStatus('invalid');
            return;
          }

          verifiedRecoveryCredentialRef.current = recoveryCredentialKey;
          setStatus('ready');
        } catch (tokenSessionException) {
          if (!isMounted) {
            return;
          }

          logRecoveryVerificationFailure('implicit_tokens_exception', tokenSessionException);
          setError(RESET_PASSWORD_NETWORK_MESSAGE);
          setStatus('invalid');
        }

        return;
      }

      if (!routeParams.tokenHash || routeParams.type !== 'recovery') {
        setError(AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE);
        setStatus('invalid');
        return;
      }
    }

    verifyRecoveryToken();

    return () => {
      isMounted = false;
    };
  }, [
    routeParams.accessToken,
    routeParams.code,
    routeParams.error,
    routeParams.errorDescription,
    routeParams.refreshToken,
    routeParams.tokenHash,
    routeParams.type,
  ]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setPasswordError(false);
    setError(null);
  }, []);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordError(false);
    setError(null);
  }, []);

  const handleGoToForgotPassword = useCallback(() => {
    router.replace('/(auth)/forgot-password');
  }, [router]);

  const handleGoToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (loading || status !== 'ready') {
      return;
    }

    setError(null);
    setPasswordError(false);
    setConfirmPasswordError(false);

    const passwordValidation = validateAuthPassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(true);
      setError(passwordValidation.error ?? 'Password tidak valid.');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError(true);
      setError(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    setSubmissionState('submitting');

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        setError(getUpdatePasswordErrorMessage(updateError));
        return;
      }

      const { error: signOutError } = await signOut();

      if (signOutError) {
        setError(SIGN_OUT_FAILURE_MESSAGE);
        return;
      }

      router.replace({
        pathname: '/(auth)/login',
        params: buildLoginMessageRouteParams({ resetSuccess: LOGIN_RESET_SUCCESS_MESSAGE }),
      });
    } catch {
      setError(UPDATE_PASSWORD_EXCEPTION_MESSAGE);
    } finally {
      setSubmissionState('idle');
    }
  }, [confirmPassword, loading, password, router, status]);

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
                  Reset Password
                </Text>
                <Text fontSize={15} color="$colorHover" lineHeight={22}>
                  Buat password baru untuk mengamankan kembali akun Anda.
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
                {status === 'checking' ? (
                  <CheckingRecoveryState />
                ) : status === 'invalid' ? (
                  <InvalidRecoveryState
                    error={error}
                    onGoToForgotPassword={handleGoToForgotPassword}
                    onGoToLogin={handleGoToLogin}
                  />
                ) : (
                  <YStack gap="$4">
                    <ErrorMessage message={error} onDismiss={dismissError} dismissible={true} />

                    <YStack gap="$2">
                      <Text fontSize={14} fontWeight="600" color="$color" letterSpacing={0.2}>
                        Password Baru
                        <Text fontSize={13} fontWeight="400" color="$danger" opacity={0.9}>
                          {' '}
                          *
                        </Text>
                      </Text>
                      <PasswordInput
                        value={password}
                        onChangeText={handlePasswordChange}
                        placeholder="Minimal 6 karakter"
                        error={passwordError}
                        disabled={loading}
                      />
                      <Text fontSize={12} color="$colorHover" lineHeight={18}>
                        Gunakan kombinasi huruf dan angka untuk keamanan lebih baik.
                      </Text>
                    </YStack>

                    <YStack gap="$2">
                      <Text fontSize={14} fontWeight="600" color="$color" letterSpacing={0.2}>
                        Konfirmasi Password
                        <Text fontSize={13} fontWeight="400" color="$danger" opacity={0.9}>
                          {' '}
                          *
                        </Text>
                      </Text>
                      <PasswordInput
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        placeholder="Ulangi password baru"
                        error={confirmPasswordError}
                        disabled={loading}
                      />
                    </YStack>

                    <Button
                      title="Simpan Password Baru"
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
                  </YStack>
                )}
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingWrapper>
      </YStack>
    </SafeAreaView>
  );
}

function CheckingRecoveryState() {
  return (
    <YStack gap="$6" alignItems="center" paddingVertical="$8">
      <Spinner size="large" color="$primary" />
      <Text fontSize={16} color="$colorSubtle" textAlign="center">
        Memeriksa tautan reset password...
      </Text>
    </YStack>
  );
}

type InvalidRecoveryStateProps = {
  error: string | null;
  onGoToForgotPassword: () => void;
  onGoToLogin: () => void;
};

function InvalidRecoveryState({
  error,
  onGoToForgotPassword,
  onGoToLogin,
}: InvalidRecoveryStateProps) {
  return (
    <YStack gap="$6" paddingVertical="$4">
      <YStack gap="$4" alignItems="center">
        <YStack
          width={80}
          height={80}
          borderRadius={40}
          backgroundColor="$dangerSoft"
          alignItems="center"
          justifyContent="center">
          <Text fontSize={40} fontWeight="700" color="$danger" lineHeight={44}>
            ✕
          </Text>
        </YStack>
        <YStack gap="$2" alignItems="center">
          <Text fontSize={24} fontWeight="700" color="$color" textAlign="center">
            Tautan Tidak Valid
          </Text>
          <Text fontSize={15} color="$colorSubtle" textAlign="center" lineHeight={22}>
            {error ?? AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE}
          </Text>
        </YStack>
      </YStack>

      <YStack gap="$3">
        <Button
          title="Minta Tautan Reset Baru"
          onPress={onGoToForgotPassword}
          paddingVertical={14}
          borderRadius={12}
          backgroundColor="$primary"
          titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
        />
        <Button
          title="Kembali ke Login"
          onPress={onGoToLogin}
          paddingVertical={14}
          borderRadius={12}
          backgroundColor="$surfaceElevated"
          borderColor="$borderColor"
          borderWidth={1}
          titleStyle={{
            ...PRIMARY_BUTTON_TITLE_STYLE,
            color: '$color',
          }}
        />
      </YStack>
    </YStack>
  );
}

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  alignSelf: 'stretch',
});
