/**
 * Authentication error codes from Supabase Auth API
 * @see https://supabase.com/docs/reference/javascript/auth-error-codes
 */
export enum AuthErrorCode {
  // OTP/Email verification errors
  OTP_EXPIRED = 'otp_expired',
  OTP_INCORRECT = 'otp_incorrect',
  OTP_DISABLED = 'otp_disabled',
  OTP_FAILED = 'otp_failed',
  EMAIL_NOT_CONFIRMED = 'email_not_confirmed',
  EMAIL_ALREADY_CONFIRMED = 'email_already_confirmed',
  EMAIL_CONFLICT_IDENTITY_NOT_DELETED = 'email_conflict_identity_not_deleted',

  // OAuth errors
  ACCESS_DENIED = 'access_denied',
  INVALID_GRANT = 'invalid_grant',
  INVALID_REQUEST = 'invalid_request',
  INVALID_SCOPE = 'invalid_scope',
  INVALID_CLIENT = 'invalid_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  UNSUPPORTED_RESPONSE_TYPE = 'unsupported_response_type',
  SERVER_ERROR = 'server_error',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
  UNABLE_TO_EXCHANGE = 'unable_to_exchange',

  // User/account errors
  USER_ALREADY_EXISTS = 'user_already_exists',
  USER_NOT_FOUND = 'user_not_found',
  USER_BANNED = 'user_banned',
  IDENTITY_ALREADY_EXISTS = 'identity_already_exists',
  IDENTITY_NOT_FOUND = 'identity_not_found',
  IDENTITY_TOKEN_INVALID = 'identity_token_invalid',

  // Authentication errors
  INVALID_CREDENTIALS = 'invalid_credentials',
  INVALID_LOGIN_CREDENTIALS = 'invalid_login_credentials',
  INVALID_TOKEN = 'invalid_token',
  INVALID_REFRESH_TOKEN = 'invalid_refresh_token',
  INVALID_ACCESS_TOKEN = 'invalid_access_token',
  INVALID_AUDIENCE = 'invalid_audience',
  INVALID_APPLE_ID_TOKEN = 'invalid_apple_id_token',
  MISSING_ID_TOKEN = 'missing_id_token',

  // Request errors
  BAD_JSON = 'bad_json',
  BAD_JWT = 'bad_jwt',
  BAD_OAUTH_STATE = 'bad_oauth_state',
  BAD_OAUTH_CALLBACK = 'bad_oauth_callback',
  REQUEST_TIMEOUT = 'request_timeout',

  // Flow errors
  FLOW_STATE_NOT_FOUND = 'flow_state_not_found',
  FLOW_STATE_EXPIRED = 'flow_state_expired',
  VERIFICATION_FAILED = 'verification_failed',
  VERIFICATION_TIMEOUT = 'verification_timeout',

  // Provider errors
  PROVIDER_DISABLED = 'provider_disabled',
  PROVIDER_NOT_FOUND = 'provider_not_found',
  PROVIDER_NOT_SUPPORTED = 'provider_not_supported',

  // Rate limiting
  OVER_EMAIL_SEND_RATE_LIMIT = 'over_email_send_rate_limit',
  OVER_REQUEST_RATE_LIMIT = 'over_request_rate_limit',

  // Validation errors
  VALIDATION_FAILED = 'validation_failed',
  SAME_PASSWORD = 'same_password',
  WEAK_PASSWORD = 'weak_password',
  NEW_PASSWORD_SHOULD_BE_DIFFERENT_FROM_THE_OLD_PASSWORD = 'new_password_should_be_different_from_the_old_password',

  // Conflict errors
  CONFLICT = 'conflict',
  REAUTH_NEEDED = 'reauth_needed',
  REAUTH_NOT_VALID = 'reauth_not_valid',
  SESSION_NOT_FOUND = 'session_not_found',
  SESSION_EXPIRED = 'session_expired',
  CODE_CHALLENGE_NOT_FOUND = 'code_challenge_not_found',
  CODE_CHALLENGE_MISMATCH = 'code_challenge_mismatch',
}

/**
 * User-friendly error messages in Indonesian
 * Maps error codes to localized messages
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode | string, string> = {
  // OTP/Email verification
  [AuthErrorCode.OTP_EXPIRED]: 'Tautan verifikasi telah kedaluwarsa. Silakan minta tautan baru.',
  [AuthErrorCode.OTP_INCORRECT]: 'Kode verifikasi tidak valid. Silakan coba lagi.',
  [AuthErrorCode.OTP_DISABLED]: 'Verifikasi OTP tidak diaktifkan untuk akun ini.',
  [AuthErrorCode.OTP_FAILED]: 'Verifikasi gagal. Silakan coba lagi atau hubungi support.',
  [AuthErrorCode.EMAIL_NOT_CONFIRMED]: 'Email belum diverifikasi. Periksa kotak masuk Anda.',
  [AuthErrorCode.EMAIL_ALREADY_CONFIRMED]: 'Email sudah diverifikasi sebelumnya.',
  [AuthErrorCode.EMAIL_CONFLICT_IDENTITY_NOT_DELETED]:
    'Terjadi konflik saat mengelola identitas email.',

  // OAuth errors
  [AuthErrorCode.ACCESS_DENIED]:
    'Akses ditolak. Anda membatalkan login atau tidak memberikan izin yang diperlukan.',
  [AuthErrorCode.INVALID_GRANT]: 'Autentikasi gagal. Silakan coba login lagi.',
  [AuthErrorCode.INVALID_REQUEST]: 'Permintaan autentikasi tidak valid. Silakan coba lagi.',
  [AuthErrorCode.INVALID_SCOPE]: 'Izin akses tidak valid.',
  [AuthErrorCode.INVALID_CLIENT]: 'Aplikasi klien tidak valid.',
  [AuthErrorCode.UNSUPPORTED_GRANT_TYPE]: 'Tipe autentikasi tidak didukung.',
  [AuthErrorCode.UNSUPPORTED_RESPONSE_TYPE]: 'Tipe respons tidak didukung.',
  [AuthErrorCode.SERVER_ERROR]: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
  [AuthErrorCode.TEMPORARILY_UNAVAILABLE]:
    'Layanan autentikasi sementara tidak tersedia. Silakan coba lagi nanti.',
  [AuthErrorCode.UNABLE_TO_EXCHANGE]: 'Gagal menukar kode autentikasi. Silakan coba lagi.',

  // User/account errors
  [AuthErrorCode.USER_ALREADY_EXISTS]:
    'Email sudah terdaftar. Silakan login atau gunakan email lain.',
  [AuthErrorCode.USER_NOT_FOUND]: 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.',
  [AuthErrorCode.USER_BANNED]: 'Akun Anda telah dinonaktifkan.',
  [AuthErrorCode.IDENTITY_ALREADY_EXISTS]: 'Identitas sudah terhubung dengan akun lain.',
  [AuthErrorCode.IDENTITY_NOT_FOUND]: 'Identitas tidak ditemukan.',
  [AuthErrorCode.IDENTITY_TOKEN_INVALID]: 'Token identitas tidak valid.',

  // Authentication errors
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Email atau password salah. Periksa kembali informasi Anda.',
  [AuthErrorCode.INVALID_LOGIN_CREDENTIALS]:
    'Email atau password salah. Periksa kembali informasi Anda.',
  [AuthErrorCode.INVALID_TOKEN]: 'Token autentikasi tidak valid.',
  [AuthErrorCode.INVALID_REFRESH_TOKEN]: 'Sesi tidak valid. Silakan login kembali.',
  [AuthErrorCode.INVALID_ACCESS_TOKEN]: 'Token akses tidak valid.',
  [AuthErrorCode.INVALID_AUDIENCE]: 'Audience token tidak valid.',
  [AuthErrorCode.INVALID_APPLE_ID_TOKEN]: 'Token Apple ID tidak valid.',
  [AuthErrorCode.MISSING_ID_TOKEN]: 'Token ID tidak ditemukan.',

  // Request errors
  [AuthErrorCode.BAD_JSON]: 'Format data tidak valid.',
  [AuthErrorCode.BAD_JWT]: 'Token autentikasi tidak valid.',
  [AuthErrorCode.BAD_OAUTH_STATE]: 'State OAuth tidak valid. Mungkin terjadi serangan CSRF.',
  [AuthErrorCode.BAD_OAUTH_CALLBACK]: 'Callback OAuth tidak valid.',
  [AuthErrorCode.REQUEST_TIMEOUT]: 'Permintaan timeout. Periksa koneksi internet Anda.',

  // Flow errors
  [AuthErrorCode.FLOW_STATE_NOT_FOUND]: 'Sesi verifikasi tidak ditemukan.',
  [AuthErrorCode.FLOW_STATE_EXPIRED]: 'Sesi verifikasi telah kedaluwarsa.',
  [AuthErrorCode.VERIFICATION_FAILED]: 'Verifikasi gagal. Silakan coba lagi.',
  [AuthErrorCode.VERIFICATION_TIMEOUT]: 'Verifikasi timeout. Silakan coba lagi.',

  // Provider errors
  [AuthErrorCode.PROVIDER_DISABLED]: 'Provider autentikasi tidak diaktifkan.',
  [AuthErrorCode.PROVIDER_NOT_FOUND]: 'Provider autentikasi tidak ditemukan.',
  [AuthErrorCode.PROVIDER_NOT_SUPPORTED]: 'Provider autentikasi tidak didukung.',

  // Rate limiting
  [AuthErrorCode.OVER_EMAIL_SEND_RATE_LIMIT]:
    'Terlalu banyak permintaan email. Silakan tunggu beberapa menit.',
  [AuthErrorCode.OVER_REQUEST_RATE_LIMIT]: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',

  // Validation errors
  [AuthErrorCode.VALIDATION_FAILED]: 'Validasi data gagal. Periksa kembali input Anda.',
  [AuthErrorCode.SAME_PASSWORD]: 'Password baru tidak boleh sama dengan password lama.',
  [AuthErrorCode.WEAK_PASSWORD]: 'Password terlalu lemah. Gunakan kombinasi yang lebih kuat.',
  [AuthErrorCode.NEW_PASSWORD_SHOULD_BE_DIFFERENT_FROM_THE_OLD_PASSWORD]:
    'Password baru harus berbeda dari password lama.',

  // Conflict errors
  [AuthErrorCode.CONFLICT]: 'Terjadi konflik. Silakan coba lagi.',
  [AuthErrorCode.REAUTH_NEEDED]: 'Autentikasi ulang diperlukan.',
  [AuthErrorCode.REAUTH_NOT_VALID]: 'Autentikasi ulang tidak valid.',
  [AuthErrorCode.SESSION_NOT_FOUND]: 'Sesi tidak ditemukan. Silakan login kembali.',
  [AuthErrorCode.SESSION_EXPIRED]: 'Sesi telah berakhir. Silakan login kembali.',
  [AuthErrorCode.CODE_CHALLENGE_NOT_FOUND]: 'Code challenge tidak ditemukan.',
  [AuthErrorCode.CODE_CHALLENGE_MISMATCH]: 'Code challenge tidak cocok.',
};

/**
 * Generic success message for forgot password requests.
 * Keeps account existence private while confirming the request was accepted.
 */
export const AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE =
  'Jika email terdaftar, tautan reset password telah dikirim.';

/**
 * Reset password copy for invalid or expired recovery links.
 */
export const AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE =
  'Tautan reset password tidak valid atau kedaluwarsa. Silakan minta tautan baru.';

/**
 * Custom error names for Google OAuth and other auth flows
 */
export enum AuthErrorName {
  OAuthCallbackError = 'OAuthCallbackError',
  AuthCodeError = 'AuthCodeError',
  OAuthCallbackParseError = 'OAuthCallbackParseError',
  AuthLockedError = 'AuthLockedError',
  AuthCancelError = 'AuthCancelError',
  AuthGoogleError = 'AuthGoogleError',
  ExchangeCodeError = 'ExchangeCodeError',
  AuthError = 'AuthError',
  NetworkError = 'NetworkError',
}

/**
 * Custom error messages for flow-specific errors
 */
export const AUTH_FLOW_ERROR_MESSAGES: Record<AuthErrorName, string> = {
  [AuthErrorName.OAuthCallbackError]: 'Autentikasi gagal. Silakan coba lagi.',
  [AuthErrorName.AuthCodeError]: 'Kode autentikasi tidak ditemukan.',
  [AuthErrorName.OAuthCallbackParseError]: 'Gagal memproses respons autentikasi.',
  [AuthErrorName.AuthLockedError]: 'Sesi login sedang berjalan. Coba lagi sebentar.',
  [AuthErrorName.AuthCancelError]: 'Login dibatalkan.',
  [AuthErrorName.AuthGoogleError]: 'Gagal login dengan Google.',
  [AuthErrorName.ExchangeCodeError]: 'Gagal menukar kode autentikasi.',
  [AuthErrorName.AuthError]: 'Terjadi kesalahan autentikasi.',
  [AuthErrorName.NetworkError]: 'Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.',
};

/**
 * Get user-friendly error message from error code or error object
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'Terjadi kesalahan yang tidak diketahui.';
  }

  // Handle error object with code property
  if (typeof error === 'object' && error !== null) {
    // Check for Supabase AuthError with code
    if ('code' in error && typeof error.code === 'string') {
      const message = AUTH_ERROR_MESSAGES[error.code];
      if (message) return message;
    }

    // Check for error name (custom errors)
    if ('name' in error && typeof error.name === 'string') {
      const flowMessage = AUTH_FLOW_ERROR_MESSAGES[error.name as AuthErrorName];
      if (flowMessage) return flowMessage;
    }

    // Check for message property
    if ('message' in error && typeof error.message === 'string') {
      // Try to extract error code from message
      for (const [code, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
        if (error.message.toLowerCase().includes(code.toLowerCase())) {
          return message;
        }
      }
      return error.message;
    }
  }

  // Handle string error
  if (typeof error === 'string') {
    for (const [code, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
      if (error.toLowerCase().includes(code.toLowerCase())) {
        return message;
      }
    }
    return error;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
}

/**
 * Check if error is a cancellation error (user cancelled)
 */
export function isCancellationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // Check error name
  if ('name' in error && error.name === AuthErrorName.AuthCancelError) {
    return true;
  }

  // Check error code
  if ('code' in error && error.code === AuthErrorCode.ACCESS_DENIED) {
    return true;
  }

  // Check message for cancellation keywords
  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('cancel') ||
      msg.includes('dibatalkan') ||
      msg.includes('access_denied') ||
      msg.includes('user denied')
    );
  }

  return false;
}

/**
 * Check if error requires a retry (network issues, timeouts)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const retryableCodes = [
    AuthErrorCode.REQUEST_TIMEOUT,
    AuthErrorCode.VERIFICATION_TIMEOUT,
    AuthErrorCode.SERVER_ERROR,
    AuthErrorCode.TEMPORARILY_UNAVAILABLE,
    AuthErrorCode.OVER_REQUEST_RATE_LIMIT,
    AuthErrorCode.OVER_EMAIL_SEND_RATE_LIMIT,
  ];

  if ('code' in error && typeof error.code === 'string') {
    return retryableCodes.includes(error.code as AuthErrorCode);
  }

  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('connection') ||
      msg.includes('koneksi')
    );
  }

  return false;
}

/**
 * Check if error indicates user already exists
 */
export function isUserAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  if ('code' in error && error.code === AuthErrorCode.USER_ALREADY_EXISTS) {
    return true;
  }

  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return msg.includes('user already registered') || msg.includes('already exists');
  }

  return false;
}

/**
 * Check if error indicates OTP expired
 */
export function isOtpExpiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  if ('code' in error && error.code === AuthErrorCode.OTP_EXPIRED) {
    return true;
  }

  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return msg.includes('otp_expired') || msg.includes('expired');
  }

  return false;
}

/**
 * Check if error indicates email not verified
 */
export function isEmailNotVerifiedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  if ('code' in error && error.code === AuthErrorCode.EMAIL_NOT_CONFIRMED) {
    return true;
  }

  if ('message' in error && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return msg.includes('email_not_confirmed') || msg.includes('not confirmed');
  }

  return false;
}

function getErrorText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return '';
}

/**
 * Check if a forgot-password error should be treated as a private generic success.
 */
export function isPrivacySafeForgotPasswordError(error: unknown): boolean {
  if (!error) return false;

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    if (error.code === AuthErrorCode.USER_NOT_FOUND) {
      return true;
    }
  }

  const message = getErrorText(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes('user not found') ||
    message.includes('account not found') ||
    message.includes('email not found') ||
    message.includes('akun tidak ditemukan') ||
    message.includes('email tidak ditemukan') ||
    message.includes('user_not_found') ||
    message.includes('account_not_found') ||
    message.includes('email_not_found')
  );
}

/**
 * Check if a recovery token failure should show invalid/expired reset-link copy.
 */
export function isRecoveryTokenFailureError(error: unknown): boolean {
  if (!error) return false;

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code === AuthErrorCode.OTP_EXPIRED || error.code === AuthErrorCode.INVALID_GRANT;
  }

  const message = getErrorText(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes(AuthErrorCode.OTP_EXPIRED) || message.includes(AuthErrorCode.INVALID_GRANT)
  );
}

/**
 * Get the reset password copy for recovery token failures.
 */
export function getRecoveryTokenFailureMessage(error: unknown): string | undefined {
  return isRecoveryTokenFailureError(error) ? AUTH_RESET_PASSWORD_INVALID_LINK_MESSAGE : undefined;
}
