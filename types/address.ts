import type { Tables, TablesInsert, TablesUpdate } from './supabase';

/**
 * Address types - using generated Supabase Database types for type safety.
 * Regenerate types when schema changes via Supabase MCP.
 */

export type AddressInsert = Omit<TablesInsert<'addresses'>, 'profile_id'>;

export type AddressUpdate = Omit<TablesUpdate<'addresses'>, 'profile_id'>;

// Row type (returned from .select())
export type Address = Omit<
  Tables<'addresses'>,
  'latitude' | 'longitude' | 'area_id' | 'area_name'
> & {
  area_id?: string | null;
  area_name?: string | null;
  latitude: number | null;
  longitude: number | null;
};
