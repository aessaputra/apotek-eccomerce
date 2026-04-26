import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/utils/supabase';
import type { ProfileRow } from '@/types/user';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

const ensureProfileInFlight = new Map<string, Promise<ProfileRow | null>>();

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error || !data) return null;
    return data as ProfileRow;
  } catch (error) {
    if (__DEV__) console.warn('[ProfileService] getProfile error:', error);
    return null;
  }
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
  const inflight = ensureProfileInFlight.get(userId);
  if (inflight) return inflight;

  const ensurePromise = ensureProfileInternal(userId, email, fullName, avatarUrl);
  ensureProfileInFlight.set(userId, ensurePromise);

  try {
    return await ensurePromise;
  } finally {
    ensureProfileInFlight.delete(userId);
  }
}

async function ensureProfileInternal(
  userId: string,
  email: string,
  fullName?: string | null,
  avatarUrl?: string | null,
): Promise<ProfileRow | null> {
  // Try fetching existing profile first
  const existing = await getProfile(userId);
  if (existing) {
    if (existing.avatar_url || !avatarUrl) return existing;

    const { data, error } = await updateProfile(userId, { avatar_url: avatarUrl });
    if (error) {
      if (__DEV__) console.warn('[Profile] sync Google avatar error:', error.message);
      return existing;
    }

    return data ?? existing;
  }

  if (__DEV__) console.log('[Profile] No profile found, creating for:', email);

  const insertPayload: TablesInsert<'profiles'> = {
    id: userId,
    full_name: fullName ?? email.split('@')[0] ?? null,
    avatar_url: avatarUrl ?? null,
    role: 'customer',
    is_banned: false,
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(insertPayload, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    if (__DEV__) console.error('[Profile] ensureProfile upsert error:', error.message);
  }

  const profile = await getProfile(userId);
  if (!profile) return null;

  if (__DEV__) console.log('[Profile] Ensured profile for:', email);
  return profile;
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

function getSafeFilename(uri: string): string {
  const parts = uri.split('/');
  const originalName = parts[parts.length - 1] || 'image';
  const nameWithoutExt = originalName.split('.').slice(0, -1).join('.') || 'image';
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  return sanitized || 'image';
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
    const file = new File(imageUri);
    if (!file.exists) {
      return { url: null, error: new Error('File tidak ditemukan') };
    }

    const fileSize = file.size > 0 ? file.size : undefined;
    const validation = validateImageFile(imageUri, fileSize);
    if (!validation.valid) {
      return { url: null, error: new Error(validation.error || 'File tidak valid') };
    }

    // Baca file sebagai base64 (recommended untuk React Native)
    const base64 = await file.base64();

    // Convert base64 ke ArrayBuffer (required untuk Supabase Storage di React Native)
    const arrayBuffer = decode(base64);

    const timestamp = Date.now();
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFilename = `${getSafeFilename(imageUri)}.${fileExt}`;
    const fileName = `${userId}-${timestamp}-${safeFilename}`;
    const filePath = `avatars/${fileName}`;

    // Determine content type
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = contentTypeMap[fileExt] || 'image/jpeg';

    // Upload ke Supabase Storage bucket 'media' (path: avatars/)
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true, // Replace existing file if exists
      });

    if (uploadError) {
      return { url: null, error: uploadError as unknown as Error };
    }

    // Get public URL from 'media' bucket
    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

export async function updateProfile(
  userId: string,
  payload: ProfileUpdatePayload,
): Promise<{ data: ProfileRow | null; error: Error | null }> {
  try {
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
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
