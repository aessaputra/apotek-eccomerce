import { supabase } from '@/utils/supabase';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Selesaikan OAuth session untuk expo-web-browser
// Ini penting untuk menutup browser setelah OAuth selesai
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
 * Ekstrak token dari URL redirect OAuth.
 * Supabase mengirim token di hash fragment URL: #access_token=xxx&refresh_token=yyy
 *
 * @param url - URL redirect dari WebBrowser setelah OAuth selesai
 * @returns Object berisi access_token dan refresh_token
 */
function extractTokensFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const hash = parsedUrl.hash.substring(1); // Hapus '#' di awal
  const params = new URLSearchParams(hash);

  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
}

/**
 * Sign in dengan Google OAuth.
 *
 * Flow untuk React Native (sesuai dokumentasi Supabase):
 * 1. Minta OAuth URL dari Supabase dengan skipBrowserRedirect: true
 * 2. Buka URL di WebBrowser (expo-web-browser)
 * 3. Setelah user login di Google, WebBrowser redirect kembali ke app
 * 4. Ekstrak access_token & refresh_token dari URL redirect
 * 5. Panggil supabase.auth.setSession() untuk menetapkan session
 *
 * AuthProvider.onAuthStateChange akan otomatis mendeteksi session baru
 * dan mengupdate Redux store.
 *
 * @returns Promise dengan session data atau error
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectTo = Linking.createURL('/(auth)/login');

  // Untuk React Native (iOS/Android), gunakan WebBrowser
  if (Platform.OS !== 'web') {
    // 1. Dapatkan OAuth URL dari Supabase
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

    // 2. Buka OAuth URL di WebBrowser
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });

    // 3. Handle cancel
    if (result.type !== 'success') {
      return {
        data: null,
        error: { message: 'Login Google dibatalkan', name: 'AuthCancelError' },
      };
    }

    // 4. Ekstrak token dari URL redirect
    const tokens = extractTokensFromUrl(result.url);

    if (!tokens.access_token || !tokens.refresh_token) {
      return {
        data: null,
        error: {
          message: 'Token tidak ditemukan di redirect URL',
          name: 'AuthTokenError',
        },
      };
    }

    // 5. Set session di Supabase client
    // Ini akan trigger onAuthStateChange di AuthProvider
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    if (sessionError) {
      return { data: null, error: sessionError };
    }

    return { data: sessionData, error: null };
  }

  // Untuk web, gunakan browser redirect biasa
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: false,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
}
