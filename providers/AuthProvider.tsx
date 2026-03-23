import { useState, useEffect, useCallback } from 'react';
import { AppState, Platform, AppStateStatus } from 'react-native';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/services/user.service';
import { signOut as authSignOut, handleOAuthHashTokens } from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import { ADMIN_REJECT_MESSAGE, BANNED_USER_MESSAGE } from '@/constants/auth';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import type { User } from '@/types/user';

export interface AuthProviderProps {
  children: React.ReactNode;
}

/** Max time (ms) to wait for auth init before unblocking the splash screen. */
const INIT_TIMEOUT_MS = 15_000;

export default function AuthProvider({ children }: AuthProviderProps) {
  const { dispatch, setUser, setLoggedIn, setChecked, reset } = useAppSlice();

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const showAlert = useCallback((title: string, description: string) => {
    setAlertTitle(title);
    setAlertDescription(description);
    setAlertOpen(true);
  }, []);

  /** Dispatch auth state to Redux in one call. */
  const dispatchAuth = useCallback(
    (user: User | undefined, loggedIn: boolean) => {
      dispatch(setUser(user));
      dispatch(setLoggedIn(loggedIn));
      dispatch(setChecked(true));
    },
    [dispatch, setUser, setLoggedIn, setChecked],
  );

  /**
   * Validate user result — reject admins and banned users.
   * Returns true if user is allowed, false if rejected.
   */
  const validateAndDispatch = useCallback(
    async (
      user: User,
      profile: { role: string | null; is_banned: boolean },
      mounted: boolean,
    ): Promise<boolean> => {
      if (profile.role === 'admin') {
        await authSignOut();
        if (mounted) {
          dispatchAuth(undefined, false);
          showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
        }
        return false;
      }

      if (profile.is_banned) {
        await authSignOut();
        if (mounted) {
          dispatchAuth(undefined, false);
          showAlert('Akun Dinonaktifkan', BANNED_USER_MESSAGE);
        }
        return false;
      }

      if (mounted) {
        dispatchAuth(user, true);
      }
      return true;
    },
    [dispatchAuth, showAlert],
  );

  // Initial session load (with timeout fallback for offline/slow network)
  useEffect(() => {
    let mounted = true;
    let initTimeoutId: ReturnType<typeof setTimeout> | undefined;

    async function init() {
      let dispatched = false;

      initTimeoutId = setTimeout(() => {
        if (!dispatched && mounted) {
          dispatched = true;
          if (__DEV__) console.warn('[AuthProvider] init timeout — proceeding as unauthenticated');
          dispatchAuth(undefined, false);
        }
      }, INIT_TIMEOUT_MS);

      try {
        const hashResult = await handleOAuthHashTokens();
        if (hashResult) return;

        const result = await getCurrentUser({ createIfMissing: true });
        if (!mounted || dispatched) return;

        if (!result) {
          dispatched = true;
          dispatchAuth(undefined, false);
          return;
        }

        if (result.profile.role === 'admin') {
          await authSignOut();
          if (mounted && !dispatched) {
            dispatched = true;
            dispatch(reset());
            dispatch(setChecked(true));
            showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
          }
          return;
        }

        if (!dispatched) {
          dispatched = true;
          await validateAndDispatch(result.user, result.profile, mounted);
        }
      } catch (error) {
        if (__DEV__) console.warn('[AuthProvider] init error:', error);
        if (mounted && !dispatched) {
          dispatched = true;
          dispatchAuth(undefined, false);
        }
      } finally {
        clearTimeout(initTimeoutId);
      }
    }

    init();
    return () => {
      mounted = false;
      clearTimeout(initTimeoutId);
    };
  }, [dispatch, setChecked, reset, showAlert, dispatchAuth, validateAndDispatch]);

  // Auth state change listener
  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) dispatchAuth(undefined, false);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer with setTimeout(0) to avoid deadlock: exchangeCodeForSession
        // holds processLock while firing SIGNED_IN. PostgREST queries internally
        // call getSession() which tries to acquire the same lock → deadlock.
        setTimeout(async () => {
          try {
            const result = await getCurrentUser({
              createIfMissing: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
              session,
            });
            if (!mounted) return;

            if (!result) {
              dispatchAuth(undefined, false);
              return;
            }

            await validateAndDispatch(result.user, result.profile, mounted);
          } catch (error) {
            if (__DEV__) console.error('[AuthProvider] onAuthStateChange error:', error);
            if (mounted) dispatch(setChecked(true));
          }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch, setChecked, dispatchAuth, validateAndDispatch]);

  // Auto-refresh tokens when app becomes active (React Native only)
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
