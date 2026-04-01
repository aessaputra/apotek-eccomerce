export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 1000;
const DEFAULT_MAX_DELAY = 10000;

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
  };

  if (maybeError.name === 'AbortError') {
    return true;
  }

  if (maybeError.code === 'ABORT_ERR') {
    return true;
  }

  if (typeof maybeError.message === 'string') {
    const normalizedMessage = maybeError.message.toLowerCase();
    if (normalizedMessage.includes('abort') || normalizedMessage.includes('aborted')) {
      return true;
    }
  }

  return false;
}

function delayMs(durationMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}

function getBackoffDelay(baseDelay: number, maxDelay: number, retryAttempt: number): number {
  const exponentialDelay = Math.min(maxDelay, baseDelay * 2 ** retryAttempt);
  const jitterRange = Math.min(1000, exponentialDelay * 0.3);
  const jitter = Math.random() * jitterRange;
  return Math.min(maxDelay, Math.round(exponentialDelay + jitter));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    shouldRetry,
  } = options;

  const safeMaxRetries = Math.max(0, Math.floor(maxRetries));
  const safeBaseDelay = Math.max(0, baseDelay);
  const safeMaxDelay = Math.max(safeBaseDelay, maxDelay);
  const retryPredicate = shouldRetry ?? (() => true);

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      if (attempt >= safeMaxRetries || !retryPredicate(error)) {
        throw error;
      }

      const waitDuration = getBackoffDelay(safeBaseDelay, safeMaxDelay, attempt);
      attempt += 1;
      await delayMs(waitDuration);
    }
  }
}
