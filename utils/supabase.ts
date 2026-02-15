import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import config from '@/utils/config';
import type { Database } from '@/types/supabase';

const { supabaseUrl, supabasePublishableKey } = config;

const noopStorage = {
  getItem: (_key: string): Promise<string | null> => Promise.resolve(null),
  setItem: (_key: string, _value: string): Promise<void> => Promise.resolve(),
  removeItem: (_key: string): Promise<void> => Promise.resolve(),
};

const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';

const authStorage = isNode ? noopStorage : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // OAuth tokens are extracted manually via WebBrowser + setSession (all platforms)
    // Per Supabase docs: https://supabase.com/docs/guides/auth/quickstarts/react-native
    detectSessionInUrl: false,
  },
});
