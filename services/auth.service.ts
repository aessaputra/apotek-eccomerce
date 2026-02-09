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
 * Sign in dengan OAuth provider (Google, Apple, dll).
 *
 * Implementasi sesuai dokumentasi Supabase untuk React Native/Expo:
 * - Menggunakan expo-web-browser untuk mobile (iOS/Android)
 * - Menggunakan browser redirect biasa untuk web
 * - Deep linking akan otomatis dihandle oleh Supabase melalui redirectTo
 *
 * @param provider - OAuth provider ('google' | 'apple')
 * @returns Promise dengan hasil OAuth sign-in
 */
export async function signInWithOAuth(provider: 'google' | 'apple') {
  // Buat redirect URL menggunakan expo-linking
  // Expo akan otomatis generate URL seperti:
  // - Development: exp://localhost:8081/--/(auth)/login
  // - Production: your-app-scheme:///(auth)/login
  const redirectTo = Linking.createURL('/(auth)/login');

  // Untuk React Native (iOS/Android), gunakan WebBrowser
  if (Platform.OS !== 'web') {
    // Dapatkan OAuth URL dari Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Kita handle browser sendiri dengan WebBrowser
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

    // Buka OAuth URL di WebBrowser
    // WebBrowser akan otomatis redirect kembali ke app melalui redirectTo
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // Supabase akan otomatis handle callback melalui deep linking
    // dan onAuthStateChange di AuthProvider akan mendeteksi session baru
    if (result.type === 'cancel') {
      return {
        data: null,
        error: { message: 'OAuth login dibatalkan', name: 'AuthCancelError' },
      };
    }

    // Untuk success, Supabase sudah handle session melalui deep linking
    // Kita return success, session akan diupdate oleh AuthProvider
    return { data: { url: result.url }, error: null };
  }

  // Untuk web, gunakan browser redirect biasa
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
}
