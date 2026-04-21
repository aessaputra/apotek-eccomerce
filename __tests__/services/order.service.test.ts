import { describe, expect, jest, test } from '@jest/globals';
import {
  COMPLETED_ORDER_STATUSES,
  PACKING_ORDER_STATUSES,
  SHIPPED_ORDER_STATUSES,
  UNPAID_ORDER_STATUSES,
  UNPAID_PAYMENT_STATUSES,
  getCanonicalPaymentStatus,
  getOrdersOptimized,
  getOrderStatusDisplay,
  isBackendExpired,
  getOrderPrimaryStatusDisplay,
  getOrderSecondaryStatusDisplay,
  getOrderStatusLabel,
} from '@/services/order.service';

jest.mock('@/services/supabase.service', () => ({
  supabase: {},
}));

jest.mock('@/utils/error', () => ({
  classifyError: jest.fn(),
  isRetryableError: jest.fn(() => false),
  translateErrorMessage: jest.fn(() => ''),
}));

jest.mock('@/utils/retry', () => ({
  withRetry: jest.fn(),
}));

const { withRetry } = jest.requireMock('@/utils/retry') as {
  withRetry: jest.Mock;
};

describe('order.service lifecycle helpers', () => {
  test('maps legacy paid status to processing label', () => {
    expect(getOrderStatusLabel('paid')).toBe('Diproses');
  });

  test('maps awaiting_shipment to a siap dikirim label', () => {
    expect(getOrderStatusLabel('awaiting_shipment')).toBe('Siap Dikirim');
  });

  test('maps shipped and in_transit to the current shipping labels', () => {
    expect(getOrderStatusLabel('shipped')).toBe('Diserahkan ke Kurir');
    expect(getOrderStatusLabel('in_transit')).toBe('Dalam Perjalanan');
  });

  test('maps delivered orders to the completed label once customer completion is done', () => {
    expect(getOrderStatusLabel('delivered')).toBe('Selesai');
    expect(getOrderStatusDisplay('delivered')).toEqual({
      label: 'Selesai',
      variant: 'success',
    });
  });

  test('maps delivered orders awaiting customer confirmation to terkirim', () => {
    expect(getOrderStatusLabel('delivered', 'awaiting_customer')).toBe('Terkirim');
    expect(getOrderStatusDisplay('delivered', 'awaiting_customer')).toEqual({
      label: 'Terkirim',
      variant: 'primary',
    });
  });

  test('uses operational order status for successful settled payments', () => {
    expect(getOrderPrimaryStatusDisplay('processing', 'settlement')).toEqual({
      label: 'Diproses',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('awaiting_shipment', 'settlement')).toEqual({
      label: 'Siap Dikirim',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('shipped', 'settlement')).toEqual({
      label: 'Diserahkan ke Kurir',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('in_transit', 'settlement')).toEqual({
      label: 'Dalam Perjalanan',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('delivered', 'settlement')).toEqual({
      label: 'Selesai',
      variant: 'success',
    });
    expect(
      getOrderPrimaryStatusDisplay('delivered', 'settlement', null, 'awaiting_customer'),
    ).toEqual({
      label: 'Terkirim',
      variant: 'primary',
    });
  });

  test('marks backend-expired pending payments as danger', () => {
    expect(getOrderPrimaryStatusDisplay('pending', 'pending', '2020-01-01T00:00:00Z')).toEqual({
      label: 'Pembayaran Kadaluarsa',
      variant: 'danger',
    });
  });

  test('keeps cancelled orders aligned to the official cancelled label', () => {
    expect(getOrderPrimaryStatusDisplay('cancelled', 'cancel')).toEqual({
      label: 'Dibatalkan',
      variant: 'danger',
    });
  });

  test('reports whether backend expiration timestamp has passed', () => {
    expect(isBackendExpired(null)).toBe(false);
    expect(isBackendExpired('2999-01-01T00:00:00Z')).toBe(false);
    expect(isBackendExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  test('exposes payment detail separately from operational status', () => {
    expect(getOrderSecondaryStatusDisplay('processing', 'settlement')).toBe('Pembayaran Berhasil');
  });

  test('exports lifecycle buckets aligned with backend changelog', () => {
    expect(UNPAID_ORDER_STATUSES).toEqual(['pending']);
    expect(UNPAID_PAYMENT_STATUSES).toEqual(['pending']);
    expect(PACKING_ORDER_STATUSES).toEqual(['processing', 'awaiting_shipment']);
    expect(SHIPPED_ORDER_STATUSES).toEqual(['shipped', 'in_transit']);
    expect(COMPLETED_ORDER_STATUSES).toEqual(['delivered']);
  });

  test('derives canonical payment status from the latest payment row', () => {
    expect(
      getCanonicalPaymentStatus([
        {
          status: 'pending',
          midtrans_order_id: 'old-order',
          gross_amount: 12000,
          expiry_time: '2026-04-18T10:00:00.000Z',
          redirect_url: 'https://example.com/old',
          updated_at: '2026-04-18T10:00:00.000Z',
          created_at: '2026-04-18T10:00:00.000Z',
        },
        {
          status: 'settlement',
          midtrans_order_id: 'new-order',
          gross_amount: 12000,
          expiry_time: null,
          redirect_url: 'https://example.com/new',
          updated_at: '2026-04-18T11:00:00.000Z',
          created_at: '2026-04-18T11:00:00.000Z',
        },
      ]),
    ).toBe('settlement');
  });

  test('defaults canonical payment status to pending when no payment rows exist', () => {
    expect(getCanonicalPaymentStatus([])).toBe('pending');
    expect(getCanonicalPaymentStatus(null)).toBe('pending');
  });

  test('suppresses warning logs for aborted getOrdersOptimized fetches', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const abortError = { name: 'UnknownError', message: 'Aborted' };

    withRetry.mockRejectedValueOnce(abortError);

    const result = await getOrdersOptimized('user-1');

    expect(result.data).toBeNull();
    expect(result.error?.name).toBe('AbortError');
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
