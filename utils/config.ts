import Constants from 'expo-constants';
import { Env } from '@/types';

const extra = Constants.expoConfig?.extra as
  | {
      env?: Env;
      apiUrl?: string;
      supabaseUrl?: string;
      supabasePublishableKey?: string;
      googleApiKey?: string;
      originLatitude?: number;
      originLongitude?: number;
    }
  | undefined;

const config = {
  env: extra?.env ?? ('development' as Env),
  apiUrl: extra?.apiUrl ?? '',
  supabaseUrl: extra?.supabaseUrl ?? '',
  supabasePublishableKey: extra?.supabasePublishableKey ?? '',
  googleApiKey: extra?.googleApiKey ?? '',
  originLatitude: extra?.originLatitude ?? -6.2146,
  originLongitude: extra?.originLongitude ?? 106.8451,
} as const satisfies {
  env: Env;
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  googleApiKey: string;
  originLatitude: number;
  originLongitude: number;
};

export default config;
