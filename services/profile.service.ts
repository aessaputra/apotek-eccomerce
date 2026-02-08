import { supabase } from '@/utils/supabase';
import type { ProfileRow } from '@/types/user';
import type { TablesUpdate } from '@/types/supabase';

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) return null;
  return data as ProfileRow;
}

export type ProfileUpdatePayload = {
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
};

export async function updateProfile(
  userId: string,
  payload: ProfileUpdatePayload,
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  const updatePayload: TablesUpdate<'profiles'> = {
    ...(payload.full_name !== undefined && { full_name: payload.full_name }),
    ...(payload.phone_number !== undefined && { phone_number: payload.phone_number }),
    ...(payload.avatar_url !== undefined && { avatar_url: payload.avatar_url }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) return { data: null, error: error as unknown as Error };
  return { data: data as ProfileRow, error: null };
}
