import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  getOrderTabCounts,
  getOrdersOptimized,
  getPastPurchasedProducts,
} from '@/services/order.service';

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

const mockQueryQueues = new Map<string, QueryResult[]>();
const queryRecords: { table: string; operations: { method: string; args: unknown[] }[] }[] = [];
const mockFrom = jest.fn<(table: string) => unknown>();
const mockWithRetry = jest.fn();

function enqueueQuery(table: string, result: QueryResult) {
  const queue = mockQueryQueues.get(table) ?? [];
  queue.push(result);
  mockQueryQueues.set(table, queue);
}

function createQueryBuilder(table: string) {
  const record = { table, operations: [] as { method: string; args: unknown[] }[] };
  queryRecords.push(record);
  const execute = () =>
    Promise.resolve(mockQueryQueues.get(table)?.shift() ?? { data: null, error: null });

  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      record.operations.push({ method: 'select', args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      record.operations.push({ method: 'eq', args });
      return builder;
    },
    in: (...args: unknown[]) => {
      record.operations.push({ method: 'in', args });
      return builder;
    },
    or: (...args: unknown[]) => {
      record.operations.push({ method: 'or', args });
      return builder;
    },
    order: (...args: unknown[]) => {
      record.operations.push({ method: 'order', args });
      return builder;
    },
    range: (...args: unknown[]) => {
      record.operations.push({ method: 'range', args });
      return builder;
    },
    limit: (...args: unknown[]) => {
      record.operations.push({ method: 'limit', args });
      return builder;
    },
    maybeSingle: async () => execute(),
    single: async () => execute(),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      execute().then(resolve, reject),
  };

  return builder;
}

jest.mock('@/services/supabase.service', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(args[0] as string),
  },
}));

jest.mock('@/utils/error', () => ({
  classifyError: jest.fn(error => error),
  isRetryableError: jest.fn(() => false),
  translateErrorMessage: jest.fn(() => ''),
}));

jest.mock('@/utils/retry', () => ({
  withRetry: (...args: unknown[]) => mockWithRetry(...args),
}));

describe('order.service schema-aligned reads', () => {
  beforeEach(() => {
    mockQueryQueues.clear();
    queryRecords.length = 0;
    mockFrom.mockImplementation((table: string) => createQueryBuilder(table));
    mockWithRetry.mockImplementation(async (...args: unknown[]) => {
      const callback = args[0] as () => Promise<unknown>;
      return callback();
    });
  });

  test('counts tab buckets through order_read_model customer_order_bucket', async () => {
    enqueueQuery('order_read_model', { count: 2, error: null });
    enqueueQuery('order_read_model', { count: 3, error: null });
    enqueueQuery('order_read_model', { count: 4, error: null });
    enqueueQuery('order_read_model', { count: 1, error: null });

    const result = await getOrderTabCounts('user-1');

    expect(result).toEqual({
      data: {
        unpaid: 2,
        packing: 3,
        shipped: 4,
        completed: 1,
      },
      error: null,
    });

    const unpaidQuery = queryRecords[0];
    expect(unpaidQuery.table).toBe('order_read_model');
    expect(unpaidQuery.operations).toEqual(
      expect.arrayContaining([
        { method: 'eq', args: ['user_id', 'user-1'] },
        { method: 'eq', args: ['customer_order_bucket', 'unpaid'] },
      ]),
    );
  });

  test('excludes expired pending orders from unpaid reads at the query layer', async () => {
    enqueueQuery('order_read_model', {
      data: [],
      error: null,
    });

    const result = await getOrdersOptimized('user-1', {
      orderStatuses: ['pending'],
      paymentStatuses: ['pending'],
      excludeExpiredPending: true,
    });

    expect(result.error).toBeNull();
    expect(queryRecords[0]?.operations).toEqual(
      expect.arrayContaining([
        { method: 'in', args: ['status', ['pending']] },
        { method: 'in', args: ['payment_status', ['pending']] },
        { method: 'or', args: [expect.stringContaining('expired_at.is.null')] },
      ]),
    );
  });

  test('includes expired pending orders in history query logic alongside terminal payment states', async () => {
    enqueueQuery('order_read_model', {
      data: [],
      error: null,
    });

    const result = await getOrdersOptimized('user-1', {
      paymentStatuses: ['expire', 'cancel', 'deny'],
      includeExpiredPendingInHistory: true,
    });

    expect(result.error).toBeNull();
    expect(queryRecords[0]?.operations).toEqual(
      expect.arrayContaining([
        {
          method: 'or',
          args: [expect.stringContaining('payment_status.in.(expire,cancel,deny)')],
        },
      ]),
    );
    expect(queryRecords[0]?.operations).toEqual(
      expect.arrayContaining([
        {
          method: 'or',
          args: [expect.stringContaining('expired_at.lt.')],
        },
      ]),
    );
  });

  test('hydrates order list rows from order_read_model plus order_items/products/images', async () => {
    enqueueQuery('order_read_model', {
      data: [
        {
          id: 'order-1',
          created_at: '2026-04-18T11:00:00.000Z',
          total_amount: 65000,
          user_id: 'user-1',
          shipping_address_id: 'address-1',
          shipping_cost: 15000,
          updated_at: '2026-04-18T11:00:00.000Z',
          delivered_at: null,
          complaint_window_expires_at: null,
          customer_completed_at: null,
          customer_completion_source: null,
          customer_completion_stage: 'not_applicable',
          customer_order_bucket: 'packing',
          status: 'processing',
          payment_status: 'settlement',
          midtrans_order_id: 'MID-1',
          gross_amount: 65000,
          expired_at: null,
          courier_code: 'jne',
          courier_service: 'reg',
          shipping_etd: '2-3 hari',
          waybill_number: null,
          snap_redirect_url: null,
        },
      ],
      error: null,
    });
    enqueueQuery('order_items', {
      data: [
        {
          id: 'item-1',
          order_id: 'order-1',
          product_id: 'product-1',
          product_sku_at_purchase: 'VIT-C-001',
          quantity: 2,
          price_at_purchase: 25000,
          created_at: '2026-04-18T11:00:01.000Z',
        },
      ],
      error: null,
    });
    enqueueQuery('products', {
      data: [{ id: 'product-1', name: 'Vitamin C', slug: 'vitamin-c', sku: 'VIT-C-001' }],
      error: null,
    });
    enqueueQuery('product_images', {
      data: [{ product_id: 'product-1', url: 'https://img/1.jpg', sort_order: 0 }],
      error: null,
    });

    const result = await getOrdersOptimized('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'order-1',
        payment_status: 'settlement',
        courier_code: 'jne',
        order_items: [
          expect.objectContaining({
            order_id: 'order-1',
            product_id: 'product-1',
            products: expect.objectContaining({ name: 'Vitamin C', slug: 'vitamin-c' }),
          }),
        ],
      }),
    ]);
  });

  test('builds buy-again products from completed settled orders only and deduplicates products', async () => {
    enqueueQuery('order_read_model', {
      data: [
        { id: 'order-1', created_at: '2026-04-18T11:00:00.000Z' },
        { id: 'order-2', created_at: '2026-04-17T11:00:00.000Z' },
      ],
      error: null,
    });
    enqueueQuery('order_items', {
      data: [
        {
          id: 'item-1',
          order_id: 'order-1',
          product_id: 'product-1',
          product_sku_at_purchase: 'VIT-C-001',
          created_at: '2026-04-18T11:00:00.000Z',
        },
        {
          id: 'item-2',
          order_id: 'order-2',
          product_id: 'product-1',
          product_sku_at_purchase: 'VIT-C-001',
          created_at: '2026-04-17T11:00:00.000Z',
        },
        {
          id: 'item-3',
          order_id: 'order-2',
          product_id: 'product-2',
          product_sku_at_purchase: 'OBT-HABIS-001',
          created_at: '2026-04-17T10:00:00.000Z',
        },
      ],
      error: null,
    });
    enqueueQuery('products', {
      data: [
        {
          id: 'product-1',
          name: 'Vitamin C',
          price: 25000,
          sku: 'VIT-C-001',
          slug: 'vitamin-c',
          is_active: true,
          stock: 10,
        },
        {
          id: 'product-2',
          name: 'Obat Habis',
          price: 15000,
          sku: 'OBT-HABIS-001',
          slug: 'obat-habis',
          is_active: false,
          stock: 0,
        },
      ],
      error: null,
    });
    enqueueQuery('product_images', {
      data: [{ product_id: 'product-1', url: 'https://img/1.jpg', sort_order: 0 }],
      error: null,
    });

    const result = await getPastPurchasedProducts('user-1');

    expect(result).toEqual({
      data: [
        {
          id: 'product-1',
          name: 'Vitamin C',
          price: 25000,
          slug: 'vitamin-c',
          imageUrl: 'https://img/1.jpg',
        },
      ],
      error: null,
    });

    expect(queryRecords[0]?.operations).toEqual(
      expect.arrayContaining([
        { method: 'eq', args: ['customer_order_bucket', 'completed'] },
        { method: 'eq', args: ['payment_status', 'settlement'] },
      ]),
    );
  });
});
