// Polyfill crypto.subtle.digest for PKCE S256 (must be before @supabase/supabase-js)
import '@/utils/cryptoPolyfill';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import config from '@/utils/config';
import LargeSecureStore from '@/utils/LargeSecureStore';
import type { Database } from '@/types/supabase';

const { supabaseUrl, supabasePublishableKey } = config;

// SSR guard: Expo static rendering (eas update) runs in Node.js where `window`
// doesn't exist. AsyncStorage's web build accesses `window` and crashes.
// @see https://github.com/supabase/supabase/blob/master/examples/auth/quickstarts/expo-react-native-social-auth/lib/supabase.web.ts
const isSSR = typeof window === 'undefined';

// Mobile: LargeSecureStore (AES-256 key in SecureStore, encrypted data in AsyncStorage)
// Web: SSR-safe wrapper around AsyncStorage
// @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
const webStorage = {
  getItem: (key: string) => (isSSR ? null : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (isSSR) return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isSSR) return;
    return AsyncStorage.removeItem(key);
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : new LargeSecureStore();

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
