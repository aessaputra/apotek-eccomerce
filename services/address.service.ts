import { supabase } from '@/utils/supabase';
import type { Address, AddressInsert, AddressUpdate } from '@/types/address';

/**
 * Get all addresses for a user profile
 */
export async function getAddresses(
  profileId: string,
): Promise<{ data: Address[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error as unknown as Error };
  return { data: data as Address[], error: null };
}

/**
 * Get a single address by ID
 */
export async function getAddress(
  addressId: string,
): Promise<{ data: Address | null; error: Error | null }> {
  const { data, error } = await supabase.from('addresses').select('*').eq('id', addressId).single();

  if (error) return { data: null, error: error as unknown as Error };
  return { data: data as Address, error: null };
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
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('profile_id', profileId);

  if (error) return { error: error as unknown as Error };
  return { error: null };
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
