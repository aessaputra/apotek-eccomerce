type RequestPolicy = 'dedupe' | 'replace';

export interface RunDedupedRequestOptions {
  policy?: RequestPolicy;
}

interface InFlightRequest<T> {
  controller: AbortController;
  promise: Promise<T>;
}

const inFlightRequests = new Map<string, InFlightRequest<unknown>>();

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function runDedupedRequest<T>(
  key: string,
  executor: (signal: AbortSignal) => Promise<T>,
  options: RunDedupedRequestOptions = {},
): Promise<T> {
  const policy = options.policy ?? 'dedupe';
  const existing = inFlightRequests.get(key) as InFlightRequest<T> | undefined;

  if (existing && policy === 'dedupe') {
    return existing.promise;
  }

  if (existing && policy === 'replace') {
    existing.controller.abort();
    inFlightRequests.delete(key);
  }

  const controller = new AbortController();

  const promise = executor(controller.signal)
    .catch(error => {
      if (isAbortError(error)) {
        throw error;
      }

      throw error;
    })
    .finally(() => {
      const activeRequest = inFlightRequests.get(key);

      if (activeRequest?.promise === promise) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, { controller, promise });

  return promise;
}

export function cancelDedupedRequest(key: string): void {
  const request = inFlightRequests.get(key);

  if (!request) {
    return;
  }

  request.controller.abort();
  inFlightRequests.delete(key);
}

export function cancelDedupedRequests(prefix: string): void {
  Array.from(inFlightRequests.keys())
    .filter(key => key.startsWith(prefix))
    .forEach(cancelDedupedRequest);
}

export function getInFlightRequestCount(): number {
  return inFlightRequests.size;
}

export function clearDedupedRequests(): void {
  Array.from(inFlightRequests.keys()).forEach(cancelDedupedRequest);
}
