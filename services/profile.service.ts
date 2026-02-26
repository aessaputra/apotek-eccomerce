import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/utils/supabase';
import type { ProfileRow } from '@/types/user';
import type { TablesUpdate } from '@/types/supabase';

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) return null;
  return data as ProfileRow;
}

/**
 * Ensure a profile row exists for the given auth user.
 * If the profile doesn't exist (e.g. new Google OAuth user where the DB trigger
 * hasn't fired or is missing), create one with sensible defaults from the auth session.
 *
 * @param userId - The auth.users UUID
 * @param email - The user's email (from session)
 * @param fullName - Optional display name (from Google OAuth metadata)
 * @param avatarUrl - Optional avatar URL (from Google OAuth metadata)
 * @returns The profile row (existing or newly created), or null on failure
 */
export async function ensureProfile(
  userId: string,
  email: string,
  fullName?: string | null,
  avatarUrl?: string | null,
): Promise<ProfileRow | null> {
  // Try fetching existing profile first
  const existing = await getProfile(userId);
  if (existing) return existing;

  if (__DEV__) console.log('[Profile] No profile found, creating for:', email);

  // Profile doesn't exist — create one
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName ?? email.split('@')[0] ?? null,
      avatar_url: avatarUrl ?? null,
      role: 'customer',
      is_banned: false,
    })
    .select()
    .single();

  if (error) {
    if (__DEV__) console.error('[Profile] ensureProfile insert error:', error.message);
    // Could be a race condition where trigger already created the profile
    // Retry fetching
    return await getProfile(userId);
  }

  if (__DEV__) console.log('[Profile] Created new profile for:', email);
  return data as ProfileRow;
}

export type ProfileUpdatePayload = {
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
};

/**
 * Validasi file sebelum upload
 */
function validateImageFile(uri: string, fileSize?: number): { valid: boolean; error?: string } {
  // Validasi ekstensi file
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const fileExt = uri.split('.').pop()?.toLowerCase();

  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.',
    };
  }

  // Validasi ukuran file (max 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Ukuran file terlalu besar. Maksimal 5MB.',
    };
  }

  return { valid: true };
}

/**
 * Upload avatar image ke Supabase Storage dan return public URL
 * Menggunakan expo-file-system dengan base64 untuk React Native compatibility
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Validasi file
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      return { url: null, error: new Error('File tidak ditemukan') };
    }

    const validation = validateImageFile(imageUri, fileInfo.size);
    if (!validation.valid) {
      return { url: null, error: new Error(validation.error || 'File tidak valid') };
    }

    // Baca file sebagai base64 (recommended untuk React Native)
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Convert base64 ke ArrayBuffer (required untuk Supabase Storage di React Native)
    const arrayBuffer = decode(base64);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${timestamp}.${fileExt}`;
    const filePath = fileName; // Path relatif dalam bucket

    // Determine content type
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = contentTypeMap[fileExt] || 'image/jpeg';

    // Upload ke Supabase Storage bucket 'avatars'
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true, // Replace existing file if exists
      });

    if (uploadError) {
      return { url: null, error: uploadError as unknown as Error };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

export async function updateProfile(
  userId: string,
  payload: ProfileUpdatePayload,
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  const updatePayload: TablesUpdate<'profiles'> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.full_name !== undefined) updatePayload.full_name = payload.full_name;
  if (payload.phone_number !== undefined) updatePayload.phone_number = payload.phone_number;
  if (payload.avatar_url !== undefined) updatePayload.avatar_url = payload.avatar_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) return { data: null, error: error as unknown as Error };
  return { data: data as ProfileRow, error: null };
}
