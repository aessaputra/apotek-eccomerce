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
  regionalApiUrl: extra?.regionalApiUrl ?? 'https://wilayah.id/api',
  postalDataUrl:
    extra?.postalDataUrl ??
    'https://raw.githubusercontent.com/ArrayAccess/Indonesia-Postal-And-Area/master/data/json/area/62',
  googlePlacesApiUrl: extra?.googlePlacesApiUrl ?? 'https://places.googleapis.com/v1',
  googleGeocodingApiUrl: extra?.googleGeocodingApiUrl ?? 'https://maps.googleapis.com/maps/api',
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
