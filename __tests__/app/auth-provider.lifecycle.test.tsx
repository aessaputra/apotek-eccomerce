import React from 'react';
import { AppState, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { describe, beforeEach, afterEach, expect, it, jest } from '@jest/globals';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import AuthProvider from '@/providers/AuthProvider';

const mockDispatch = jest.fn();
const mockSetUser = jest.fn((payload: unknown) => ({ type: 'setUser', payload }));
const mockSetLoggedIn = jest.fn((payload: boolean) => ({ type: 'setLoggedIn', payload }));
const mockSetChecked = jest.fn((payload: boolean) => ({ type: 'setChecked', payload }));
const mockSetPendingMfa = jest.fn((payload: boolean) => ({ type: 'setPendingMfa', payload }));
const mockSetAuthPhase = jest.fn((payload: string) => ({ type: 'setAuthPhase', payload }));
const mockReset = jest.fn(() => ({ type: 'reset' }));
const mockGetCurrentUser = jest.fn();
const mockHandleOAuthHashTokens = jest.fn();
const mockGetMfaAssuranceLevel = jest.fn();
const mockAuthSignOut = jest.fn();
const mockClearLocalAuthSessionForInvalidRefreshToken = jest.fn();
const mockSyncExpoPushTokenIfPermitted = jest.fn();
const mockClearExpoPushToken = jest.fn();
const mockSubscribeToExpoPushTokenUpdates = jest.fn();
const mockPushTokenSubscriptionCleanup = jest.fn();
const mockStartAutoRefresh = jest.fn();
const mockStopAutoRefresh = jest.fn();
const mockSubscriptionUnsubscribe = jest.fn();
const mockAppStateRemove = jest.fn();

let authStateChangeCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null =
  null;

jest.mock('@/components/elements/AppAlertDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    dispatch: mockDispatch,
    setUser: mockSetUser,
    setLoggedIn: mockSetLoggedIn,
    setChecked: mockSetChecked,
    setPendingMfa: mockSetPendingMfa,
    setAuthPhase: mockSetAuthPhase,
    reset: mockReset,
  }),
}));

jest.mock('@/services/user.service', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock('@/services/auth.service', () => ({
  clearLocalAuthSessionForInvalidRefreshToken: (...args: unknown[]) =>
    mockClearLocalAuthSessionForInvalidRefreshToken(...args),
  getMfaAssuranceLevel: () => mockGetMfaAssuranceLevel(),
  handleOAuthHashTokens: () => mockHandleOAuthHashTokens(),
  requiresMfaChallenge: (aalData: { currentLevel?: string | null; nextLevel?: string | null }) =>
    aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2',
  signOut: () => mockAuthSignOut(),
}));

jest.mock('@/services/notification.service', () => ({
  clearExpoPushToken: (...args: unknown[]) => mockClearExpoPushToken(...args),
  subscribeToExpoPushTokenUpdates: (...args: unknown[]) =>
    mockSubscribeToExpoPushTokenUpdates(...args),
  syncExpoPushTokenIfPermitted: (...args: unknown[]) => mockSyncExpoPushTokenIfPermitted(...args),
}));

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        authStateChangeCallback = callback;

        return {
          data: {
            subscription: {
              unsubscribe: mockSubscriptionUnsubscribe,
            },
          },
        };
      },
      startAutoRefresh: () => mockStartAutoRefresh(),
      stopAutoRefresh: () => mockStopAutoRefresh(),
    },
  },
}));

function createCurrentUserResult() {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User One',
      full_name: 'User One',
      phone_number: null,
      avatar_url: null,
      role: 'customer' as const,
    },
    profile: {
      id: 'user-1',
      avatar_url: null,
      created_at: '2026-04-23T00:00:00.000Z',
      expo_push_token: null,
      expo_push_token_updated_at: null,
      full_name: 'User One',
      is_banned: false,
      phone_number: null,
      role: 'customer' as const,
      updated_at: '2026-04-23T00:00:00.000Z',
    },
  };
}

function createSession(): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 1,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-04-23T00:00:00.000Z',
      email: 'user@example.com',
      role: 'authenticated',
      user_metadata: {},
    },
  } as Session;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('AuthProvider notification lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockReset();
    mockHandleOAuthHashTokens.mockReset();
    mockGetMfaAssuranceLevel.mockReset();
    mockAuthSignOut.mockReset();
    mockClearLocalAuthSessionForInvalidRefreshToken.mockReset();
    mockSyncExpoPushTokenIfPermitted.mockReset();
    mockClearExpoPushToken.mockReset();
    mockSubscribeToExpoPushTokenUpdates.mockReset();
    mockPushTokenSubscriptionCleanup.mockReset();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: mockAppStateRemove,
    } as ReturnType<typeof AppState.addEventListener>);
    authStateChangeCallback = null;
    mockHandleOAuthHashTokens.mockImplementation(async () => null);
    mockClearLocalAuthSessionForInvalidRefreshToken.mockImplementation(async () => false);
    mockGetCurrentUser.mockImplementation(async () => null);
    mockGetMfaAssuranceLevel.mockImplementation(async () => ({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    }));
    mockSyncExpoPushTokenIfPermitted.mockImplementation(async () => ({
      data: { token: 'ExponentPushToken[current]' },
      error: null,
    }));
    mockClearExpoPushToken.mockImplementation(async () => ({ data: null, error: null }));
    mockSubscribeToExpoPushTokenUpdates.mockImplementation(() => mockPushTokenSubscriptionCleanup);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'] as const)(
    'syncs the Expo token without prompting after %s succeeds',
    async event => {
      const currentUserResult = createCurrentUserResult();
      const session = createSession();

      mockGetCurrentUser
        .mockImplementationOnce(async () => null)
        .mockImplementationOnce(async () => currentUserResult);

      render(
        <AuthProvider>
          <Text>child</Text>
        </AuthProvider>,
      );

      await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

      await act(async () => {
        authStateChangeCallback?.(event, session);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenLastCalledWith({
          createIfMissing: event === 'SIGNED_IN' || event === 'INITIAL_SESSION',
          session,
        });
        expect(mockGetMfaAssuranceLevel).toHaveBeenCalled();
        expect(mockSetAuthPhase).toHaveBeenLastCalledWith('authenticated');
      });

      expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalledWith('user-1');
      expect(mockSubscribeToExpoPushTokenUpdates).toHaveBeenCalledWith(
        'user-1',
        expect.any(Function),
      );
    },
  );

  it('marks signed-in AAL1 sessions that require AAL2 as pending MFA', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();

    mockGetCurrentUser
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => currentUserResult);
    mockGetMfaAssuranceLevel.mockImplementationOnce(async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    }));

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSetAuthPhase).toHaveBeenLastCalledWith('requires-mfa');
    });
    expect(mockSyncExpoPushTokenIfPermitted).not.toHaveBeenCalledWith('user-1');
  });

  it('defers auth checked on sign-in until the MFA assurance check resolves', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();
    const assuranceLevel = createDeferred<{
      data: { currentLevel: string; nextLevel: string };
      error: null;
    }>();

    mockGetCurrentUser.mockImplementationOnce(async () => null);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());
    await waitFor(() => expect(mockSetAuthPhase).toHaveBeenCalledWith('signed-out'));

    mockSetAuthPhase.mockClear();
    mockGetCurrentUser.mockImplementationOnce(async () => currentUserResult);
    mockGetMfaAssuranceLevel.mockImplementationOnce(() => assuranceLevel.promise);

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSetAuthPhase).toHaveBeenCalledWith('checking-mfa');
      expect(mockGetMfaAssuranceLevel).toHaveBeenCalled();
    });
    expect(mockSetAuthPhase).not.toHaveBeenCalledWith('authenticated');

    await act(async () => {
      assuranceLevel.resolve({
        data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        error: null,
      });
      await assuranceLevel.promise;
    });

    await waitFor(() => {
      expect(mockSetAuthPhase).toHaveBeenLastCalledWith('authenticated');
    });
  });

  it('checks MFA assurance after cold-start user validation succeeds', async () => {
    jest.useRealTimers();

    mockGetCurrentUser.mockImplementationOnce(async () => createCurrentUserResult());
    mockGetMfaAssuranceLevel.mockImplementationOnce(async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    }));

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockSetAuthPhase).toHaveBeenCalledWith('checking-mfa');
      expect(mockGetMfaAssuranceLevel).toHaveBeenCalled();
      expect(mockSetAuthPhase).toHaveBeenLastCalledWith('requires-mfa');
    });
  });

  it('still marks auth checked when cold-start MFA assurance returns an error', async () => {
    jest.useRealTimers();

    const assuranceError = new Error('AAL unavailable');

    mockGetCurrentUser.mockImplementationOnce(async () => createCurrentUserResult());
    mockGetMfaAssuranceLevel.mockImplementationOnce(async () => ({
      data: null,
      error: assuranceError,
    }));

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockSetAuthPhase).toHaveBeenCalledWith('checking-mfa');
      expect(mockGetMfaAssuranceLevel).toHaveBeenCalled();
      expect(mockSetAuthPhase).toHaveBeenLastCalledWith('requires-mfa');
    });
  });

  it('clears the last known Expo token on sign out', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();

    mockGetCurrentUser
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => currentUserResult);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalledWith('user-1');
    });

    await act(async () => {
      authStateChangeCallback?.('SIGNED_OUT', null);
    });

    expect(mockClearExpoPushToken).not.toHaveBeenCalled();
    expect(mockPushTokenSubscriptionCleanup).toHaveBeenCalled();
    expect(mockSetAuthPhase).toHaveBeenLastCalledWith('signed-out');
  });

  it('does not clear push tokens after sign out because auth.service clears before sign out', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockGetCurrentUser
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => currentUserResult);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalledWith('user-1');
    });

    await act(async () => {
      authStateChangeCallback?.('SIGNED_OUT', null);
    });

    expect(mockClearExpoPushToken).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[AuthProvider] push token clear error:',
      expect.any(Error),
    );
  });

  it('does not sync a push token from a stale sign-in callback after sign out wins', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();

    mockGetCurrentUser
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => currentUserResult);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      authStateChangeCallback?.('SIGNED_OUT', null);
      jest.runAllTimers();
    });

    expect(mockSyncExpoPushTokenIfPermitted).not.toHaveBeenCalled();
  });

  it('clears local Supabase session when bootstrap hits an invalid refresh token', async () => {
    jest.useRealTimers();

    const refreshTokenError = new Error('Invalid Refresh Token: Refresh Token Not Found');
    refreshTokenError.name = 'AuthApiError';

    mockGetCurrentUser.mockImplementationOnce(async () => {
      throw refreshTokenError;
    });
    mockClearLocalAuthSessionForInvalidRefreshToken.mockImplementationOnce(async () => true);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockClearLocalAuthSessionForInvalidRefreshToken).toHaveBeenCalledWith(
        refreshTokenError,
      );
      expect(mockSetUser).toHaveBeenCalledWith(undefined);
      expect(mockSetAuthPhase).toHaveBeenCalledWith('signed-out');
    });
  });

  it('still marks auth checked when invalid refresh cleanup fails', async () => {
    jest.useRealTimers();

    const refreshTokenError = new Error('Invalid Refresh Token: Refresh Token Not Found');
    refreshTokenError.name = 'AuthApiError';

    mockGetCurrentUser.mockImplementationOnce(async () => {
      throw refreshTokenError;
    });
    mockClearLocalAuthSessionForInvalidRefreshToken.mockImplementationOnce(async () => false);

    render(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockClearLocalAuthSessionForInvalidRefreshToken).toHaveBeenCalledWith(
        refreshTokenError,
      );
      expect(mockSetUser).toHaveBeenCalledWith(undefined);
      expect(mockSetAuthPhase).toHaveBeenCalledWith('signed-out');
    });
  });
});
