import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import config from '@/utils/config';
import LargeSecureStore from '@/utils/LargeSecureStore';
import type { Database } from '@/types/supabase';

const { supabaseUrl, supabasePublishableKey } = config;

const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';

// Mobile: LargeSecureStore (AES-256 key in SecureStore, encrypted data in AsyncStorage)
// Web/Node: AsyncStorage directly (SecureStore not available)
// @see https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
const authStorage = Platform.OS === 'web' || isNode ? AsyncStorage : new LargeSecureStore();

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
