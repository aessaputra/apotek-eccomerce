import { validatePassword } from '@/utils/validation';

export const AUTH_FORM_STATUSES = ['idle', 'submitting', 'success', 'error'] as const;

export type AuthFormStatus = (typeof AUTH_FORM_STATUSES)[number];

export type AuthVerifyEmailRouteParams = {
  email: string;
};

export type AuthLoginMessageRouteParams = {
  resetSuccess?: string;
  error?: string;
};

export type AuthPasswordValidationResult = ReturnType<typeof validatePassword>;

export const LOGIN_RESET_SUCCESS_MESSAGE =
  'Password berhasil direset. Silakan login dengan password baru Anda.';

export function normalizeAuthEmail(email: string): string {
  return email.trim();
}

export function validateAuthPassword(password: string): AuthPasswordValidationResult {
  return validatePassword(password);
}

export function buildVerifyEmailRouteParams(email: string): AuthVerifyEmailRouteParams {
  return {
    email: normalizeAuthEmail(email),
  };
}

export function buildLoginMessageRouteParams(
  params: AuthLoginMessageRouteParams,
): AuthLoginMessageRouteParams {
  const routeParams: AuthLoginMessageRouteParams = {};

  if (params.resetSuccess !== undefined) {
    routeParams.resetSuccess = params.resetSuccess;
  }

  if (params.error !== undefined) {
    routeParams.error = params.error;
  }

  return routeParams;
}
