import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { withRetry } from '@/utils/retry';

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const operation = jest.fn(async () => 'ok');

    await expect(withRetry(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure up to maxRetries then succeeds', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary-1'))
      .mockRejectedValueOnce(new Error('temporary-2'))
      .mockResolvedValue('final-success');

    const pending = withRetry(operation, {
      maxRetries: 2,
      baseDelay: 10,
      maxDelay: 100,
    });

    await jest.runOnlyPendingTimersAsync();
    await jest.runOnlyPendingTimersAsync();

    await expect(pending).resolves.toBe('final-success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('uses exponential backoff with jitter', async () => {
    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('always fail'));

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    const observed = withRetry(operation, {
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 500,
    }).then(
      value => ({ ok: true as const, value }),
      error => ({ ok: false as const, error }),
    );

    await jest.runOnlyPendingTimersAsync();
    await jest.runOnlyPendingTimersAsync();

    const result = await observed;
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected retry operation to fail');
    }
    expect((result.error as Error).message).toContain('always fail');

    const delays = timeoutSpy.mock.calls
      .map(call => call[1])
      .filter((value): value is number => typeof value === 'number');

    expect(delays).toContain(115);
    expect(delays).toContain(230);
    expect(randomSpy).toHaveBeenCalled();
  });

  it('respects shouldRetry predicate', async () => {
    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('fatal'));
    const shouldRetry = jest.fn(() => false);

    await expect(withRetry(operation, { shouldRetry })).rejects.toThrow('fatal');

    expect(shouldRetry).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does not retry abort errors', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(abortError);
    const shouldRetry = jest.fn(() => true);

    await expect(withRetry(operation, { shouldRetry, maxRetries: 5 })).rejects.toBe(abortError);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).not.toHaveBeenCalled();
  });

  it('throws after maxRetries exceeded', async () => {
    const operation = jest
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('still failing'));

    const observed = withRetry(operation, {
      maxRetries: 1,
      baseDelay: 10,
      maxDelay: 50,
    }).then(
      value => ({ ok: true as const, value }),
      error => ({ ok: false as const, error }),
    );

    await jest.runOnlyPendingTimersAsync();

    const result = await observed;
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected retry operation to fail');
    }
    expect((result.error as Error).message).toContain('still failing');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
