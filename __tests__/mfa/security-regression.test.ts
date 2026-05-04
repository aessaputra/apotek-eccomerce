import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';

const SOURCE_FILES = [
  'scenes/profile/TwoStepVerification.tsx',
  'scenes/auth/useVerifyMfa.ts',
  'scenes/auth/VerifyMfa.tsx',
  'services/auth.service.ts',
] as const;

const MFA_SCENE_FILES = [
  'scenes/profile/TwoStepVerification.tsx',
  'scenes/auth/useVerifyMfa.ts',
  'scenes/auth/VerifyMfa.tsx',
] as const;

interface ForbiddenPattern {
  name: string;
  pattern: RegExp;
}

function readSource(file: string) {
  return readFileSync(join(__dirname, '..', '..', file), 'utf-8');
}

function expectNoForbiddenPattern(
  file: string,
  content: string,
  forbiddenPattern: ForbiddenPattern,
) {
  expect({
    file,
    pattern: forbiddenPattern.name,
    match: content.match(forbiddenPattern.pattern)?.[0],
  }).toEqual({
    file,
    pattern: forbiddenPattern.name,
    match: undefined,
  });
}

describe('MFA security regression', () => {
  it('does not persist MFA secrets, QR payloads, challenge IDs, factor IDs, or OTP codes', () => {
    const forbiddenPersistencePatterns: ForbiddenPattern[] = [
      {
        name: 'AsyncStorage/SecureStore/localStorage/sessionStorage persists MFA material',
        pattern:
          /(?:AsyncStorage|SecureStore|localStorage|sessionStorage)\s*\.\s*(?:setItem|setItemAsync)\s*\([^)]*(?:secret|qr|uri|challengeId|code|factorId)/i,
      },
      {
        name: 'Redux dispatch persists MFA material',
        pattern: /dispatch\s*\([^)]*(?:secret|qr|uri|challengeId|code|factorId)/i,
      },
      {
        name: 'Zustand store persists MFA material',
        pattern: /zustand[\s\S]{0,160}(?:secret|qr|uri|challengeId|code|factorId)/i,
      },
      {
        name: 'Persist hook stores MFA material',
        pattern:
          /(?:useDataPersist|setPersistData|setPersist|persistData)\s*\([^)]*(?:secret|qr|uri|challengeId|code|factorId)/i,
      },
      {
        name: 'Route params carry MFA material',
        pattern:
          /(?:router\.(?:push|replace|navigate)\s*\(\s*{|params\s*:\s*{)[\s\S]{0,160}(?:secret|qr|uri|challengeId|code|factorId)/i,
      },
    ];

    SOURCE_FILES.forEach(file => {
      const content = readSource(file);

      forbiddenPersistencePatterns.forEach(forbiddenPattern => {
        expectNoForbiddenPattern(file, content, forbiddenPattern);
      });
    });
  });

  it('does not log MFA secrets, QR payloads, challenge IDs, factor IDs, or OTP codes', () => {
    const forbiddenLogPatterns: ForbiddenPattern[] = [
      {
        name: 'console logs sensitive MFA challenge or enrollment material',
        pattern:
          /console\s*\.\s*(?:log|warn|error|info|debug)\s*\([^)]*(?:secret|qr_code|qrCode|uri|challengeId|totpCode|factorId)/,
      },
      {
        name: 'console logs challengeId specifically',
        pattern: /console\s*\.\s*(?:log|warn|error|info|debug)\s*\([^)]*challengeId/,
      },
      {
        name: 'console logs MFA OTP code specifically',
        pattern:
          /console\s*\.\s*(?:log|warn|error|info|debug)\s*\([^)]*(?:mfa|totp|verifikasi)[^)]*\bcode\b/i,
      },
    ];

    SOURCE_FILES.forEach(file => {
      const content = readSource(file);

      forbiddenLogPatterns.forEach(forbiddenPattern => {
        expectNoForbiddenPattern(file, content, forbiddenPattern);
      });
    });
  });

  it('keeps MFA Supabase access out of scene files', () => {
    MFA_SCENE_FILES.forEach(file => {
      const content = readSource(file);

      expect(content).not.toMatch(/from\s+['"]@\/utils\/supabase['"]/);
      expect(content).not.toMatch(/supabase\.auth\.mfa/);
    });
  });

  it('keeps MFA route types narrow and synchronized with thin route wrappers', () => {
    const routes = readSource('types/routes.types.ts');
    const verifyRoute = readSource('app/(auth)/verify-mfa.tsx').trim();
    const settingsRoute = readSource('app/(tabs)/profile/two-step-verification.tsx').trim();

    expect(routes).toContain("'(auth)/verify-mfa': undefined");
    expect(routes).toContain("'verify-mfa': undefined");
    expect(routes).toContain("'profile/two-step-verification': undefined");
    expect(routes).toContain("'two-step-verification': undefined");
    expect(verifyRoute).toBe("export { default } from '@/scenes/auth/VerifyMfa';");
    expect(settingsRoute).toBe("export { default } from '@/scenes/profile/TwoStepVerification';");
  });
});
