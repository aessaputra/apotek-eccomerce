import { supabase } from '@/utils/supabase';
import type { Address, AddressInsert, AddressUpdate } from '@/types/address';

export interface ByteshipShippingAddress {
  recipient_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  latitude?: number;
  longitude?: number;
}

const DEFAULT_COUNTRY_CODE = 'ID';

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function requireField(value: string | null | undefined, fieldName: string): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw new Error(`Address is missing required field: ${fieldName}`);
  }

  return normalized;
}

export function toByteshipShippingAddress(address: Address): ByteshipShippingAddress {
  const normalized: ByteshipShippingAddress = {
    recipient_name: requireField(address.receiver_name, 'receiver_name'),
    phone_number: requireField(address.phone_number, 'phone_number'),
    street_address: requireField(address.street_address, 'street_address'),
    city: requireField(address.city, 'city'),
    province: requireField(address.province, 'province'),
    postal_code: requireField(address.postal_code, 'postal_code'),
    country_code: (normalizeText(address.country_code) || DEFAULT_COUNTRY_CODE).toUpperCase(),
  };

  if (typeof address.latitude === 'number' && typeof address.longitude === 'number') {
    normalized.latitude = address.latitude;
    normalized.longitude = address.longitude;
  }

  return normalized;
}

/**
 * Get all addresses for a user profile
 */
export async function getAddresses(
  profileId: string,
): Promise<{ data: Address[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Address[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get a single address by ID
 */
export async function getAddress(
  addressId: string,
): Promise<{ data: Address | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Address, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new address
 * If is_default is true, unset other default addresses first
 */
export async function createAddress(
  profileId: string,
  payload: AddressInsert,
): Promise<{ data: Address | null; error: Error | null }> {
  try {
    // If setting as default, unset other default addresses first
    if (payload.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('profile_id', profileId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        ...payload,
        profile_id: profileId,
      })
      .select()
      .single();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Address, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update an existing address
 * If is_default is true, unset other default addresses first
 */
export async function updateAddress(
  addressId: string,
  profileId: string,
  payload: AddressUpdate,
): Promise<{ data: Address | null; error: Error | null }> {
  try {
    // If setting as default, unset other default addresses first
    if (payload.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('profile_id', profileId)
        .eq('is_default', true)
        .neq('id', addressId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .update(payload)
      .eq('id', addressId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Address, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete an address
 */
export async function deleteAddress(
  addressId: string,
  profileId: string,
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('profile_id', profileId);

    if (error) return { error: error as unknown as Error };
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Set an address as default
 * Unsets other default addresses automatically
 */
export async function setDefaultAddress(
  addressId: string,
  profileId: string,
): Promise<{ data: Address | null; error: Error | null }> {
  try {
    // Unset all other default addresses
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('profile_id', profileId)
      .eq('is_default', true)
      .neq('id', addressId);

    // Set this address as default
    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) return { data: null, error: error as unknown as Error };
    return { data: data as Address, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
