import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Selesaikan OAuth session untuk expo-web-browser (native only)
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
 * Buat session dari URL redirect OAuth (digunakan oleh native flow).
 *
 * Mendukung dua flow:
 * - **PKCE** (primary, supabase-js v2.39+): URL berisi ?code=XXX → exchangeCodeForSession()
 *   Code verifier disimpan otomatis di storage adapter (LargeSecureStore) saat signInWithOAuth().
 * - **Implicit** (legacy fallback): URL berisi #access_token=...&refresh_token=... → setSession()
 *   Deprecated oleh Supabase — hanya dipertahankan untuk backward compatibility.
 *
 * @param url - URL redirect dari WebBrowser setelah OAuth selesai
 * @returns Session data atau error
 */
async function createSessionFromUrl(url: string) {
  if (__DEV__) console.log('[OAuth] createSessionFromUrl:', url);

  // Parse redirect URL — supports both query params (?code=) and hash fragments (#access_token=)
  const parsed = new URL(url);
  const errorCode =
    parsed.searchParams.get('error_code') ?? parsed.searchParams.get('error') ?? null;

  if (errorCode) {
    if (__DEV__) console.warn('[OAuth] OAuth callback error:', errorCode);
    return {
      data: null,
      error: { message: errorCode, name: 'OAuthCallbackError' },
    };
  }

  // PKCE flow (supabase-js v2.39+): redirect contains ?code=XXX
  const code = parsed.searchParams.get('code');
  if (__DEV__) console.log('[OAuth] code from URL:', code ? `${code.substring(0, 8)}...` : 'null');

  if (code) {
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        if (__DEV__) console.error('[OAuth] exchangeCodeForSession error:', sessionError.message);
        return { data: null, error: sessionError };
      }

      if (__DEV__) console.log('[OAuth] PKCE session created successfully');
      return { data: sessionData, error: null };
    } catch (thrown: unknown) {
      // GoTrueClient._exchangeCodeForSession re-throws non-AuthError exceptions
      // (e.g. storage failures, network errors) at line 1172 of GoTrueClient.ts.
      // These bypass the SDK's own catch block — we MUST catch them here.
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      const stack = thrown instanceof Error ? thrown.stack : undefined;
      if (__DEV__) {
        console.error('[OAuth] exchangeCodeForSession THREW:', message);
        if (stack) console.error('[OAuth] Stack:', stack);
      }
      return { data: null, error: { message, name: 'ExchangeCodeError' } };
    }
  }

  // Implicit flow fallback: redirect contains #access_token=...&refresh_token=...
  const hashParams = new URLSearchParams(parsed.hash.substring(1));
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');

  if (!access_token) {
    return {
      data: null,
      error: {
        message: 'Token tidak ditemukan di redirect URL',
        name: 'AuthTokenError',
      },
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  return { data: sessionData, error: null };
}

/**
 * Proses token/code OAuth dari URL di web.
 * Dipanggil oleh AuthProvider.init() saat halaman pertama kali di-load
 * setelah redirect dari Google OAuth.
 *
 * Mendukung PKCE flow (?code= di query params) dan implicit flow fallback
 * (#access_token= di hash fragment).
 *
 * @returns Session data atau null jika tidak ada token/code
 */
export async function handleOAuthHashTokens(): Promise<{
  data: unknown;
  error: GoogleAuthError | null;
} | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  // PKCE flow (supabase-js v2.39+): redirect contains ?code=XXX in query params
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    // Clean URL before processing to prevent re-processing on refresh
    window.history.replaceState(null, '', window.location.pathname);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        return { data: null, error: sessionError };
      }

      return { data: sessionData, error: null };
    } catch (thrown: unknown) {
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      if (__DEV__) console.error('[OAuth][Web] exchangeCodeForSession THREW:', message);
      return { data: null, error: { message, name: 'ExchangeCodeError' } };
    }
  }

  // Implicit flow fallback: redirect contains #access_token=... in hash
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return null;

  // Ekstrak token dari hash fragment
  const params = new URLSearchParams(hash.substring(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token) return null;

  // Hapus hash dari URL agar tidak di-proses ulang
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  return { data: sessionData, error: null };
}

/**
 * Sign in dengan Google OAuth.
 *
 * Platform-specific flows:
 *
 * **Web:** Full-page redirect (skipBrowserRedirect: false)
 * - Browser navigates ke Google, lalu redirect kembali ke origin dengan ?code=... (PKCE)
 * - Token diproses oleh AuthProvider.init() via handleOAuthHashTokens()
 * - Alasan: WebBrowser popup di-block oleh Google COOP headers
 *
 * **Native (iOS/Android):** In-app browser via WebBrowser.openAuthSessionAsync
 * - Token diekstrak langsung dari redirect URL via createSessionFromUrl()
 * - Tidak ada masalah COOP karena pakai SafariVC/Chrome Custom Tabs
 *
 * @returns Promise dengan session data atau error
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  // === WEB: full-page redirect (avoids COOP popup issue) ===
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

  // === NATIVE: in-app browser via WebBrowser ===
  const redirectTo = makeRedirectUri({
    path: 'google-auth',
  });
  if (__DEV__) console.log('[OAuth] Native redirectTo:', redirectTo);

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
    if (__DEV__) console.error('[OAuth] signInWithOAuth error:', error.message);
    return { data: null, error };
  }

  if (!data?.url) {
    return {
      data: null,
      error: { message: 'OAuth URL tidak tersedia', name: 'AuthError' },
    };
  }

  if (__DEV__) console.log('[OAuth] Opening browser...');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });
  if (__DEV__) console.log('[OAuth] Browser result type:', result.type);

  if (result.type !== 'success') {
    return {
      data: null,
      error: { message: 'Login Google dibatalkan', name: 'AuthCancelError' },
    };
  }

  return createSessionFromUrl(result.url);
}
