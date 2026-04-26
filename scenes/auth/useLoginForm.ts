import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { signInWithGoogle, signInWithPassword } from '@/services/auth.service';
import {
  getAuthErrorMessage,
  isCancellationError,
  isEmailNotVerifiedError,
} from '@/constants/auth.errors';
import { validateEmail } from '@/utils/validation';
import {
  buildLoginMessageRouteParams,
  buildVerifyEmailRouteParams,
  LOGIN_RESET_SUCCESS_MESSAGE,
  normalizeAuthEmail,
} from './authForm.helpers';

const REQUIRED_LOGIN_FIELDS_MESSAGE = 'Email dan password wajib diisi.';
const INVALID_EMAIL_MESSAGE = 'Format email tidak valid.';
const LOGIN_EXCEPTION_MESSAGE = 'Terjadi kesalahan saat login. Silakan coba lagi.';
const GOOGLE_LOGIN_EXCEPTION_MESSAGE =
  'Terjadi kesalahan saat login dengan Google. Silakan coba lagi.';

type LoginRouteSearchParams = {
  resetSuccess?: string | string[];
  error?: string | string[];
};

type LoginSubmissionState = 'idle' | 'submitting';

function getFirstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function shouldMarkEmailField(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  return (
    message.includes('email') ||
    message.includes('invalid login credentials') ||
    message.includes('user not found')
  );
}

function getErrorMessage(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown ?? '');
}

function getResetSuccessMessage(resetSuccess: string | undefined): string | null {
  return resetSuccess === LOGIN_RESET_SUCCESS_MESSAGE ? LOGIN_RESET_SUCCESS_MESSAGE : null;
}

export function useLoginForm() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<LoginRouteSearchParams>();
  const loginMessageParams = useMemo(
    () =>
      buildLoginMessageRouteParams({
        resetSuccess: getFirstRouteParam(routeParams.resetSuccess),
        error: getFirstRouteParam(routeParams.error),
      }),
    [routeParams.error, routeParams.resetSuccess],
  );
  const consumedResetSuccess = useRef<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submissionState, setSubmissionState] = useState<LoginSubmissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    getResetSuccessMessage(loginMessageParams.resetSuccess),
  );

  useEffect(() => {
    const resetSuccess = loginMessageParams.resetSuccess;

    const safeResetSuccessMessage = getResetSuccessMessage(resetSuccess);

    if (!safeResetSuccessMessage || consumedResetSuccess.current === safeResetSuccessMessage) {
      return;
    }

    consumedResetSuccess.current = safeResetSuccessMessage;
    setSuccessMessage(safeResetSuccessMessage);
    router.replace('/(auth)/login');
  }, [loginMessageParams.resetSuccess, router]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailError(false);
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setError(null);
  }, []);

  const handleForgotPasswordPress = useCallback(() => {
    router.push('/(auth)/forgot-password');
  }, [router]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setEmailError(false);
    const trimmedEmail = normalizeAuthEmail(email);

    if (!trimmedEmail || !password) {
      setError(REQUIRED_LOGIN_FIELDS_MESSAGE);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError(true);
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }

    setSubmissionState('submitting');
    try {
      const { error: signInError } = await signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!signInError) {
        return;
      }

      setError(getAuthErrorMessage(signInError));

      if (isEmailNotVerifiedError(signInError)) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: buildVerifyEmailRouteParams(trimmedEmail),
        });
        return;
      }

      if (shouldMarkEmailField(signInError)) {
        setEmailError(true);
      }
    } catch {
      setError(LOGIN_EXCEPTION_MESSAGE);
    } finally {
      setSubmissionState('idle');
    }
  }, [email, password, router]);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
    setOauthLoading(true);
    try {
      const { error: googleError } = await signInWithGoogle();

      if (!googleError) {
        return;
      }

      if (isCancellationError(googleError)) {
        return;
      }

      setError(getAuthErrorMessage(googleError));
    } catch (thrown: unknown) {
      if (__DEV__) {
        console.log('[Login] handleGoogleLogin exception:', thrown);
      }

      const errorMessage = getErrorMessage(thrown);
      if (!isCancellationError({ message: errorMessage })) {
        setError(GOOGLE_LOGIN_EXCEPTION_MESSAGE);
      }
    } finally {
      setOauthLoading(false);
    }
  }, []);

  return {
    email,
    password,
    loading: submissionState === 'submitting',
    oauthLoading,
    error,
    emailError,
    successMessage,
    dismissError,
    dismissSuccessMessage,
    handleEmailChange,
    handlePasswordChange,
    handleForgotPasswordPress,
    handleSubmit,
    handleGoogleLogin,
  };
}
