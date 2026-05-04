import { describe, expect, it } from '@jest/globals';
import {
  AUTH_FORM_STATUSES,
  buildLoginMessageRouteParams,
  buildVerifyEmailRouteParams,
  normalizeAuthEmail,
  validateAuthPassword,
} from '@/scenes/auth/authForm.helpers';
import { validatePassword } from '@/utils/validation';

describe('authForm.helpers', () => {
  it('trims email input without changing its case', () => {
    expect(normalizeAuthEmail('  User@Example.com  ')).toBe('User@Example.com');
  });

  it('delegates password validation to the shared validation utility', () => {
    expect(validateAuthPassword('abcdef')).toEqual(validatePassword('abcdef'));
    expect(validateAuthPassword('password1')).toEqual(validatePassword('password1'));
  });

  it('exposes serializable auth route params', () => {
    expect(buildVerifyEmailRouteParams('  user@example.com  ')).toEqual({
      email: 'user@example.com',
    });
  });

  it('returns login message route params without mutating message text', () => {
    const params = {
      resetSuccess: '  Password reset selesai  ',
      error: 'Token_Expired',
    };

    expect(buildLoginMessageRouteParams(params)).toEqual(params);
    expect(params).toEqual({
      resetSuccess: '  Password reset selesai  ',
      error: 'Token_Expired',
    });
    expect(Object.values(buildLoginMessageRouteParams(params))).toEqual([
      '  Password reset selesai  ',
      'Token_Expired',
    ]);
  });

  it('omits undefined login message route params', () => {
    expect(
      buildLoginMessageRouteParams({
        resetSuccess: undefined,
        error: undefined,
      }),
    ).toEqual({});
  });

  it('exposes the narrow auth form status contract', () => {
    expect(AUTH_FORM_STATUSES).toEqual(['idle', 'submitting', 'success', 'error']);
  });
});
