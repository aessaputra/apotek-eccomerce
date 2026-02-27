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
 * Get current user from session + profile. Returns null if no session or on error.
 *
 * When `createIfMissing` is true, auto-creates the profile from auth metadata (for OAuth users).
 * When called from onAuthStateChange, pass `session` directly to avoid GoTrueClient lock deadlock.
 */
export async function getCurrentUser(
  options: { createIfMissing?: boolean; session?: Session | null } = {},
): Promise<CurrentUserResult | null> {
  const { createIfMissing = false, session: providedSession } = options;

  // Use provided session or fetch from Supabase.
  // Never call getSession() from inside onAuthStateChange — it deadlocks.
  let session = providedSession;
  if (session === undefined) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }

  if (!session?.user) return null;

  let profile: ProfileRow | null;

  if (createIfMissing) {
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

  if (!profile) return null;

  const user = profileToUser(profile, session.user.email ?? '');
  return { user, profile };
}
