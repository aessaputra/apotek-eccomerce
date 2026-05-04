import { describe, expect, it } from '@jest/globals';
import { getPasswordRecoveryPathFromSystemPath, redirectSystemPath } from '@/app/+native-intent';

describe('native intent password recovery routing', () => {
  it('rewrites triple-slashed Supabase PKCE recovery links before route resolution', () => {
    expect(
      redirectSystemPath({
        path: 'apotek-ecommerce:///reset-password?code=recovery-code',
        initial: true,
      }),
    ).toBe('/reset-password?code=recovery-code');
  });

  it('rewrites double-slashed recovery links whose route is parsed as host', () => {
    expect(
      redirectSystemPath({
        path: 'apotek-ecommerce://reset-password?code=recovery-code',
        initial: true,
      }),
    ).toBe('/reset-password?code=recovery-code');
  });

  it('preserves implicit recovery hash params as route search params', () => {
    expect(
      redirectSystemPath({
        path: 'apotek-ecommerce:///reset-password#access_token=token-1&refresh_token=token-2&type=recovery',
        initial: true,
      }),
    ).toBe('/reset-password?access_token=token-1&refresh_token=token-2&type=recovery');
  });

  it('keeps existing query params before appending hash params', () => {
    expect(
      redirectSystemPath({
        path: 'apotek-ecommerce:///reset-password?code=recovery-code#type=recovery&code=hash-code',
        initial: true,
      }),
    ).toBe('/reset-password?code=recovery-code&type=recovery');
  });

  it('supports Expo Router path-only inputs', () => {
    expect(getPasswordRecoveryPathFromSystemPath('/reset-password?code=recovery-code')).toBe(
      '/reset-password?code=recovery-code',
    );
  });

  it('does not rewrite normal Google auth callbacks', () => {
    const googleCallback = 'apotek-ecommerce://google-auth?code=oauth-code';

    expect(redirectSystemPath({ path: googleCallback, initial: true })).toBe(googleCallback);
  });
});
