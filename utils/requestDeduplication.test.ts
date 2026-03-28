import { describe, expect, test, afterEach } from '@jest/globals';
import {
  clearDedupedRequests,
  getInFlightRequestCount,
  runDedupedRequest,
} from './requestDeduplication';

describe('requestDeduplication', () => {
  afterEach(() => {
    clearDedupedRequests();
  });

  test('dedupes concurrent requests with the same key', async () => {
    let executionCount = 0;

    const executor = async () => {
      executionCount += 1;
      await Promise.resolve();
      return executionCount;
    };

    const [first, second] = await Promise.all([
      runDedupedRequest('orders:user-1:0:20', executor),
      runDedupedRequest('orders:user-1:0:20', executor),
    ]);

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(executionCount).toBe(1);
    expect(getInFlightRequestCount()).toBe(0);
  });

  test('replace policy aborts the in-flight request before starting a new one', async () => {
    const abortEvents: string[] = [];

    const firstRequest = runDedupedRequest(
      'orders:user-1:0:20',
      signal =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            abortEvents.push('aborted');
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
      { policy: 'dedupe' },
    );

    const secondRequest = runDedupedRequest('orders:user-1:0:20', async () => 'fresh-response', {
      policy: 'replace',
    });

    await expect(firstRequest).rejects.toMatchObject({ name: 'AbortError' });
    await expect(secondRequest).resolves.toBe('fresh-response');
    expect(abortEvents).toEqual(['aborted']);
    expect(getInFlightRequestCount()).toBe(0);
  });
});
