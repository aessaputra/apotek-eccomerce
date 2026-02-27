import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete OAuth session for expo-web-browser (native only)
WebBrowser.maybeCompleteAuthSession();

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  options?: {
    data?: {
      full_name?: string;
    };
  };
}

/** Error shape for Google OAuth — compatible with Supabase AuthError.message */
export interface GoogleAuthError {
  message: string;
  name: string;
}

/** Consistent return type for signInWithGoogle() */
export interface GoogleAuthResult {
  data: unknown;
  error: GoogleAuthError | null;
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

export async function signOut() {
  return supabase.auth.signOut();
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

/**
 * Create session from OAuth redirect URL (native PKCE flow).
 * Extracts ?code= param and exchanges it via exchangeCode().
 */
async function createSessionFromUrl(url: string) {
  const parsed = new URL(url);
  const errorCode =
    parsed.searchParams.get('error_code') ?? parsed.searchParams.get('error') ?? null;

  if (errorCode) {
    return {
      data: null,
      error: { message: errorCode, name: 'OAuthCallbackError' },
    };
  }

  const code = parsed.searchParams.get('code');

  if (!code) {
    return {
      data: null,
      error: {
        message: 'Authorization code tidak ditemukan di redirect URL',
        name: 'AuthCodeError',
      },
    };
  }

  return exchangeCode(code);
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
  // Web: full-page redirect (avoids COOP popup issue)
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

  // Native: in-app browser via WebBrowser
  const redirectTo = makeRedirectUri({
    path: 'google-auth',
  });

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

  if (!data?.url) {
    return {
      data: null,
      error: { message: 'OAuth URL tidak tersedia', name: 'AuthError' },
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== 'success') {
    return {
      data: null,
      error: { message: 'Login Google dibatalkan', name: 'AuthCancelError' },
    };
  }

  return createSessionFromUrl(result.url);
}
