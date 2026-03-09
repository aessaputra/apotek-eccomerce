import Constants from 'expo-constants';
import { Env } from '@/types';

const extra = Constants.expoConfig?.extra as
  | {
      env?: Env;
      apiUrl?: string;
      supabaseUrl?: string;
      supabasePublishableKey?: string;
      biteshipOriginAreaId?: string;
      biteshipCouriers?: string;
    }
  | undefined;

const config = {
  env: extra?.env ?? ('development' as Env),
  apiUrl: extra?.apiUrl ?? '',
  supabaseUrl: extra?.supabaseUrl ?? '',
  supabasePublishableKey: extra?.supabasePublishableKey ?? '',
  biteshipOriginAreaId: extra?.biteshipOriginAreaId ?? '',
  biteshipCouriers: extra?.biteshipCouriers ?? 'jne,jnt,sicepat,anteraja,pos',
} as const satisfies {
  env: Env;
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  biteshipOriginAreaId: string;
  biteshipCouriers: string;
};

export default config;
