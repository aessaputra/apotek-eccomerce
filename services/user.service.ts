import { supabase } from '@/utils/supabase';
import { getProfile, ensureProfile } from '@/services/profile.service';
import { profileToUser } from '@/types/user';
import type { User, ProfileRow } from '@/types/user';
import type { Session } from '@supabase/supabase-js';

export type CurrentUserResult = {
  user: User;
  profile: ProfileRow;
};

/**
 * Get current user from session + profile.
 * Returns null if no session or on error.
 *
 * For OAuth users, the profile may not exist yet (DB trigger hasn't fired).
 * When `createIfMissing` is true, auto-creates the profile from auth metadata.
 *
 * IMPORTANT: When called from inside onAuthStateChange callbacks, pass the
 * `session` parameter directly to avoid a deadlock. Supabase's GoTrueClient
 * holds a lock during _notifyAllSubscribers — calling getSession() from within
 * the callback tries to acquire the same lock, causing the app to hang forever.
 *
 * Use in AuthProvider init/onAuthStateChange or when a screen needs to refresh user data.
 * Returns both user (for Redux/UI) and profile (for role/banned checks) in one fetch.
 */
export async function getCurrentUser(
  options: { createIfMissing?: boolean; session?: Session | null } = {},
): Promise<CurrentUserResult | null> {
  const { createIfMissing = false, session: providedSession } = options;

  // Use provided session (from onAuthStateChange) or fetch from Supabase.
  // NEVER call getSession() from inside onAuthStateChange — it deadlocks.
  let session = providedSession;
  if (session === undefined) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  if (!session?.user) return null;

  let profile: ProfileRow | null;

  if (createIfMissing) {
    // Extract Google OAuth metadata for profile creation
    const meta = session.user.user_metadata;
    profile = await ensureProfile(
      session.user.id,
      session.user.email ?? '',
      meta?.full_name ?? meta?.name ?? null,
      meta?.avatar_url ?? meta?.picture ?? null,
    );
  } else {
    profile = await getProfile(session.user.id);
  }

  if (!profile) {
    if (__DEV__) console.warn('[getCurrentUser] Profile missing for:', session.user.email);
    return null;
  }

  const user = profileToUser(profile, session.user.email ?? '');
  return { user, profile };
}
