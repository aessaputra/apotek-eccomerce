import { useEffect } from 'react';
import { Alert, AppState, Platform, AppStateStatus } from 'react-native';
import { useDispatch } from 'react-redux';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/services/user.service';
import { signOut as authSignOut } from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import type { Dispatch } from '@/utils/store';
import { ADMIN_REJECT_MESSAGE } from '@/constants/auth';

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
      const result = await getCurrentUser();
      if (!mounted) return;

      if (!result) {
        dispatch(setUser(undefined));
        dispatch(setLoggedIn(false));
        dispatch(setChecked(true));
        return;
      }

      const { user, profile } = result;
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
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
        }
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const result = await getCurrentUser();
        if (!mounted) return;
        if (!result) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          return;
        }
        const { user, profile } = result;
        if (profile.role === 'admin') {
          await authSignOut();
          if (mounted) {
            dispatch(setUser(undefined));
            dispatch(setLoggedIn(false));
            Alert.alert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
          }
          return;
        }
        if (profile.is_banned) {
          await authSignOut();
          if (mounted) {
            dispatch(setUser(undefined));
            dispatch(setLoggedIn(false));
          }
          return;
        }
        if (mounted) {
          dispatch(setUser(user));
          dispatch(setLoggedIn(true));
        }
      }
    });

    return () => {
      mounted = false;
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
