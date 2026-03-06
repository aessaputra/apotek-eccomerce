// Polyfill crypto.subtle.digest for PKCE S256 (must be before @supabase/supabase-js)
import '@/utils/cryptoPolyfill';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import config from '@/utils/config';
import LargeSecureStore from '@/utils/LargeSecureStore';

// Use generated Database type directly for full type safety
import type { Database } from '@/types/supabase';

type PublicSchema = Database['public'];

type TablesWithRelationships = {
  [TableName in keyof PublicSchema['Tables']]: PublicSchema['Tables'][TableName] & {
    Relationships: [];
  };
};

type ViewsWithRelationships = {
  [ViewName in keyof PublicSchema['Views']]: PublicSchema['Views'][ViewName] extends {
    Row: infer Row;
  }
    ? {
        Row: Row;
        Insert: PublicSchema['Views'][ViewName] extends { Insert: infer Insert }
          ? Insert
          : Record<string, never>;
        Update: PublicSchema['Views'][ViewName] extends { Update: infer Update }
          ? Update
          : Record<string, never>;
        Relationships: [];
      }
    : never;
};

type FunctionsCompatible = {
  [FunctionName in keyof PublicSchema['Functions']]: PublicSchema['Functions'][FunctionName] extends {
    Args: infer Args;
    Returns: infer Returns;
  }
    ? {
        Args: Args;
        Returns: Returns;
      }
    : never;
};

type SupabaseDatabase = {
  public: Omit<PublicSchema, 'Tables' | 'Views' | 'Functions'> & {
    Tables: TablesWithRelationships;
    Views: ViewsWithRelationships;
    Functions: FunctionsCompatible;
  };
};

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

// Properly typed Supabase client - uses generated Database types
// db.schema: 'public' is required for type inference to work correctly
export const supabase = createClient<SupabaseDatabase>(supabaseUrl, supabasePublishableKey, {
  db: {
    schema: 'public',
  },
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
