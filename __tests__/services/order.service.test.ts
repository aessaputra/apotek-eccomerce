import { describe, expect, jest, test } from '@jest/globals';
import {
  COMPLETED_ORDER_STATUSES,
  PACKING_ORDER_STATUSES,
  SHIPPED_ORDER_STATUSES,
  UNPAID_ORDER_STATUSES,
  UNPAID_PAYMENT_STATUSES,
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

  test('maps delivered orders to the completed label', () => {
    expect(getOrderStatusLabel('delivered')).toBe('Selesai');
    expect(getOrderStatusDisplay('delivered')).toEqual({
      label: 'Selesai',
      variant: 'success',
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
    expect(UNPAID_PAYMENT_STATUSES).toEqual(['pending', 'authorize']);
    expect(PACKING_ORDER_STATUSES).toEqual(['processing', 'awaiting_shipment']);
    expect(SHIPPED_ORDER_STATUSES).toEqual(['shipped', 'in_transit']);
    expect(COMPLETED_ORDER_STATUSES).toEqual(['delivered']);
  });
});
