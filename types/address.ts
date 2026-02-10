import type { Tables } from './supabase';

export type AddressRow = Tables<'addresses'>;

export interface Address extends AddressRow {}

export type AddressInsert = {
  receiver_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  postal_code: string;
  province?: string | null;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  subdistrict_id?: string | null;
  is_default?: boolean;
};

export type AddressUpdate = Partial<AddressInsert> & {
  is_default?: boolean;
};
