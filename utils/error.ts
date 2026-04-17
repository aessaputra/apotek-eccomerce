export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  ABORT = 'ABORT',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

interface ErrorWithStatus {
  status?: number;
  statusCode?: number;
  code?: string;
  name?: string;
  message?: string;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ErrorWithStatus).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return '';
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const objectError = error as ErrorWithStatus;
  if (typeof objectError.status === 'number') {
    return objectError.status;
  }

  if (typeof objectError.statusCode === 'number') {
    return objectError.statusCode;
  }

  return null;
}

function toError(error: unknown): Error | undefined {
  if (error instanceof Error) {
    return error;
  }

  const message = getErrorMessage(error);
  if (message) {
    return new Error(message);
  }

  return undefined;
}

function detectErrorType(error: unknown, normalizedMessage: string): ErrorType {
  const status = getErrorStatus(error);

  if (status === 401 || status === 403 || normalizedMessage.includes('unauthorized')) {
    return ErrorType.AUTH;
  }

  if (
    status === 400 ||
    status === 404 ||
    status === 409 ||
    status === 422 ||
    normalizedMessage.includes('validation') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('tidak ditemukan')
  ) {
    return ErrorType.VALIDATION;
  }

  if (
    normalizedMessage.includes('abort') ||
    normalizedMessage.includes('cancel') ||
    normalizedMessage.includes('dibatalkan') ||
    (error && typeof error === 'object' && (error as ErrorWithStatus).name === 'AbortError')
  ) {
    return ErrorType.ABORT;
  }

  if (
    normalizedMessage.includes('timeout') ||
    normalizedMessage.includes('timed out') ||
    normalizedMessage.includes('etimedout')
  ) {
    return ErrorType.TIMEOUT;
  }

  if (
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('fetch') ||
    normalizedMessage.includes('offline') ||
    normalizedMessage.includes('koneksi')
  ) {
    return ErrorType.NETWORK;
  }

  if (typeof status === 'number' && status >= 500) {
    return ErrorType.SERVER;
  }

  if (
    normalizedMessage.includes('server') ||
    normalizedMessage.includes('database') ||
    normalizedMessage.includes('internal error')
  ) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

export function classifyError(error: unknown): AppError {
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();
  const type = detectErrorType(error, normalizedMessage);

  return {
    type,
    message: message || 'Terjadi kesalahan yang tidak terduga.',
    originalError: toError(error),
    retryable: isRetryableError({
      type,
      message,
      originalError: toError(error),
      retryable: false,
    }),
  };
}

export function translateErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.TIMEOUT:
      return 'Permintaan timeout. Pastikan koneksi stabil lalu coba lagi.';
    case ErrorType.NETWORK:
      return 'Koneksi internet bermasalah. Silakan cek jaringan Anda lalu coba lagi.';
    case ErrorType.AUTH:
      return 'Sesi login Anda berakhir. Silakan login kembali untuk melanjutkan.';
    case ErrorType.VALIDATION:
      return (
        error.message?.trim() || 'Data yang dikirim tidak valid. Periksa kembali lalu coba lagi.'
      );
    case ErrorType.SERVER:
      return 'Layanan sedang bermasalah. Silakan coba beberapa saat lagi.';
    case ErrorType.ABORT:
      return 'Permintaan dibatalkan. Silakan ulangi jika masih diperlukan.';
    case ErrorType.UNKNOWN:
    default:
      return error.message?.trim() || 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

export function createTypedError(type: ErrorType, message: string): AppError {
  const draft: AppError = {
    type,
    message,
    retryable: false,
  };

  return {
    ...draft,
    retryable: isRetryableError(draft),
  };
}

export function withFallbackMessage(error: AppError, fallback: string): AppError {
  if (error.message?.trim()) {
    return error;
  }

  return {
    ...error,
    message: fallback,
  };
}

export function isRetryableError(error: AppError): boolean {
  return (
    error.type === ErrorType.NETWORK ||
    error.type === ErrorType.TIMEOUT ||
    error.type === ErrorType.SERVER ||
    error.type === ErrorType.UNKNOWN
  );
}
