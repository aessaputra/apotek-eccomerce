import { supabase } from '@/utils/supabase';
import { getProfile } from '@/services/profile.service';
import { profileToUser } from '@/types/user';
import type { User, ProfileRow } from '@/types/user';

export type CurrentUserResult = {
  user: User;
  profile: ProfileRow;
};

/**
 * Get current user from session + profile.
 * Returns null if no session, no profile, or on error.
 * Use in AuthProvider init/onAuthStateChange or when a screen needs to refresh user data.
 * Returns both user (for Redux/UI) and profile (for role/banned checks) in one fetch.
 */
export async function getCurrentUser(): Promise<CurrentUserResult | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.user) return null;

  const profile = await getProfile(session.user.id);
  if (!profile) return null;

  const user = profileToUser(profile, session.user.email ?? '');
  return { user, profile };
}
