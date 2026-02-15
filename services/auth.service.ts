import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
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
 * Mengekstrak access_token & refresh_token dari URL menggunakan QueryParams
 * dari expo-auth-session, lalu panggil setSession().
 *
 * @param url - URL redirect dari WebBrowser setelah OAuth selesai
 * @returns Session data atau null jika gagal
 */
async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    return {
      data: null,
      error: { message: errorCode, name: 'OAuthCallbackError' },
    };
  }

  const { access_token, refresh_token } = params;

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
    refresh_token,
  });

  if (sessionError) {
    return { data: null, error: sessionError };
  }

  return { data: sessionData, error: null };
}

/**
 * Ekstrak token OAuth dari URL hash di web.
 * Dipanggil oleh AuthProvider.init() saat halaman pertama kali di-load
 * setelah redirect dari Google OAuth.
 *
 * @returns Session data atau null jika tidak ada token / gagal
 */
export async function handleOAuthHashTokens(): Promise<{
  data: unknown;
  error: GoogleAuthError | null;
} | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

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
 * - Browser navigates ke Google, lalu redirect kembali ke origin dengan #access_token=...
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
