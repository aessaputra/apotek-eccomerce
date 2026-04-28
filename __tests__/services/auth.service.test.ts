import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  clearLocalAuthSessionForInvalidRefreshToken,
  createPasswordRecoveryRedirectUri,
  isInvalidRefreshTokenError,
  requestPasswordReset,
  signInWithPassword,
  signOut,
  signUp,
  updatePassword,
  verifyEmailOtp,
} from '@/services/auth.service';

type AuthServiceResult = Promise<unknown>;

interface RedirectUriOptions {
  scheme?: string;
  path?: string;
}

const mockSignInWithPassword = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockSignUp = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockSignOut = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockVerifyOtp = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockResetPasswordForEmail = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockUpdateUser = jest.fn<(...args: unknown[]) => AuthServiceResult>();
const mockMakeRedirectUri = jest.fn<(options: RedirectUriOptions) => string>();

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
      exchangeCodeForSession: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
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
    mockMakeRedirectUri.mockReset();
    mockMakeRedirectUri.mockImplementation(
      ({ path }) => `apotek-ecommerce://${path ?? 'google-auth'}`,
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
    });
    expect(redirectTo).toBe('apotek-ecommerce://reset-password');
    expect(redirectTo).not.toContain('localhost');
  });

  it('requests a password reset email with trimmed email and recovery redirect', async () => {
    const supabaseResult = { data: {}, error: null };
    mockResetPasswordForEmail.mockImplementationOnce(async () => supabaseResult);

    const result = await requestPasswordReset('  reset@example.com  ');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
      redirectTo: 'apotek-ecommerce://reset-password',
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
      redirectTo: 'apotek-ecommerce://reset-password',
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
