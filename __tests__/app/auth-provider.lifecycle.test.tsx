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
const mockReset = jest.fn(() => ({ type: 'reset' }));
const mockGetCurrentUser = jest.fn();
const mockHandleOAuthHashTokens = jest.fn();
const mockAuthSignOut = jest.fn();
const mockClearLocalAuthSessionForInvalidRefreshToken = jest.fn();
const mockSyncExpoPushTokenIfPermitted = jest.fn();
const mockClearExpoPushToken = jest.fn();
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
    reset: mockReset,
  }),
}));

jest.mock('@/services/user.service', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock('@/services/auth.service', () => ({
  clearLocalAuthSessionForInvalidRefreshToken: (...args: unknown[]) =>
    mockClearLocalAuthSessionForInvalidRefreshToken(...args),
  handleOAuthHashTokens: () => mockHandleOAuthHashTokens(),
  signOut: () => mockAuthSignOut(),
}));

jest.mock('@/services/notification.service', () => ({
  clearExpoPushToken: (...args: unknown[]) => mockClearExpoPushToken(...args),
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

describe('AuthProvider notification lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockReset();
    mockHandleOAuthHashTokens.mockReset();
    mockAuthSignOut.mockReset();
    mockClearLocalAuthSessionForInvalidRefreshToken.mockReset();
    mockSyncExpoPushTokenIfPermitted.mockReset();
    mockClearExpoPushToken.mockReset();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: mockAppStateRemove,
    } as ReturnType<typeof AppState.addEventListener>);
    authStateChangeCallback = null;
    mockHandleOAuthHashTokens.mockImplementation(async () => null);
    mockClearLocalAuthSessionForInvalidRefreshToken.mockImplementation(async () => false);
    mockGetCurrentUser.mockImplementation(async () => null);
    mockSyncExpoPushTokenIfPermitted.mockImplementation(async () => ({ data: null, error: null }));
    mockClearExpoPushToken.mockImplementation(async () => ({ data: null, error: null }));
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
        expect(mockSyncExpoPushTokenIfPermitted).toHaveBeenCalledWith('user-1');
      });
    },
  );

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

    await waitFor(() => {
      expect(mockClearExpoPushToken).toHaveBeenCalledWith('user-1');
    });
  });

  it('does not warn when push token clear is a successful no-op after sign out', async () => {
    const currentUserResult = createCurrentUserResult();
    const session = createSession();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockGetCurrentUser
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => currentUserResult);
    mockClearExpoPushToken.mockImplementationOnce(async () => ({ data: null, error: null }));

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

    await waitFor(() => {
      expect(mockClearExpoPushToken).toHaveBeenCalledWith('user-1');
    });
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
      expect(mockSetLoggedIn).toHaveBeenCalledWith(false);
      expect(mockSetChecked).toHaveBeenCalledWith(true);
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
      expect(mockSetLoggedIn).toHaveBeenCalledWith(false);
      expect(mockSetChecked).toHaveBeenCalledWith(true);
    });
  });
});
