import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  cancelUserOrder,
  createCheckoutOrder,
  getOrderPaymentStatus,
} from '@/services/checkout.service';

const mockGetSession = jest.fn<() => Promise<unknown>>();
const mockRefreshSession = jest.fn<() => Promise<unknown>>();
const mockInvoke = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSingle = jest.fn<() => Promise<unknown>>();
const mockEq = jest.fn<(field: string, value: string) => { single: typeof mockSingle }>();
const mockSelect = jest.fn<(columns: string) => { eq: typeof mockEq }>();
const mockFrom = jest.fn<(table: string) => { select: typeof mockSelect }>();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(args[0], args[1]),
    },
    from: (...args: unknown[]) => mockFrom(args[0] as string),
  },
}));

describe('checkout.service', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    mockInvoke.mockReset();
    mockSingle.mockReset();
    mockEq.mockReset();
    mockSelect.mockReset();
    mockFrom.mockReset();

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  test('creates checkout order via backend edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        order_id: 'order-1',
        total_amount: 125000,
        item_count: 3,
        checkout_idempotency_key: 'idem-123',
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
        service_name: 'Regular',
        service_code: 'reg',
        shipping_type: 'delivery',
        price: 10000,
        currency: 'IDR',
        estimated_delivery: '2-3 hari',
      },
      checkout_idempotency_key: 'idem-123',
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'create-checkout-order',
      expect.objectContaining({
        body: expect.objectContaining({
          shipping_address_id: 'address-1',
          destination_area_id: 'AREA-1',
          destination_postal_code: 12345,
          checkout_idempotency_key: 'idem-123',
        }),
        headers: {
          Authorization: 'Bearer token-123',
        },
      }),
    );
    expect(result).toEqual({
      data: {
        order_id: 'order-1',
        total_amount: 125000,
        item_count: 3,
        checkout_idempotency_key: 'idem-123',
      },
      error: null,
    });
  });

  test('reads payment status from order_read_model and defaults null payment state to pending', async () => {
    mockSingle.mockResolvedValue({
      data: {
        payment_status: null,
        status: null,
      },
      error: null,
    });

    const result = await getOrderPaymentStatus('order-1');

    expect(mockFrom).toHaveBeenCalledWith('order_read_model');
    expect(mockSelect).toHaveBeenCalledWith('payment_status, status');
    expect(mockEq).toHaveBeenCalledWith('id', 'order-1');
    expect(result).toEqual({
      data: {
        payment_status: 'pending',
        status: 'pending',
      },
      error: null,
    });
  });

  test('cancels user order via backend edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        cancelled: true,
        payment_status: 'cancel',
        order_status: 'cancelled',
        applied: true,
      },
      error: null,
    });

    const result = await cancelUserOrder('order-1');

    expect(mockInvoke).toHaveBeenCalledWith(
      'cancel-user-order',
      expect.objectContaining({
        body: { order_id: 'order-1' },
        headers: {
          Authorization: 'Bearer token-123',
        },
      }),
    );
    expect(result).toEqual({
      data: {
        cancelled: true,
        payment_status: 'cancel',
        order_status: 'cancelled',
        applied: true,
      },
      error: null,
    });
  });
});
