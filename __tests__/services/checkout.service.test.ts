import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  createCheckoutOrder,
  getOrderPaymentStatus,
  pollOrderPaymentStatus,
} from '@/services/checkout.service';

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

const mockQueryQueues = new Map<string, QueryResult[]>();
const mockFunctionInvoke = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetSession = jest.fn<() => Promise<unknown>>();
const mockRefreshSession = jest.fn<() => Promise<unknown>>();
const mockFrom = jest.fn<(table: string) => unknown>();
const queryRecords: { table: string; operations: { method: string; args: unknown[] }[] }[] = [];

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
    limit: (...args: unknown[]) => {
      record.operations.push({ method: 'limit', args });
      return builder;
    },
    single: async () => execute(),
    maybeSingle: async () => execute(),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      execute().then(resolve, reject),
  };

  return builder;
}

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(args[0] as string),
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionInvoke(...args),
    },
  },
}));

describe('checkout.service', () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockQueryQueues.clear();
    queryRecords.length = 0;
    mockFunctionInvoke.mockReset();
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockFrom.mockReset();
    mockFrom.mockImplementation((table: string) => createQueryBuilder(table));

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-1',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  test('returns the payment status from order_read_model', async () => {
    enqueueQuery('order_read_model', {
      data: { status: 'processing', payment_status: 'settlement' },
      error: null,
    });

    const result = await getOrderPaymentStatus('order-1');

    expect(result).toEqual({
      data: {
        payment_status: 'settlement',
        status: 'processing',
      },
      error: null,
    });
  });

  test('falls back to pending when payment status is null', async () => {
    enqueueQuery('order_read_model', {
      data: { status: 'pending', payment_status: null },
      error: null,
    });

    const result = await getOrderPaymentStatus('order-2');

    expect(result).toEqual({
      data: {
        payment_status: 'pending',
        status: 'pending',
      },
      error: null,
    });
  });

  test('creates checkout through edge function with backend-required payload', async () => {
    enqueueQuery('carts', { data: [{ id: 'cart-1' }], error: null });
    enqueueQuery('cart_items', {
      data: [{ id: 'cart-item-1', product_id: 'product-1', quantity: 2 }],
      error: null,
    });
    enqueueQuery('products', {
      data: [{ id: 'product-1', name: 'Vitamin C', price: 25000, stock: 10, is_active: true }],
      error: null,
    });
    mockFunctionInvoke.mockResolvedValue({
      data: {
        order_id: 'order-1',
        total_amount: 50000,
        item_count: 2,
        checkout_idempotency_key: 'idem-1',
      },
      error: null,
    });

    const result = await createCheckoutOrder({
      user_id: 'user-1',
      shipping_address_id: 'address-1',
      destination_area_id: 'AREA-1',
      destination_postal_code: 12345,
      shipping_option: {
        courier_name: 'JNE',
        courier_code: 'jne',
        service_name: 'REG',
        service_code: 'reg',
        shipping_type: 'parcel',
        price: 15000,
        currency: 'IDR',
        estimated_delivery: '2-3 hari',
      },
      checkout_idempotency_key: 'idem-1',
      selected_cart_item_ids: ['cart-item-1'],
    });

    expect(mockFunctionInvoke).toHaveBeenCalledWith('create-checkout-order', {
      body: {
        shipping_address_id: 'address-1',
        destination_area_id: 'AREA-1',
        destination_postal_code: 12345,
        selected_cart_item_ids: ['cart-item-1'],
        shipping_option: {
          courier_code: 'jne',
          service_code: 'reg',
          price: 15000,
          estimated_delivery: '2-3 hari',
        },
        checkout_idempotency_key: 'idem-1',
      },
      headers: {
        Authorization: 'Bearer token-1',
      },
    });
    expect(result).toEqual({
      data: {
        order_id: 'order-1',
        total_amount: 50000,
        item_count: 2,
        checkout_idempotency_key: 'idem-1',
      },
      error: null,
    });

    expect(queryRecords.find(record => record.table === 'cart_items')?.operations).toEqual([
      { method: 'select', args: ['id, product_id, quantity'] },
      { method: 'eq', args: ['cart_id', 'cart-1'] },
      { method: 'in', args: ['id', ['cart-item-1']] },
    ]);
  });

  test('rejects checkout before backend invocation when no cart items are selected', async () => {
    const result = await createCheckoutOrder({
      user_id: 'user-1',
      shipping_address_id: 'address-1',
      shipping_option: {
        courier_name: 'JNE',
        courier_code: 'jne',
        service_name: 'REG',
        service_code: 'reg',
        shipping_type: 'parcel',
        price: 15000,
        currency: 'IDR',
        estimated_delivery: '2-3 hari',
      },
      checkout_idempotency_key: 'idem-empty',
      selected_cart_item_ids: [],
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockFunctionInvoke).not.toHaveBeenCalled();
    expect(result.error?.message).toBe('Pilih minimal satu produk untuk checkout');
  });

  test('rejects checkout when destination area and postal code are both missing', async () => {
    enqueueQuery('carts', { data: [{ id: 'cart-1' }], error: null });
    enqueueQuery('cart_items', {
      data: [{ product_id: 'product-1', quantity: 1 }],
      error: null,
    });
    enqueueQuery('products', {
      data: [{ id: 'product-1', name: 'Vitamin C', price: 25000, stock: 10, is_active: true }],
      error: null,
    });

    const result = await createCheckoutOrder({
      user_id: 'user-1',
      shipping_address_id: 'address-1',
      shipping_option: {
        courier_name: 'JNE',
        courier_code: 'jne',
        service_name: 'REG',
        service_code: 'reg',
        shipping_type: 'parcel',
        price: 15000,
        currency: 'IDR',
        estimated_delivery: '2-3 hari',
      },
      checkout_idempotency_key: 'idem-2',
      selected_cart_item_ids: ['cart-item-1'],
    });

    expect(mockFunctionInvoke).not.toHaveBeenCalled();
    expect(result.error?.message).toContain('Alamat tujuan belum lengkap');
  });

  test('keeps polling when confirmation temporarily fails and authorize is returned', async () => {
    mockFunctionInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('temporary confirm failure'),
    });
    enqueueQuery('order_read_model', {
      data: { status: 'pending', payment_status: 'authorize' },
      error: null,
    });
    enqueueQuery('order_read_model', {
      data: { status: 'processing', payment_status: 'settlement' },
      error: null,
    });

    const result = await pollOrderPaymentStatus('order-3', 2, 0);

    expect(result).toEqual({
      data: {
        payment_status: 'settlement',
        status: 'processing',
      },
      error: null,
    });
    expect(mockFunctionInvoke).toHaveBeenCalledTimes(1);
    expect(mockFunctionInvoke).toHaveBeenNthCalledWith(1, 'confirm-midtrans-payment', {
      body: { order_id: 'order-3' },
      headers: { Authorization: 'Bearer token-1' },
    });
  });
});
