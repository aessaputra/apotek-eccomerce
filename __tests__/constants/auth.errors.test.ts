import { describe, expect, test } from '@jest/globals';
import {
  AUTH_ERROR_MESSAGES,
  AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE,
  AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE,
  AuthErrorCode,
  getAuthErrorMessage,
  getRecoveryTokenFailureMessage,
  isPrivacySafeForgotPasswordError,
  isRecoveryTokenFailureError,
} from '@/constants/auth.errors';

describe('auth.errors', () => {
  test('keeps password validation messages stable', () => {
    expect(getAuthErrorMessage({ code: AuthErrorCode.SAME_PASSWORD })).toBe(
      AUTH_ERROR_MESSAGES[AuthErrorCode.SAME_PASSWORD],
    );
    expect(getAuthErrorMessage({ code: AuthErrorCode.WEAK_PASSWORD })).toBe(
      AUTH_ERROR_MESSAGES[AuthErrorCode.WEAK_PASSWORD],
    );
  });

  test('uses a privacy-safe generic success message for forgot password', () => {
    expect(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE).toBe(
      'Jika email terdaftar, tautan reset password telah dikirim.',
    );
    expect(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE).not.toMatch(
      /akun tidak ditemukan|user not found|account not found/i,
    );
  });

  test('treats user-not-found errors as privacy-safe for forgot password', () => {
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.USER_NOT_FOUND })).toBe(true);
    expect(isPrivacySafeForgotPasswordError({ message: 'User not found' })).toBe(true);
    expect(isPrivacySafeForgotPasswordError({ message: 'Account not found' })).toBe(true);
    expect(isPrivacySafeForgotPasswordError({ message: 'Email not found' })).toBe(true);
    expect(isPrivacySafeForgotPasswordError({ message: 'Akun tidak ditemukan' })).toBe(true);
    expect(isPrivacySafeForgotPasswordError({ message: 'Email tidak ditemukan' })).toBe(true);
  });

  test('does not convert actionable forgot password failures to generic success', () => {
    expect(
      isPrivacySafeForgotPasswordError({ code: AuthErrorCode.OVER_EMAIL_SEND_RATE_LIMIT }),
    ).toBe(false);
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.OVER_REQUEST_RATE_LIMIT })).toBe(
      false,
    );
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.REQUEST_TIMEOUT })).toBe(false);
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.SERVER_ERROR })).toBe(false);
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.TEMPORARILY_UNAVAILABLE })).toBe(
      false,
    );
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.PROVIDER_NOT_FOUND })).toBe(
      false,
    );
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.IDENTITY_NOT_FOUND })).toBe(
      false,
    );
    expect(isPrivacySafeForgotPasswordError({ code: AuthErrorCode.CODE_CHALLENGE_NOT_FOUND })).toBe(
      false,
    );
    expect(isPrivacySafeForgotPasswordError('not found')).toBe(false);
  });

  test('classifies recovery token failures for reset password', () => {
    expect(isRecoveryTokenFailureError({ code: AuthErrorCode.OTP_EXPIRED })).toBe(true);
    expect(isRecoveryTokenFailureError({ code: AuthErrorCode.INVALID_GRANT })).toBe(true);
    expect(isRecoveryTokenFailureError('otp_expired')).toBe(true);
    expect(isRecoveryTokenFailureError('invalid_grant')).toBe(true);
  });

  test('does not classify non-recovery auth errors as recovery token failures', () => {
    expect(isRecoveryTokenFailureError({ code: AuthErrorCode.SAME_PASSWORD })).toBe(false);
    expect(isRecoveryTokenFailureError({ code: AuthErrorCode.WEAK_PASSWORD })).toBe(false);
    expect(isRecoveryTokenFailureError({ code: AuthErrorCode.USER_NOT_FOUND })).toBe(false);
  });

  test('maps recovery token failures to invalid reset-link copy', () => {
    expect(getRecoveryTokenFailureMessage({ code: AuthErrorCode.OTP_EXPIRED })).toBe(
      AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE,
    );
    expect(getRecoveryTokenFailureMessage({ code: AuthErrorCode.INVALID_GRANT })).toBe(
      AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE,
    );
    expect(getRecoveryTokenFailureMessage({ code: AuthErrorCode.WEAK_PASSWORD })).toBeUndefined();
  });
});
