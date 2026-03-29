import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { clearDedupedRequests } from '@/utils/requestDeduplication';
import {
  getCartItemsOptimized,
  getCartSnapshot,
  getOrCreateCart,
  updateCartItemQuantity,
} from './cart.service';

interface QueryResponse {
  rows?: unknown[];
  error?: Error | null;
}

function createRow(index: number, quantity: number, price: number, weight: number) {
  return {
    id: `cart-item-${index}`,
    cart_id: 'cart-1',
    product_id: `product-${index}`,
    quantity,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    product: {
      id: `product-${index}`,
      name: `Produk ${index}`,
      price,
      stock: 10,
      weight,
      slug: `produk-${index}`,
      is_active: true,
      product_images: [
        { id: `image-${index}`, url: `https://cdn.example.com/${index}.jpg`, sort_order: 0 },
      ],
    },
  };
}

function createPaginatedQuery(response: QueryResponse) {
  const resolved = {
    data: response.rows ?? [],
    error: response.error ?? null,
  };

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    range: jest.fn(async () => resolved),
  };
}

function createAggregateQuery(response: QueryResponse) {
  const resolved = {
    data: response.rows ?? [],
    error: response.error ?? null,
  };

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    order: jest.fn(async () => resolved),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createUpdateQuery(response: { row?: unknown; error?: Error | null }) {
  const resolved = {
    data: response.row ?? null,
    error: response.error ?? null,
  };

  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn(async () => resolved),
  };
}

const mockFrom = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('cart.service snapshot behavior', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    clearDedupedRequests();
  });

  it('concurrent getOrCreateCart calls - aborting first caller does not fail second caller', async () => {
    const deferredLookup = createDeferred<{
      data: Array<{ id: string; user_id: string }>;
      error: null;
    }>();

    const lookupQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn(() => deferredLookup.promise),
    };

    mockFrom.mockReturnValueOnce(lookupQuery);

    const localAbortError = (): Error => {
      const error = new Error('Caller aborted');
      error.name = 'AbortError';
      return error;
    };

    const getOrCreateCartWithLocalAbort = async (
      userId: string,
      signal: AbortSignal,
    ): Promise<Awaited<ReturnType<typeof getOrCreateCart>>> => {
      const request = getOrCreateCart(userId);

      if (signal.aborted) {
        throw localAbortError();
      }

      return Promise.race([
        request,
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(localAbortError()), { once: true });
        }),
      ]);
    };

    const firstCallerController = new AbortController();
    const firstCall = getOrCreateCartWithLocalAbort('user-1', firstCallerController.signal);
    const secondCall = getOrCreateCart('user-1');

    firstCallerController.abort();

    await expect(firstCall).rejects.toMatchObject({ name: 'AbortError' });

    deferredLookup.resolve({
      data: [{ id: 'cart-1', user_id: 'user-1' }],
      error: null,
    });

    await expect(secondCall).resolves.toEqual({
      data: { id: 'cart-1', user_id: 'user-1' },
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('getCartSnapshot returns accurate totals for full cart rows', async () => {
    const rows = [
      createRow(1, 2, 10000, 200),
      createRow(2, 1, 5000, 300),
      createRow(3, 4, 2500, 150),
    ];
    mockFrom.mockReturnValueOnce(createAggregateQuery({ rows }));

    const result = await getCartSnapshot('cart-1');

    expect(result.error).toBeNull();
    expect(result.snapshot).toEqual({
      itemCount: 7,
      estimatedWeightGrams: 1300,
      packageValue: 35000,
    });
  });

  it('getCartSnapshot does not request product_images', async () => {
    const aggregateQuery = createAggregateQuery({ rows: [createRow(1, 1, 10000, 200)] });
    mockFrom.mockReturnValueOnce(aggregateQuery);

    const result = await getCartSnapshot('cart-1');

    const selectArg = aggregateQuery.select.mock.calls[0]?.[0] as string;

    expect(result.error).toBeNull();
    expect(typeof selectArg).toBe('string');
    expect(selectArg).not.toContain('product_images');
  });

  it('computes page snapshot when no full snapshot requested', async () => {
    const rows = [createRow(1, 2, 10000, 200), createRow(2, 1, 5000, 300)];
    mockFrom.mockReturnValueOnce(createPaginatedQuery({ rows }));

    const result = await getCartItemsOptimized('cart-1', {
      offset: 0,
      limit: 20,
      includeFullSnapshot: false,
    });

    expect(result.error).toBeNull();
    expect(result.data?.snapshot).toEqual({
      itemCount: 3,
      estimatedWeightGrams: 700,
      packageValue: 25000,
    });
  });

  it('returns current page snapshot on load-more when full snapshot is disabled', async () => {
    const rows = [createRow(21, 2, 12000, 250), createRow(22, 3, 8000, 150)];
    mockFrom.mockReturnValueOnce(createPaginatedQuery({ rows }));

    const result = await getCartItemsOptimized('cart-1', {
      offset: 20,
      limit: 20,
      includeFullSnapshot: false,
    });

    expect(result.error).toBeNull();
    expect(result.data?.snapshot).toEqual({
      itemCount: 5,
      estimatedWeightGrams: 950,
      packageValue: 48000,
    });
  });

  it('returns page items with full-cart snapshot when includeFullSnapshot=true', async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => createRow(index, 1, 10000, 200));
    const allRows = Array.from({ length: 50 }, (_, index) => createRow(index, 1, 10000, 200));

    mockFrom.mockReturnValueOnce(createPaginatedQuery({ rows: pageRows }));
    mockFrom.mockReturnValueOnce(createAggregateQuery({ rows: allRows }));

    const result = await getCartItemsOptimized('cart-1', {
      offset: 0,
      limit: 20,
      replace: true,
      includeFullSnapshot: true,
    });

    expect(result.error).toBeNull();
    expect(result.data?.items).toHaveLength(20);
    expect(result.metrics?.hasMore).toBe(true);
    expect(result.data?.snapshot).toEqual({
      itemCount: 50,
      estimatedWeightGrams: 10000,
      packageValue: 500000,
    });
  });

  it('returns abort error when full snapshot fetch is aborted', async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => createRow(index, 1, 10000, 200));
    const pageQuery = createPaginatedQuery({ rows: pageRows });

    const snapshotAbortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    const snapshotQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockReturnThis(),
      order: jest.fn(async () => {
        throw snapshotAbortError;
      }),
    };

    mockFrom.mockReturnValueOnce(pageQuery);
    mockFrom.mockReturnValueOnce(snapshotQuery);

    const controller = new AbortController();
    const result = await getCartItemsOptimized('cart-1', {
      offset: 0,
      limit: 20,
      includeFullSnapshot: true,
      signal: controller.signal,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('passes AbortSignal to getCartSnapshot query', async () => {
    const aggregateQuery = createAggregateQuery({ rows: [createRow(1, 1, 10000, 200)] });
    mockFrom.mockReturnValueOnce(aggregateQuery);

    const controller = new AbortController();
    const result = await getCartSnapshot('cart-1', controller.signal);

    expect(aggregateQuery.abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(result.error).toBeNull();
    expect(result.snapshot.itemCount).toBe(1);
  });

  it('updates cart quantity with a minimal atomic payload', async () => {
    const updateQuery = createUpdateQuery({
      row: {
        id: 'cart-item-1',
        cart_id: 'cart-1',
        product_id: 'product-1',
        quantity: 3,
      },
    });

    mockFrom.mockReturnValueOnce(updateQuery);

    const result = await updateCartItemQuantity('cart-item-1', 3);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      id: 'cart-item-1',
      cart_id: 'cart-1',
      product_id: 'product-1',
      quantity: 3,
    });
    expect(updateQuery.select).toHaveBeenCalledWith('id, quantity, product_id, cart_id');
  });
});
