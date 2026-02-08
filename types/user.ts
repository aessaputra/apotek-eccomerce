import type { Tables } from './supabase';

export type ProfileRow = Tables<'profiles'>;

export interface User {
  id: string;
  email: string;
  /** Alias for full_name for compatibility with components using user.name */
  name: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  role: string | null;
}

/**
 * Map a profile row and email to the User type used in Redux/UI.
 */
export function profileToUser(profile: ProfileRow, email: string): User {
  const name = profile.full_name ?? email ?? '';
  return {
    id: profile.id,
    email,
    name,
    full_name: profile.full_name,
    phone_number: profile.phone_number,
    avatar_url: profile.avatar_url,
    role: profile.role,
  };
}
