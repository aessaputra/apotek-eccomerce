import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform, AppStateStatus } from 'react-native';
import { supabase } from '@/utils/supabase';
import { clearExpoPushToken, syncExpoPushTokenIfPermitted } from '@/services/notification.service';
import { getCurrentUser } from '@/services/user.service';
import {
  clearLocalAuthSessionForInvalidRefreshToken,
  getMfaAssuranceLevel,
  signOut as authSignOut,
  handleOAuthHashTokens,
  requiresMfaChallenge,
} from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import { ADMIN_REJECT_MESSAGE, BANNED_USER_MESSAGE } from '@/constants/auth';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import type { User } from '@/types/user';

export interface AuthProviderProps {
  children: React.ReactNode;
}

/** Max time (ms) to wait for auth init before unblocking the splash screen. */
const INIT_TIMEOUT_MS = 15_000;

const MFA_RESOLVE_TIMEOUT_MS = 10_000;

export default function AuthProvider({ children }: AuthProviderProps) {
  const { dispatch, setUser, setAuthPhase, reset, authPhase } = useAppSlice();
  const lastAuthenticatedUserIdRef = useRef<string | null>(null);
  const authResolutionGenerationRef = useRef(0);
  const pendingAuthTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authPhaseRef = useRef(authPhase);

  useEffect(() => {
    authPhaseRef.current = authPhase;
  }, [authPhase]);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const showAlert = useCallback((title: string, description: string) => {
    setAlertTitle(title);
    setAlertDescription(description);
    setAlertOpen(true);
  }, []);

  const dispatchUserAndPhase = useCallback(
    (user: User | undefined, phase: import('@/slices/app.slice').AuthPhase) => {
      dispatch(setUser(user));
      dispatch(setAuthPhase(phase));
    },
    [dispatch, setUser, setAuthPhase],
  );

  const resolveMfaPhase = useCallback(
    async (mountedRef: { current: boolean }): Promise<'requires-mfa' | 'authenticated'> => {
      const timeoutResult: Awaited<ReturnType<typeof getMfaAssuranceLevel>> = {
        data: null,
        error: { message: 'MFA resolve timeout', name: 'MfaTimeoutError' },
      };
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<typeof timeoutResult>(resolve => {
        timeoutId = setTimeout(() => {
          if (__DEV__)
            console.warn('[AuthProvider] MFA resolve timeout — falling back to requires-mfa');
          resolve(timeoutResult);
        }, MFA_RESOLVE_TIMEOUT_MS);
      });

      const { data, error } = await Promise.race([getMfaAssuranceLevel(), timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!mountedRef.current) {
        return 'requires-mfa';
      }

      if (error) {
        if (__DEV__) console.warn('[AuthProvider] MFA assurance level check error:', error);
        return 'requires-mfa';
      }

      return requiresMfaChallenge(data ?? {}) ? 'requires-mfa' : 'authenticated';
    },
    [],
  );

  /**
   * Validate user result — reject admins and banned users.
   * Returns true if user is allowed, false if rejected.
   */
  const validateAndDispatch = useCallback(
    async (
      user: User,
      profile: { role: string | null; is_banned: boolean },
      mountedRef: { current: boolean },
      event: string,
      canDispatch: () => boolean = () => mountedRef.current,
    ): Promise<boolean> => {
      if (!canDispatch()) {
        return false;
      }

      const previousUserId = lastAuthenticatedUserIdRef.current;
      lastAuthenticatedUserIdRef.current = user.id;

      if (profile.role === 'admin') {
        await authSignOut();
        if (canDispatch()) {
          dispatchUserAndPhase(undefined, 'signed-out');
          showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
        }
        return false;
      }

      if (profile.is_banned) {
        await authSignOut();
        if (canDispatch()) {
          dispatchUserAndPhase(undefined, 'signed-out');
          showAlert('Akun Dinonaktifkan', BANNED_USER_MESSAGE);
        }
        return false;
      }

      if (canDispatch()) {
        const currentPhase = authPhaseRef.current;
        const isRefresh = event === 'TOKEN_REFRESHED';
        const alreadyAuthenticated = currentPhase === 'authenticated';
        const sameUser = previousUserId === user.id;

        if (isRefresh && alreadyAuthenticated && sameUser) {
          return true;
        }

        if (currentPhase === 'requires-mfa') {
          return true;
        }

        dispatchUserAndPhase(user, 'checking-mfa');
      }
      return true;
    },
    [dispatchUserAndPhase, showAlert],
  );

  // Initial session load (with timeout fallback for offline/slow network)
  useEffect(() => {
    let initTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const mountedRef = { current: true };
    authResolutionGenerationRef.current += 1;
    const initGeneration = authResolutionGenerationRef.current;

    function canDispatch() {
      return mountedRef.current && authResolutionGenerationRef.current === initGeneration;
    }

    async function init() {
      let dispatched = false;

      initTimeoutId = setTimeout(() => {
        if (!dispatched && canDispatch()) {
          dispatched = true;
          if (__DEV__) console.warn('[AuthProvider] init timeout — proceeding as unauthenticated');
          dispatchUserAndPhase(undefined, 'signed-out');
        }
      }, INIT_TIMEOUT_MS);

      try {
        const hashResult = await handleOAuthHashTokens();
        if (hashResult) {
          if (hashResult.error) {
            if (__DEV__) console.warn('[AuthProvider] OAuth callback error:', hashResult.error);
            dispatched = true;
            if (canDispatch()) {
              dispatchUserAndPhase(undefined, 'signed-out');
            }
          } else {
            dispatched = true;
            const result = await getCurrentUser({ createIfMissing: true });
            if (!result) {
              if (canDispatch()) {
                dispatchUserAndPhase(undefined, 'signed-out');
              }
            } else if (result.profile.role === 'admin' || result.profile.is_banned) {
              await authSignOut();
              if (canDispatch()) {
                dispatchUserAndPhase(undefined, 'signed-out');
                showAlert(
                  result.profile.role === 'admin' ? 'Akses Ditolak' : 'Akun Dinonaktifkan',
                  result.profile.role === 'admin' ? ADMIN_REJECT_MESSAGE : BANNED_USER_MESSAGE,
                );
              }
            } else {
              const isAllowed = await validateAndDispatch(
                result.user,
                result.profile,
                mountedRef,
                'SIGNED_IN',
                canDispatch,
              );
              if (isAllowed && canDispatch()) {
                const mfaPhase = await resolveMfaPhase(mountedRef);
                if (canDispatch()) {
                  dispatch(setAuthPhase(mfaPhase));
                }
              }
            }
          }
          return;
        }

        const result = await getCurrentUser({ createIfMissing: true });
        if (!canDispatch() || dispatched) return;

        if (!result) {
          dispatched = true;
          dispatchUserAndPhase(undefined, 'signed-out');
          return;
        }

        if (result.profile.role === 'admin') {
          lastAuthenticatedUserIdRef.current = result.user.id;
          await authSignOut();
          if (canDispatch() && !dispatched) {
            dispatched = true;
            dispatch(reset());
            showAlert('Akses Ditolak', ADMIN_REJECT_MESSAGE);
          }
          return;
        }

        if (!dispatched) {
          dispatched = true;
          const isAllowed = await validateAndDispatch(
            result.user,
            result.profile,
            mountedRef,
            'INITIAL_SESSION',
            canDispatch,
          );

          if (isAllowed && canDispatch()) {
            const mfaPhase = await resolveMfaPhase(mountedRef);
            if (canDispatch()) {
              dispatch(setAuthPhase(mfaPhase));
            }
          }
        }
      } catch (error) {
        if (__DEV__) console.warn('[AuthProvider] init error:', error);
        await clearLocalAuthSessionForInvalidRefreshToken(error);
        if (canDispatch() && !dispatched) {
          dispatched = true;
          dispatchUserAndPhase(undefined, 'signed-out');
        }
      } finally {
        clearTimeout(initTimeoutId);
      }
    }

    init();
    return () => {
      mountedRef.current = false;
      clearTimeout(initTimeoutId);
    };
  }, [dispatch, reset, showAlert, dispatchUserAndPhase, validateAndDispatch, resolveMfaPhase]);

  // Auth state change listener
  useEffect(() => {
    const mountedRef = { current: true };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authResolutionGenerationRef.current += 1;
      const authResolutionGeneration = authResolutionGenerationRef.current;

      function canDispatch() {
        return (
          mountedRef.current && authResolutionGenerationRef.current === authResolutionGeneration
        );
      }

      if (pendingAuthTimeoutIdRef.current) {
        clearTimeout(pendingAuthTimeoutIdRef.current);
        pendingAuthTimeoutIdRef.current = null;
      }

      if (event === 'SIGNED_OUT') {
        const signedOutUserId = lastAuthenticatedUserIdRef.current;
        lastAuthenticatedUserIdRef.current = null;

        if (mountedRef.current) dispatchUserAndPhase(undefined, 'signed-out');

        if (signedOutUserId) {
          void clearExpoPushToken(signedOutUserId).then(result => {
            if (__DEV__ && result.error) {
              console.warn('[AuthProvider] push token clear error:', result.error);
            }
          });
        }

        return;
      }

      if (!session?.user) {
        lastAuthenticatedUserIdRef.current = null;
        if (mountedRef.current) dispatchUserAndPhase(undefined, 'signed-out');
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Defer with setTimeout(0) to avoid deadlock: exchangeCodeForSession
        // holds processLock while firing SIGNED_IN. PostgREST queries internally
        // call getSession() which tries to acquire the same lock → deadlock.
        pendingAuthTimeoutIdRef.current = setTimeout(async () => {
          pendingAuthTimeoutIdRef.current = null;

          if (!canDispatch()) {
            return;
          }

          try {
            const result = await getCurrentUser({
              createIfMissing: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
              session,
            });

            if (!canDispatch()) {
              return;
            }

            if (!result) {
              dispatchUserAndPhase(undefined, 'signed-out');
              return;
            }

            if (result.user.id !== session.user.id) {
              return;
            }

            const isAllowed = await validateAndDispatch(
              result.user,
              result.profile,
              mountedRef,
              event,
              canDispatch,
            );

            if (!isAllowed || !canDispatch()) {
              return;
            }

            const mfaPhase = await resolveMfaPhase(mountedRef);

            if (!canDispatch()) {
              return;
            }

            dispatch(setAuthPhase(mfaPhase));

            if (mfaPhase === 'authenticated') {
              const tokenSyncResult = await syncExpoPushTokenIfPermitted(result.user.id);

              if (__DEV__ && tokenSyncResult.error) {
                console.warn('[AuthProvider] push token sync error:', tokenSyncResult.error);
              }
            }
          } catch (error) {
            if (__DEV__) console.error('[AuthProvider] onAuthStateChange error:', error);
            if (canDispatch()) dispatchUserAndPhase(undefined, 'signed-out');
          }
        }, 0);
      }
    });

    return () => {
      mountedRef.current = false;
      authResolutionGenerationRef.current += 1;

      if (pendingAuthTimeoutIdRef.current) {
        clearTimeout(pendingAuthTimeoutIdRef.current);
        pendingAuthTimeoutIdRef.current = null;
      }

      subscription.unsubscribe();
    };
  }, [dispatch, setAuthPhase, dispatchUserAndPhase, validateAndDispatch, resolveMfaPhase]);

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
