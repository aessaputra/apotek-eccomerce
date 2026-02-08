import Constants from 'expo-constants';
import { Env } from '@/types';

const extra = Constants.expoConfig?.extra as
  | {
      env?: Env;
      apiUrl?: string;
      supabaseUrl?: string;
      supabasePublishableKey?: string;
    }
  | undefined;

const config = {
  env: extra?.env ?? ('development' as Env),
  apiUrl: extra?.apiUrl ?? 'https://example.com',
  supabaseUrl: extra?.supabaseUrl ?? '',
  supabasePublishableKey: extra?.supabasePublishableKey ?? '',
} as const satisfies {
  env: Env;
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export default config;
