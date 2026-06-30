import Constants from 'expo-constants';
import { Env } from '@/types';

const extra = Constants.expoConfig?.extra as
  | {
      env?: Env;
      supabaseUrl?: string;
      supabasePublishableKey?: string;
      googleApiKey?: string;
      regionalApiUrl?: string;
      postalDataUrl?: string;
      googlePlacesApiUrl?: string;
      googleGeocodingApiUrl?: string;
    }
  | undefined;

const config = {
  env: extra?.env ?? ('development' as Env),
  supabaseUrl: extra?.supabaseUrl ?? '',
  supabasePublishableKey: extra?.supabasePublishableKey ?? '',
  googleApiKey: extra?.googleApiKey ?? '',
  regionalApiUrl: extra?.regionalApiUrl ?? '',
  postalDataUrl: extra?.postalDataUrl ?? '',
  googlePlacesApiUrl: extra?.googlePlacesApiUrl ?? '',
  googleGeocodingApiUrl: extra?.googleGeocodingApiUrl ?? '',
} as const satisfies {
  env: Env;
  supabaseUrl: string;
  supabasePublishableKey: string;
  googleApiKey: string;
  regionalApiUrl: string;
  postalDataUrl: string;
  googlePlacesApiUrl: string;
  googleGeocodingApiUrl: string;
};

export default config;
