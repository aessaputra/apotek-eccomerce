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
      try {
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

        const result = await getCurrentUser({ createIfMissing: true });
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
      } catch (error) {
        // Ensure splash screen is dismissed even on network/auth errors
        console.warn('[AuthProvider] init error:', error);
        if (mounted) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          dispatch(setChecked(true));
        }
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [dispatch, setUser, setLoggedIn, setChecked, reset, showAlert]);

  // onAuthStateChange — with __DEV__ diagnostic logging for OAuth debugging
  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__)
        console.log('[AuthProvider] onAuthStateChange:', event, session?.user?.email ?? 'no-user');

      if (event === 'SIGNED_OUT' || !session?.user) {
        if (__DEV__) console.log('[AuthProvider] Signed out or no session');
        if (mounted) {
          dispatch(setUser(undefined));
          dispatch(setLoggedIn(false));
          dispatch(setChecked(true));
        }
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (__DEV__) console.log('[AuthProvider] Processing event:', event);
        try {
          const result = await getCurrentUser({
            createIfMissing: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
            session,
          });
          if (!mounted) return;
          if (!result) {
            if (__DEV__)
              console.warn('[AuthProvider] getCurrentUser returned null for event:', event);
            dispatch(setUser(undefined));
            dispatch(setLoggedIn(false));
            dispatch(setChecked(true));
            return;
          }
          if (__DEV__)
            console.log(
              '[AuthProvider] getCurrentUser success:',
              result.user.email,
              'role:',
              result.profile.role,
            );
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
        } catch (error) {
          if (__DEV__) console.error('[AuthProvider] onAuthStateChange error:', error);
          // Don't reset login state on error — session exists, retry on next event
          if (mounted) {
            dispatch(setChecked(true));
          }
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
