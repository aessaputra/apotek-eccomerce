import { useEffect } from 'react';
import { Alert, AppState, Platform, AppStateStatus } from 'react-native';
import { useDispatch } from 'react-redux';
import { supabase } from '@/utils/supabase';
import { getProfile } from '@/services/profile.service';
import { signOut as authSignOut } from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import { profileToUser } from '@/types/user';
import type { Dispatch } from '@/utils/store';

const ADMIN_REJECT_MESSAGE =
  'Hanya customer yang boleh login di app ini. Admin gunakan panel Refine.';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch<Dispatch>();
  const { setUser, setLoggedIn, setChecked, reset } = useAppSlice();

  // Initial session load; set checked when done
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (!session?.user) {
        dispatch(setUser(undefined));
        dispatch(setLoggedIn(false));
        dispatch(setChecked(true));
        return;
      }

      const profile = await getProfile(session.user.id);
      if (!mounted) return;

      if (!profile) {
        dispatch(setUser(undefined));
        dispatch(setLoggedIn(false));
        dispatch(setChecked(true));
        return;
      }

      if (profile.role === 'admin') {
        await authSignOut();
        if (mounted) {
          dispatch(reset());
          dispatch(setChecked(true));
          Alert.alert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
        }
        return;
      }

      if (profile.is_banned) {
        await authSignOut();
        if (mounted) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          dispatch(setChecked(true));
        }
        return;
      }

      const user = profileToUser(profile, session.user.email ?? '');
      dispatch(setUser(user));
      dispatch(setLoggedIn(true));
      dispatch(setChecked(true));
    }

    init();
    return () => {
      mounted = false;
    };
  }, [dispatch, setUser, setLoggedIn, setChecked, reset]);

  // onAuthStateChange
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        dispatch(setUser(undefined));
        dispatch(setLoggedIn(false));
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await getProfile(session.user.id);
        if (!profile) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          return;
        }
        if (profile.role === 'admin') {
          await authSignOut();
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          Alert.alert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
          return;
        }
        if (profile.is_banned) {
          await authSignOut();
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          return;
        }
        const user = profileToUser(profile, session.user.email ?? '');
        dispatch(setUser(user));
        dispatch(setLoggedIn(true));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, setUser, setLoggedIn]);

  // AppState: startAutoRefresh / stopAutoRefresh (React Native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  return <>{children}</>;
}
