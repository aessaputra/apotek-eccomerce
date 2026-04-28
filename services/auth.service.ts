import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete OAuth session for expo-web-browser (native only)
WebBrowser.maybeCompleteAuthSession();

interface SignInInput {
  email: string;
  password: string;
}

interface SignUpInput {
  email: string;
  password: string;
  options?: {
    data?: {
      full_name?: string;
    };
  };
}

interface SignOutInput {
  scope?: 'global' | 'local' | 'others';
}

/** Error shape for Google OAuth — compatible with Supabase AuthError.message */
export interface GoogleAuthError {
  message: string;
  name: string;
}

/** Consistent return type for signInWithGoogle() */
interface GoogleAuthResult {
  data: unknown;
  error: GoogleAuthError | null;
}

const GOOGLE_AUTH_CALLBACK_PATH = 'google-auth';
const GOOGLE_AUTH_REDIRECT_SCHEME = 'apotek-ecommerce';
const PASSWORD_RECOVERY_CALLBACK_PATH = 'reset-password';
const PASSWORD_RECOVERY_REDIRECT_SCHEME = 'apotek-ecommerce';

const INVALID_REFRESH_TOKEN_PATTERNS = [
  'invalid refresh token',
  'refresh token not found',
  'already used',
];

const GOOGLE_NATIVE_REDIRECT_CONFIG_ERROR =
  'Redirect Google OAuth masih mengarah ke localhost. Tambahkan apotek-ecommerce://google-auth ke Supabase Auth Redirect URLs, lalu pastikan Site URL bukan localhost untuk build native.';

function createGoogleNativeRedirectUri() {
  return makeRedirectUri({
    scheme: GOOGLE_AUTH_REDIRECT_SCHEME,
    path: GOOGLE_AUTH_CALLBACK_PATH,
  });
}

export function createPasswordRecoveryRedirectUri() {
  return makeRedirectUri({
    scheme: PASSWORD_RECOVERY_REDIRECT_SCHEME,
    path: PASSWORD_RECOVERY_CALLBACK_PATH,
  });
}

function isLocalhostCallbackUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(?::|\/)/.test(url);
  }
}

function getAuthorizeRedirectTo(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('redirect_to') ?? parsedUrl.searchParams.get('redirectTo');
  } catch {
    return null;
  }
}

export async function signInWithPassword(input: SignInInput) {
  return supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export async function signUp(input: SignUpInput) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: input.options,
  });
}

export async function signOut(options?: SignOutInput) {
  if (!options) {
    return supabase.auth.signOut();
  }

  return supabase.auth.signOut(options);
}

function getErrorStringProperty(error: unknown, property: 'message' | 'name') {
  if (error instanceof Error) {
    return error[property];
  }

  if (typeof error === 'object' && error !== null && property in error) {
    const value = (error as Record<'message' | 'name', unknown>)[property];
    return typeof value === 'string' ? value : '';
  }

  return '';
}

export function isInvalidRefreshTokenError(error: unknown) {
  const name = getErrorStringProperty(error, 'name');
  const message = getErrorStringProperty(error, 'message').toLowerCase();

  return (
    name === 'AuthApiError' &&
    INVALID_REFRESH_TOKEN_PATTERNS.some(pattern => message.includes(pattern))
  );
}

export async function clearLocalAuthSessionForInvalidRefreshToken(error: unknown) {
  if (!isInvalidRefreshTokenError(error)) {
    return false;
  }

  try {
    const { error: signOutError } = await signOut({ scope: 'local' });

    if (signOutError && __DEV__) {
      console.warn('[auth.service] failed to clear stale local session:', signOutError);
    }

    return !signOutError;
  } catch (signOutError) {
    if (__DEV__) {
      console.warn('[auth.service] failed to clear stale local session:', signOutError);
    }

    return false;
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<{ data: unknown; error: GoogleAuthError | null }> {
  try {
    const redirectTo = createPasswordRecoveryRedirectUri();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return {
      data: null,
      error: { message, name: 'PasswordResetRequestError' },
    };
  }
}

export async function updatePassword(
  password: string,
): Promise<{ data: unknown; error: GoogleAuthError | null }> {
  try {
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return {
      data: null,
      error: { message, name: 'UpdatePasswordError' },
    };
  }
}

interface VerifyEmailOtpInput {
  tokenHash: string;
  type: 'email' | 'signup' | 'recovery' | 'invite' | 'email_change';
}

/**
 * Verify email OTP using token hash from deep link.
 * Used for email confirmation, password recovery, etc.
 */
export async function verifyEmailOtp(input: VerifyEmailOtpInput) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: input.tokenHash,
      type: input.type,
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return {
      data: null,
      error: { message, name: 'VerifyOtpError' } as GoogleAuthError,
    };
  }
}

/**
 * Resend verification email to user.
 * Only works for 'signup' and 'email_change' types.
 */
export async function resendVerificationEmail(
  email: string,
  type: 'signup' | 'email_change' = 'signup',
) {
  try {
    const { data, error } = await supabase.auth.resend({
      type,
      email,
    });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return {
      data: null,
      error: { message, name: 'ResendEmailError' } as GoogleAuthError,
    };
  }
}

/**
 * Exchange PKCE authorization code for session.
 * Shared by native (createSessionFromUrl) and web (handleOAuthHashTokens) flows.
 */
async function exchangeCode(
  code: string,
): Promise<{ data: unknown; error: GoogleAuthError | null }> {
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      return { data: null, error: sessionError };
    }

    return { data: sessionData, error: null };
  } catch (thrown: unknown) {
    // GoTrueClient re-throws non-AuthError exceptions (storage/network failures)
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    return { data: null, error: { message, name: 'ExchangeCodeError' } };
  }
}

// Concurrent callers share the same exchange promise; evicted on failure for retry.
const _exchangePromises = new Map<
  string,
  Promise<{ data: unknown; error: GoogleAuthError | null }>
>();

export async function createSessionFromUrl(url: string) {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (__DEV__) {
      console.log('[auth.service] createSessionFromUrl params:', {
        hasCode: Boolean(params?.code),
        errorCode,
      });
    }

    if (Platform.OS !== 'web' && isLocalhostCallbackUrl(url)) {
      return {
        data: null,
        error: {
          message: GOOGLE_NATIVE_REDIRECT_CONFIG_ERROR,
          name: 'OAuthRedirectConfigError',
        } as GoogleAuthError,
      };
    }

    if (errorCode) {
      return {
        data: null,
        error: { message: errorCode, name: 'OAuthCallbackError' } as GoogleAuthError,
      };
    }

    const callbackError = params?.error_code ?? params?.error;
    if (callbackError) {
      return {
        data: null,
        error: { message: callbackError, name: 'OAuthCallbackError' } as GoogleAuthError,
      };
    }

    const code = params?.code;

    if (!code) {
      return {
        data: null,
        error: {
          message: 'Authorization code tidak ditemukan di redirect URL',
          name: 'AuthCodeError',
        } as GoogleAuthError,
      };
    }

    const existing = _exchangePromises.get(code);
    if (existing) {
      if (__DEV__) {
        console.log('[auth.service] Code exchange already in flight, joining');
      }
      return existing;
    }

    const promise = exchangeCode(code).then(result => {
      if (result.error) {
        _exchangePromises.delete(code);
      }
      return result;
    });
    _exchangePromises.set(code, promise);

    return promise;
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);

    if (__DEV__) {
      console.log('[auth.service] createSessionFromUrl exception:', message);
    }

    return {
      data: null,
      error: {
        message: `Gagal memproses callback OAuth: ${message}`,
        name: 'OAuthCallbackParseError',
      } as GoogleAuthError,
    };
  }
}

/**
 * Process OAuth PKCE code from URL on web platform.
 * Called by AuthProvider.init() after redirect from Google OAuth.
 */
export async function handleOAuthHashTokens(): Promise<{
  data: unknown;
  error: GoogleAuthError | null;
} | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) return null;

  // Clean URL before processing to prevent re-processing on refresh
  window.history.replaceState(null, '', window.location.pathname);

  return exchangeCode(code);
}

/**
 * Sign in with Google OAuth.
 * Web: full-page redirect. Native: in-app browser via expo-web-browser.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  let linkingSubscription: ReturnType<typeof Linking.addEventListener> | null = null;
  let resolveLinkingUrl: ((url: string) => void) | null = null;

  try {
    if (Platform.OS === 'web') {
      const webRedirectTo = typeof window !== 'undefined' ? window.location.origin : '';

      const webResult = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: webRedirectTo,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      return {
        data: webResult.data,
        error: webResult.error
          ? { message: webResult.error.message, name: webResult.error.name }
          : null,
      };
    }

    const isAndroid = Platform.OS === 'android';
    let linkingPromise: Promise<string> | null = null;
    const redirectTo = createGoogleNativeRedirectUri();

    if (__DEV__) {
      console.log('[auth.service] Google native redirectTo:', redirectTo);
    }

    // Android only: independent Linking listener as fallback for singleTask race
    // condition where openAuthSessionAsync returns 'dismiss' even on success
    // (expo/expo PR #34160). iOS handles this natively — no listener needed.
    if (isAndroid) {
      linkingPromise = new Promise<string>(resolve => {
        resolveLinkingUrl = resolve;
      });
      linkingSubscription = Linking.addEventListener('url', event => {
        if (__DEV__) {
          console.log('[auth.service] Linking callback received:', event.url);
        }
        if (event.url.startsWith(redirectTo)) {
          resolveLinkingUrl?.(event.url);
        }
      });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { data: null, error };
    }

    if (__DEV__) {
      console.log('[auth.service] Google OAuth URL exists:', Boolean(data?.url));
    }

    if (!data?.url) {
      return {
        data: null,
        error: { message: 'OAuth URL tidak tersedia', name: 'AuthError' },
      };
    }

    const authorizeRedirectTo = getAuthorizeRedirectTo(data.url);

    if (__DEV__) {
      console.log('[auth.service] Google authorize redirect_to:', authorizeRedirectTo);
    }

    if (authorizeRedirectTo && authorizeRedirectTo !== redirectTo) {
      return {
        data: null,
        error: {
          message: GOOGLE_NATIVE_REDIRECT_CONFIG_ERROR,
          name: 'OAuthRedirectConfigError',
        },
      };
    }

    const browserOptions: WebBrowser.WebBrowserOpenOptions = isAndroid
      ? { createTask: false }
      : { showInRecents: true };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, browserOptions);

    if (__DEV__) {
      console.log('[auth.service] openAuthSessionAsync result:', result);
    }

    if (result.type === 'success') {
      return createSessionFromUrl(result.url);
    }

    // Android fallback: wait for Linking event with bounded timeout.
    // On 'dismiss', deep link may still arrive — wait up to 2s for it.
    if (isAndroid && linkingPromise) {
      if (__DEV__) {
        console.log('[auth.service] Android dismiss — waiting for Linking callback...');
      }

      const LINKING_WAIT_MS = 2_000;
      const callbackUrl = await Promise.race([
        linkingPromise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), LINKING_WAIT_MS)),
      ]);

      if (__DEV__) {
        console.log('[auth.service] Android fallback URL:', callbackUrl);
      }

      if (callbackUrl) {
        return createSessionFromUrl(callbackUrl);
      }
    }

    if (result.type === 'locked') {
      return {
        data: null,
        error: {
          message: 'Sesi login Google sedang berjalan. Coba lagi sebentar.',
          name: 'AuthLockedError',
        },
      };
    }

    return {
      data: null,
      error: { message: 'Login Google dibatalkan', name: 'AuthCancelError' },
    };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);

    if (__DEV__) {
      console.log('[auth.service] signInWithGoogle native exception:', message);
    }

    return {
      data: null,
      error: {
        message: `Gagal menjalankan login Google: ${message}`,
        name: 'AuthGoogleError',
      },
    };
  } finally {
    resolveLinkingUrl = null;
    linkingSubscription?.remove();
  }
}
