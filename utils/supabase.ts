import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import config from '@/utils/config';
import type { Database } from '@/types/supabase';

const { supabaseUrl, supabasePublishableKey } = config;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';

// Use SecureStore for mobile, AsyncStorage for web/other (fallback)
// Note: SecureStore is not available on web, so we needPlatform check or try/catch if web support is needed here.
// But since this is a React Native app, we'll assume standard Expo environment.
// For web compatibility in the same codebase, we can check Platform.OS.
import { Platform } from 'react-native';

const authStorage = Platform.OS === 'web' || isNode ? AsyncStorage : ExpoSecureStoreAdapter;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
