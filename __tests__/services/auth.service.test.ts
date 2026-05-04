import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import {
  clearLocalAuthSessionForInvalidRefreshToken,
  createMfaChallenge,
  createPasswordRecoveryRedirectUri,
  createSessionFromRecoveryCode,
  createSessionFromRecoveryTokens,
  enrollTotpFactor,
  getMfaAssuranceLevel,
  handleOAuthHashTokens,
  isInvalidRefreshTokenError,
  listMfaFactors,
  requestPasswordReset,
  reauthenticateWithPassword,
  refreshAuthSession,
  signInWithPassword,
  signOut,
  signUp,
  unenrollMfaFactor,
  updatePassword,
  verifyMfaChallenge,
  verifyEmailOtp,
} from '@/services/auth.service';

type AuthServiceResult = Promise<unknown>;
type FetchMock = (...args: Parameters<typeof fetch>) => Promise<Response>;

interface RedirectUriOptions {
  scheme?: string;
  path?: string;
  isTripleSlashed?: boolean;
}

interface MfaThrowNormalizationCase {
  mock: jest.Mock<(...args: unknown[]) => AuthServiceResult>;
  action: () => AuthServiceResult;
  errorName: string;
}

const mockSignInWithPassword = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockSignUp = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockSignOut = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockVerifyOtp = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockResetPasswordForEmail = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockUpdateUser = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockExchangeCodeForSession = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockSetSession = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockRefreshSession = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockGetAuthenticatorAssuranceLevel = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockListFactors = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockEnroll = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockChallenge = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockVerify = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockUnenroll = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockMakeRedirectUri = jest.fn<(options: RedirectUriOptions) => string>();
const mockFetch = jest.fn<FetchMock>();

async function expectMfaThrowNormalization({ mock, action, errorName }: MfaThrowNormalizationCase) {
  mock.mockImplementationOnce(async () => {
    throw new Error('MFA transport unavailable');
  });

  await expect(action()).resolves.toEqual({
    data: null,
    error: { message: 'MFA transport unavailable', name: errorName },
  });
}

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (options: RedirectUriOptions) => mockMakeRedirectUri(options),
}));

jest.mock('expo-auth-session/build/QueryParams', () => ({
  getQueryParams: jest.fn(() => ({ params: {}, errorCode: null })),
}));

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      signInWithOAuth: jest.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) =>
          mockGetAuthenticatorAssuranceLevel(...args),
        listFactors: (...args: unknown[]) => mockListFactors(...args),
        enroll: (...args: unknown[]) => mockEnroll(...args),
        challenge: (...args: unknown[]) => mockChallenge(...args),
        verify: (...args: unknown[]) => mockVerify(...args),
        unenroll: (...args: unknown[]) => mockUnenroll(...args),
      },
    },
  },
}));

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    env: 'test',
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'publishable-key',
    googleApiKey: '',
    regionalApiUrl: 'https://wilayah.id/api',
    postalDataUrl:
      'https://raw.githubusercontent.com/ArrayAccess/Indonesia-Postal-And-Area/master/data/json/area/62',
    googlePlacesApiUrl: 'https://places.googleapis.com/v1',
    googleGeocodingApiUrl: 'https://maps.googleapis.com/maps/api',
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockSignOut.mockReset();
    mockVerifyOtp.mockReset();
    mockResetPasswordForEmail.mockReset();
    mockUpdateUser.mockReset();
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
    mockRefreshSession.mockReset();
    mockGetAuthenticatorAssuranceLevel.mockReset();
    mockListFactors.mockReset();
    mockEnroll.mockReset();
    mockChallenge.mockReset();
    mockVerify.mockReset();
    mockUnenroll.mockReset();
    mockMakeRedirectUri.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;
    mockMakeRedirectUri.mockImplementation(({ path, isTripleSlashed }) =>
      isTripleSlashed
        ? `apotek-ecommerce:///${path ?? 'google-auth'}`
        : `apotek-ecommerce://${path ?? 'google-auth'}`,
    );
  });

  it('forwards signInWithPassword credentials to Supabase auth', async () => {
    const supabaseResult = { data: { user: { id: 'user-1' } }, error: null };
    mockSignInWithPassword.mockImplementationOnce(async () => supabaseResult);

    const result = await signInWithPassword({
      email: 'user@example.com',
      password: 'secret123',
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
    expect(result).toBe(supabaseResult);
  });

  it('forwards signUp input and options to Supabase auth', async () => {
    const supabaseResult = { data: { user: { id: 'user-2' }, session: null }, error: null };
    mockSignUp.mockImplementationOnce(async () => supabaseResult);

    const result = await signUp({
      email: 'new@example.com',
      password: 'secret123',
      options: { data: { full_name: 'New User' } },
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret123',
      options: { data: { full_name: 'New User' } },
    });
    expect(result).toBe(supabaseResult);
  });

  it('forwards signOut to Supabase auth', async () => {
    const supabaseResult = { error: null };
    mockSignOut.mockImplementationOnce(async () => supabaseResult);

    const result = await signOut();

    expect(mockSignOut).toHaveBeenCalledWith();
    expect(result).toBe(supabaseResult);
  });

  it('forwards local signOut scope to Supabase auth', async () => {
    const supabaseResult = { error: null };
    mockSignOut.mockImplementationOnce(async () => supabaseResult);

    const result = await signOut({ scope: 'local' });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result).toBe(supabaseResult);
  });

  it('gets MFA assurance level through Supabase Auth MFA', async () => {
    const aalData = { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [] };
    mockGetAuthenticatorAssuranceLevel.mockImplementationOnce(async () => ({
      data: aalData,
      error: null,
    }));

    const result = await getMfaAssuranceLevel();

    expect(mockGetAuthenticatorAssuranceLevel).toHaveBeenCalledWith();
    expect(result).toEqual({ data: aalData, error: null });
  });

  it('normalizes thrown MFA assurance level failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockGetAuthenticatorAssuranceLevel,
      action: getMfaAssuranceLevel,
      errorName: 'MfaAssuranceLevelError',
    });
  });

  it('lists MFA factors through Supabase Auth MFA', async () => {
    const factorsData = { all: [], totp: [], phone: [] };
    mockListFactors.mockImplementationOnce(async () => ({ data: factorsData, error: null }));

    const result = await listMfaFactors();

    expect(mockListFactors).toHaveBeenCalledWith();
    expect(result).toEqual({ data: factorsData, error: null });
  });

  it('normalizes thrown MFA factor listing failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockListFactors,
      action: listMfaFactors,
      errorName: 'MfaListFactorsError',
    });
  });

  it('enrolls TOTP factors with friendly name and issuer', async () => {
    const enrollmentData = {
      id: 'factor-secret-id',
      type: 'totp',
      totp: {
        qr_code: '<svg>secret-qr</svg>',
        secret: 'totp-secret-value',
        uri: 'otpauth://totp/secret-uri',
      },
    };
    mockEnroll.mockImplementationOnce(async () => ({ data: enrollmentData, error: null }));

    const result = await enrollTotpFactor({ friendlyName: 'HP utama', issuer: 'Apotek' });

    expect(mockEnroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'HP utama',
      issuer: 'Apotek',
    });
    expect(result).toEqual({ data: enrollmentData, error: null });
  });

  it('normalizes thrown TOTP enrollment failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockEnroll,
      action: () => enrollTotpFactor({ friendlyName: 'HP utama', issuer: 'Apotek' }),
      errorName: 'MfaEnrollTotpError',
    });
  });

  it('creates MFA challenges with factor ID', async () => {
    const challengeData = { id: 'challenge-secret-id', expires_at: 12345 };
    mockChallenge.mockImplementationOnce(async () => ({ data: challengeData, error: null }));

    const result = await createMfaChallenge('factor-secret-id');

    expect(mockChallenge).toHaveBeenCalledWith({ factorId: 'factor-secret-id' });
    expect(result).toEqual({ data: challengeData, error: null });
  });

  it('normalizes thrown MFA challenge failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockChallenge,
      action: () => createMfaChallenge('factor-secret-id'),
      errorName: 'MfaChallengeError',
    });
  });

  it('verifies MFA challenges with trimmed codes', async () => {
    const verifyData = { access_token: 'new-session-token' };
    mockVerify.mockImplementationOnce(async () => ({ data: verifyData, error: null }));

    const result = await verifyMfaChallenge({
      factorId: 'factor-secret-id',
      challengeId: 'challenge-secret-id',
      code: ' 123456 ',
    });

    expect(mockVerify).toHaveBeenCalledWith({
      factorId: 'factor-secret-id',
      challengeId: 'challenge-secret-id',
      code: '123456',
    });
    expect(result).toEqual({ data: verifyData, error: null });
  });

  it('normalizes thrown MFA verification failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockVerify,
      action: () =>
        verifyMfaChallenge({
          factorId: 'factor-secret-id',
          challengeId: 'challenge-secret-id',
          code: '123456',
        }),
      errorName: 'MfaVerifyChallengeError',
    });
  });

  it('unenrolls MFA factors with factor ID', async () => {
    const unenrollData = { id: 'factor-secret-id' };
    mockUnenroll.mockImplementationOnce(async () => ({ data: unenrollData, error: null }));

    const result = await unenrollMfaFactor('factor-secret-id');

    expect(mockUnenroll).toHaveBeenCalledWith({ factorId: 'factor-secret-id' });
    expect(result).toEqual({ data: unenrollData, error: null });
  });

  it('normalizes thrown MFA unenrollment failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockUnenroll,
      action: () => unenrollMfaFactor('factor-secret-id'),
      errorName: 'MfaUnenrollFactorError',
    });
  });

  it('refreshes the auth session through Supabase Auth', async () => {
    const sessionData = { session: { access_token: 'fresh-token' } };
    mockRefreshSession.mockImplementationOnce(async () => ({ data: sessionData, error: null }));

    const result = await refreshAuthSession();

    expect(mockRefreshSession).toHaveBeenCalledWith();
    expect(result).toEqual({ data: sessionData, error: null });
  });

  it('normalizes thrown auth session refresh failures', async () => {
    await expectMfaThrowNormalization({
      mock: mockRefreshSession,
      action: refreshAuthSession,
      errorName: 'RefreshAuthSessionError',
    });
  });

  it('reauthenticates users with password credentials without exposing tokens or mutating client session', async () => {
    const authData = { user: { id: 'user-reauth' }, session: { access_token: 'token' } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => authData,
    } as Response);

    const result = await reauthenticateWithPassword({
      email: 'user@example.com',
      password: 'secret123',
    });

    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/token?grant_type=password',
      {
        method: 'POST',
        headers: {
          apikey: 'publishable-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret123',
        }),
      },
    );
    expect(result).toEqual({ data: { verified: true }, error: null });
  });

  it('normalizes password reauthentication REST failures', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    } as Response);

    await expect(
      reauthenticateWithPassword({ email: 'user@example.com', password: 'wrong-password' }),
    ).resolves.toEqual({
      data: null,
      error: {
        message: 'Invalid login credentials',
        name: 'InvalidLoginCredentialsError',
      },
    });
  });

  it('keeps transport password reauthentication failures separate from wrong passwords', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many requests' }),
    } as Response);

    await expect(
      reauthenticateWithPassword({ email: 'user@example.com', password: 'secret123' }),
    ).resolves.toEqual({
      data: null,
      error: {
        message: 'Too many requests',
        name: 'ReauthenticateWithPasswordError',
      },
    });
  });

  it('normalizes thrown password reauthentication failures', async () => {
    mockFetch.mockImplementationOnce(async () => {
      throw new Error('Auth transport unavailable');
    });

    await expect(
      reauthenticateWithPassword({ email: 'user@example.com', password: 'secret123' }),
    ).resolves.toEqual({
      data: null,
      error: {
        message: 'Auth transport unavailable',
        name: 'ReauthenticateWithPasswordError',
      },
    });
  });

  it('does not log or persist MFA secrets, challenge IDs, codes, or factor IDs', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const localStorageSetItem = jest.fn();
    const sessionStorageSetItem = jest.fn();
    const originalLocalStorage = globalThis.localStorage;
    const originalSessionStorage = globalThis.sessionStorage;

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { setItem: localStorageSetItem },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: { setItem: sessionStorageSetItem },
    });

    mockEnroll.mockImplementationOnce(async () => ({
      data: {
        id: 'factor-secret-id',
        type: 'totp',
        totp: {
          qr_code: '<svg>secret-qr</svg>',
          secret: 'totp-secret-value',
          uri: 'otpauth://totp/secret-uri',
        },
      },
      error: null,
    }));
    mockChallenge.mockImplementationOnce(async () => ({
      data: { id: 'challenge-secret-id' },
      error: null,
    }));
    mockVerify.mockImplementationOnce(async () => ({ data: { success: true }, error: null }));

    try {
      await enrollTotpFactor({ friendlyName: 'HP utama', issuer: 'Apotek' });
      await createMfaChallenge('factor-secret-id');
      await verifyMfaChallenge({
        factorId: 'factor-secret-id',
        challengeId: 'challenge-secret-id',
        code: ' 123456 ',
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(localStorageSetItem).not.toHaveBeenCalled();
      expect(sessionStorageSetItem).not.toHaveBeenCalled();
    } finally {
      consoleLogSpy.mockRestore();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: originalSessionStorage,
      });
    }
  });

  it('detects invalid refresh token errors and clears local session', async () => {
    const refreshTokenError = {
      name: 'AuthApiError',
      message: 'Invalid Refresh Token: Refresh Token Not Found',
    };
    mockSignOut.mockImplementationOnce(async () => ({ error: null }));

    const cleared = await clearLocalAuthSessionForInvalidRefreshToken(refreshTokenError);

    expect(isInvalidRefreshTokenError(refreshTokenError)).toBe(true);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(cleared).toBe(true);
  });

  it('does not clear local session for unrelated auth errors', async () => {
    const unrelatedError = {
      name: 'AuthApiError',
      message: 'Invalid login credentials',
    };

    const cleared = await clearLocalAuthSessionForInvalidRefreshToken(unrelatedError);

    expect(isInvalidRefreshTokenError(unrelatedError)).toBe(false);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(cleared).toBe(false);
  });

  it('returns false when local session cleanup returns an error', async () => {
    const refreshTokenError = {
      name: 'AuthApiError',
      message: 'Refresh Token Not Found',
    };
    mockSignOut.mockImplementationOnce(async () => ({
      error: { message: 'Storage cleanup failed', name: 'AuthStorageError' },
    }));

    const cleared = await clearLocalAuthSessionForInvalidRefreshToken(refreshTokenError);

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(cleared).toBe(false);
  });

  it('returns false when local session cleanup throws', async () => {
    const refreshTokenError = {
      name: 'AuthApiError',
      message: 'Invalid Refresh Token: Refresh Token Not Found',
    };
    mockSignOut.mockImplementationOnce(async () => {
      throw new Error('SecureStore unavailable');
    });

    const cleared = await clearLocalAuthSessionForInvalidRefreshToken(refreshTokenError);

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(cleared).toBe(false);
  });

  it('builds a native password recovery redirect URL for reset-password', () => {
    const redirectTo = createPasswordRecoveryRedirectUri();

    expect(mockMakeRedirectUri).toHaveBeenCalledWith({
      scheme: 'apotek-ecommerce',
      path: 'reset-password',
      isTripleSlashed: true,
    });
    expect(redirectTo).toBe('apotek-ecommerce:///reset-password');
    expect(redirectTo).not.toContain('localhost');
  });

  it('requests a password reset email with trimmed email and recovery redirect', async () => {
    const supabaseResult = { data: {}, error: null };
    mockResetPasswordForEmail.mockImplementationOnce(async () => supabaseResult);

    const result = await requestPasswordReset('  reset@example.com  ');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
      redirectTo: 'apotek-ecommerce:///reset-password',
    });
    expect(result).toEqual({ data: {}, error: null });
  });

  it('returns Supabase password reset request errors without throwing', async () => {
    const resetError = { message: 'Rate limit exceeded', name: 'AuthRetryableFetchError' };
    mockResetPasswordForEmail.mockImplementationOnce(async () => ({
      data: null,
      error: resetError,
    }));

    const result = await requestPasswordReset('reset@example.com');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
      redirectTo: 'apotek-ecommerce:///reset-password',
    });
    expect(result).toEqual({ data: null, error: resetError });
  });

  it('normalizes thrown password reset request failures', async () => {
    mockResetPasswordForEmail.mockImplementationOnce(async () => {
      throw new Error('Network unavailable');
    });

    const result = await requestPasswordReset('reset@example.com');

    expect(result).toEqual({
      data: null,
      error: { message: 'Network unavailable', name: 'PasswordResetRequestError' },
    });
  });

  it('updates password through Supabase auth updateUser', async () => {
    const passwordData = { user: { id: 'user-4' } };
    mockUpdateUser.mockImplementationOnce(async () => ({ data: passwordData, error: null }));

    const result = await updatePassword('newPassword123');

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
    expect(result).toEqual({ data: passwordData, error: null });
  });

  it('returns Supabase update password errors without throwing', async () => {
    const updateError = { message: 'Password should be different', name: 'AuthApiError' };
    mockUpdateUser.mockImplementationOnce(async () => ({ data: null, error: updateError }));

    const result = await updatePassword('samePassword123');

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'samePassword123' });
    expect(result).toEqual({ data: null, error: updateError });
  });

  it('normalizes thrown update password failures', async () => {
    mockUpdateUser.mockImplementationOnce(async () => {
      throw new Error('Session storage unavailable');
    });

    const result = await updatePassword('newPassword123');

    expect(result).toEqual({
      data: null,
      error: { message: 'Session storage unavailable', name: 'UpdatePasswordError' },
    });
  });

  it('keeps signOut wrapper available for post-reset cleanup', async () => {
    mockUpdateUser.mockImplementationOnce(async () => ({
      data: { user: { id: 'user-5' } },
      error: null,
    }));
    mockSignOut.mockImplementationOnce(async () => ({ error: null }));

    const updateResult = await updatePassword('newPassword123');
    const signOutResult = await signOut();

    expect(updateResult.error).toBeNull();
    expect(mockSignOut).toHaveBeenCalledWith();
    expect(signOutResult).toEqual({ error: null });
  });

  it('verifies recovery OTP using Supabase token_hash payload', async () => {
    const otpData = { user: { id: 'user-3' }, session: { access_token: 'token' } };
    mockVerifyOtp.mockImplementationOnce(async () => ({ data: otpData, error: null }));

    const result = await verifyEmailOtp({ tokenHash: 'recovery-token-hash', type: 'recovery' });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'recovery-token-hash',
      type: 'recovery',
    });
    expect(result).toEqual({ data: otpData, error: null });
  });

  it('exchanges PKCE recovery codes for a Supabase session', async () => {
    const sessionData = { session: { access_token: 'token' } };
    mockExchangeCodeForSession.mockImplementationOnce(async () => ({
      data: sessionData,
      error: null,
    }));

    const result = await createSessionFromRecoveryCode('recovery-code');

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
    expect(result).toEqual({ data: sessionData, error: null });
  });

  it('creates a recovery session from implicit access and refresh tokens', async () => {
    const sessionData = { session: { access_token: 'token' } };
    mockSetSession.mockImplementationOnce(async () => ({ data: sessionData, error: null }));

    const result = await createSessionFromRecoveryTokens('access-token', 'refresh-token');

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(result).toEqual({ data: sessionData, error: null });
  });

  it('returns Supabase setSession errors for implicit recovery tokens', async () => {
    const sessionError = { message: 'Invalid refresh token', name: 'AuthSessionError' };
    mockSetSession.mockImplementationOnce(async () => ({ data: null, error: sessionError }));

    const result = await createSessionFromRecoveryTokens('access-token', 'refresh-token');

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(result).toEqual({ data: null, error: sessionError });
  });

  it('returns a safe error when implicit recovery token session creation throws', async () => {
    mockSetSession.mockImplementationOnce(async () => {
      throw new Error('SecureStore unavailable');
    });

    const result = await createSessionFromRecoveryTokens('access-token', 'refresh-token');

    expect(result).toEqual({
      data: null,
      error: { message: 'SecureStore unavailable', name: 'RecoveryTokenError' },
    });
  });

  it('returns a safe error when implicit recovery tokens are missing', async () => {
    const result = await createSessionFromRecoveryTokens('', 'refresh-token');

    expect(mockSetSession).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: null,
      error: {
        message: 'Token pemulihan tidak ditemukan di tautan reset password',
        name: 'RecoveryTokenError',
      },
    });
  });

  it('does not reuse a completed PKCE recovery code exchange from cache', async () => {
    mockExchangeCodeForSession
      .mockImplementationOnce(async () => ({
        data: { session: { access_token: 'first' } },
        error: null,
      }))
      .mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'used', name: 'AuthError' },
      }));

    const firstResult = await createSessionFromRecoveryCode('single-use-code');
    const secondResult = await createSessionFromRecoveryCode('single-use-code');

    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(2);
    expect(firstResult).toEqual({ data: { session: { access_token: 'first' } }, error: null });
    expect(secondResult).toEqual({ data: null, error: { message: 'used', name: 'AuthError' } });
  });

  it('returns a safe error when PKCE recovery code is missing', async () => {
    const result = await createSessionFromRecoveryCode('');

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: null,
      error: {
        message: 'Kode pemulihan tidak ditemukan di tautan reset password',
        name: 'RecoveryCodeError',
      },
    });
  });

  it('leaves reset-password web codes for the reset screen instead of OAuth bootstrap', async () => {
    const originalWindow = globalThis.window;
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: {
          pathname: '/reset-password',
          search: '?code=recovery-code',
        },
        history: {
          replaceState: jest.fn(),
        },
      },
    });

    try {
      const result = await handleOAuthHashTokens();

      expect(result).toBeNull();
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      expect(globalThis.window.history.replaceState).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it('returns Supabase recovery OTP errors without throwing', async () => {
    const otpError = { message: 'Recovery token expired', name: 'AuthError' };
    mockVerifyOtp.mockImplementationOnce(async () => ({ data: null, error: otpError }));

    const result = await verifyEmailOtp({ tokenHash: 'expired-token-hash', type: 'recovery' });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'expired-token-hash',
      type: 'recovery',
    });
    expect(result).toEqual({ data: null, error: otpError });
  });

  it('normalizes thrown recovery OTP failures into VerifyOtpError shape', async () => {
    mockVerifyOtp.mockImplementationOnce(async () => {
      throw new Error('Network unavailable');
    });

    const result = await verifyEmailOtp({ tokenHash: 'throwing-token-hash', type: 'recovery' });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'throwing-token-hash',
      type: 'recovery',
    });
    expect(result).toEqual({
      data: null,
      error: { message: 'Network unavailable', name: 'VerifyOtpError' },
    });
  });
});
