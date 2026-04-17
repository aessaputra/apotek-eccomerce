import { describe, expect, test } from '@jest/globals';
import {
  ErrorType,
  classifyError,
  createTypedError,
  isRetryableError,
  translateErrorMessage,
  withFallbackMessage,
} from '@/utils/error';

describe('error utils', () => {
  test('classifyError identifies NETWORK', () => {
    const result = classifyError(new Error('Failed to fetch products'));

    expect(result.type).toBe(ErrorType.NETWORK);
    expect(result.retryable).toBe(true);
  });

  test('classifyError identifies TIMEOUT', () => {
    const result = classifyError(new Error('Request timed out'));

    expect(result.type).toBe(ErrorType.TIMEOUT);
    expect(result.retryable).toBe(true);
  });

  test('classifyError identifies AUTH', () => {
    const result = classifyError({ status: 401, message: 'Unauthorized' });

    expect(result.type).toBe(ErrorType.AUTH);
    expect(result.retryable).toBe(false);
  });

  test('classifyError identifies VALIDATION', () => {
    const result = classifyError({ statusCode: 422, message: 'Validation failed' });

    expect(result.type).toBe(ErrorType.VALIDATION);
    expect(result.retryable).toBe(false);
  });

  test('classifyError identifies SERVER', () => {
    const result = classifyError({ status: 500, message: 'Internal server error' });

    expect(result.type).toBe(ErrorType.SERVER);
    expect(result.retryable).toBe(true);
  });

  test('classifyError identifies ABORT', () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';

    const result = classifyError(abortError);

    expect(result.type).toBe(ErrorType.ABORT);
    expect(result.retryable).toBe(false);
  });

  test('classifyError identifies UNKNOWN', () => {
    const result = classifyError(new Error('Something strange happened'));

    expect(result.type).toBe(ErrorType.UNKNOWN);
    expect(result.retryable).toBe(true);
  });

  test('translateErrorMessage returns Indonesian messages for each error type', () => {
    expect(
      translateErrorMessage({
        type: ErrorType.NETWORK,
        message: 'network',
        retryable: true,
      }),
    ).toContain('Koneksi internet bermasalah');

    expect(
      translateErrorMessage({
        type: ErrorType.TIMEOUT,
        message: 'timeout',
        retryable: true,
      }),
    ).toContain('Permintaan timeout');

    expect(
      translateErrorMessage({
        type: ErrorType.AUTH,
        message: 'auth',
        retryable: false,
      }),
    ).toContain('Sesi login Anda berakhir');

    expect(
      translateErrorMessage({
        type: ErrorType.SERVER,
        message: 'server',
        retryable: true,
      }),
    ).toContain('Layanan sedang bermasalah');

    expect(
      translateErrorMessage({
        type: ErrorType.ABORT,
        message: 'abort',
        retryable: false,
      }),
    ).toContain('Permintaan dibatalkan');
  });

  test('translateErrorMessage uses validation message and fallback for unknown', () => {
    expect(
      translateErrorMessage({
        type: ErrorType.VALIDATION,
        message: 'Nama penerima wajib diisi',
        retryable: false,
      }),
    ).toBe('Nama penerima wajib diisi');

    expect(
      translateErrorMessage({
        type: ErrorType.UNKNOWN,
        message: '  ',
        retryable: true,
      }),
    ).toBe('Terjadi kesalahan. Silakan coba lagi.');
  });

  test('isRetryableError matches retry policy', () => {
    expect(isRetryableError({ type: ErrorType.NETWORK, message: '', retryable: false })).toBe(true);
    expect(isRetryableError({ type: ErrorType.TIMEOUT, message: '', retryable: false })).toBe(true);
    expect(isRetryableError({ type: ErrorType.SERVER, message: '', retryable: false })).toBe(true);
    expect(isRetryableError({ type: ErrorType.UNKNOWN, message: '', retryable: false })).toBe(true);

    expect(isRetryableError({ type: ErrorType.AUTH, message: '', retryable: false })).toBe(false);
    expect(isRetryableError({ type: ErrorType.VALIDATION, message: '', retryable: false })).toBe(
      false,
    );
    expect(isRetryableError({ type: ErrorType.ABORT, message: '', retryable: false })).toBe(false);
  });

  test('classifyError handles null, undefined, and string errors', () => {
    expect(classifyError(null)).toMatchObject({
      type: ErrorType.UNKNOWN,
      message: 'Terjadi kesalahan yang tidak terduga.',
    });

    expect(classifyError(undefined)).toMatchObject({
      type: ErrorType.UNKNOWN,
      message: 'Terjadi kesalahan yang tidak terduga.',
    });

    expect(classifyError('Koneksi timeout')).toMatchObject({
      type: ErrorType.TIMEOUT,
      message: 'Koneksi timeout',
    });
  });

  test('classifyError extracts status from Error-like objects', () => {
    const statusObject = {
      message: 'Forbidden',
      statusCode: 403,
    };

    const result = classifyError(statusObject);

    expect(result.type).toBe(ErrorType.AUTH);
    expect(result.originalError?.message).toBe('Forbidden');
  });

  test('createTypedError derives retryability from error type', () => {
    expect(createTypedError(ErrorType.SERVER, 'Server error')).toEqual({
      type: ErrorType.SERVER,
      message: 'Server error',
      retryable: true,
    });

    expect(createTypedError(ErrorType.VALIDATION, 'Validation error')).toEqual({
      type: ErrorType.VALIDATION,
      message: 'Validation error',
      retryable: false,
    });
  });

  test('withFallbackMessage preserves non-empty messages and fills blank ones', () => {
    expect(
      withFallbackMessage(
        { type: ErrorType.UNKNOWN, message: 'Masih ada pesan', retryable: true },
        'Fallback',
      ),
    ).toEqual({ type: ErrorType.UNKNOWN, message: 'Masih ada pesan', retryable: true });

    expect(
      withFallbackMessage({ type: ErrorType.UNKNOWN, message: '  ', retryable: true }, 'Fallback'),
    ).toEqual({ type: ErrorType.UNKNOWN, message: 'Fallback', retryable: true });
  });
});
