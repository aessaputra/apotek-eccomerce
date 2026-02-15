import { useState, useEffect, useCallback } from 'react';
import { AppState, Platform, AppStateStatus } from 'react-native';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/services/user.service';
import { signOut as authSignOut, handleOAuthHashTokens } from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import { ADMIN_REJECT_MESSAGE, BANNED_USER_MESSAGE } from '@/constants/auth';
import AppAlertDialog from '@/components/elements/AppAlertDialog';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { dispatch, setUser, setLoggedIn, setChecked, reset } = useAppSlice();

  // State untuk AlertDialog (menggantikan Alert.alert dari react-native)
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const showAlert = useCallback((title: string, description: string) => {
    setAlertTitle(title);
    setAlertDescription(description);
    setAlertOpen(true);
  }, []);

  // Initial session load; set checked when done
  useEffect(() => {
    let mounted = true;

    async function init() {
      // On web: check if URL hash contains OAuth tokens from redirect
      // This happens when Google OAuth redirects back to our origin with #access_token=...
      // We must process these BEFORE calling getCurrentUser to avoid a race condition
      // where init() sets loggedIn=false and triggers a redirect that strips the hash.
      const hashResult = await handleOAuthHashTokens();
      if (hashResult) {
        // Token found and setSession() called.
        // onAuthStateChange will fire SIGNED_IN and set checked/loggedIn.
        // If setSession failed, let onAuthStateChange handle the error state.
        return;
      }

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
          showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
        }
        return;
      }

      if (profile.is_banned) {
        await authSignOut();
        if (mounted) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          dispatch(setChecked(true));
          showAlert('Akun Dinonaktifkan', BANNED_USER_MESSAGE);
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
  }, [dispatch, setUser, setLoggedIn, setChecked, reset, showAlert]);

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
          dispatch(setChecked(true));
        }
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
            dispatch(setUser(undefined));
            dispatch(setLoggedIn(false));
            dispatch(setChecked(true));
            showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
          }
          return;
        }
        if (profile.is_banned) {
          await authSignOut();
          if (mounted) {
            dispatch(setUser(undefined));
            dispatch(setLoggedIn(false));
            dispatch(setChecked(true));
            showAlert('Akun Dinonaktifkan', BANNED_USER_MESSAGE);
          }
          return;
        }
        if (mounted) {
          dispatch(setUser(user));
          dispatch(setLoggedIn(true));
          dispatch(setChecked(true));
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch, setUser, setLoggedIn, setChecked, showAlert]);

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

  return (
    <>
      {children}
      <AppAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title={alertTitle}
        description={alertDescription}
      />
    </>
  );
}
