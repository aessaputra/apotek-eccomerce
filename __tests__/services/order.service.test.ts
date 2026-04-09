import { describe, expect, jest, test } from '@jest/globals';
import {
  COMPLETED_ORDER_STATUSES,
  PACKING_ORDER_STATUSES,
  SHIPPED_ORDER_STATUSES,
  UNPAID_ORDER_STATUSES,
  UNPAID_PAYMENT_STATUSES,
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

  test('maps awaiting_shipment to a Dikemas-aligned label', () => {
    expect(getOrderStatusLabel('awaiting_shipment')).toBe('Dikemas');
  });

  test('maps in_transit to a localized active shipping label', () => {
    expect(getOrderStatusLabel('in_transit')).toBe('Dalam Pengiriman');
  });

  test('uses operational order status for successful settled payments', () => {
    expect(getOrderPrimaryStatusDisplay('processing', 'settlement')).toEqual({
      label: 'Diproses',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('awaiting_shipment', 'settlement')).toEqual({
      label: 'Dikemas',
      variant: 'primary',
    });
    expect(getOrderPrimaryStatusDisplay('in_transit', 'settlement')).toEqual({
      label: 'Dalam Pengiriman',
      variant: 'primary',
    });
  });

  test('exposes payment detail separately from operational status', () => {
    expect(getOrderSecondaryStatusDisplay('processing', 'settlement')).toBe(
      'Pembayaran: Pembayaran Berhasil',
    );
  });

  test('exports lifecycle buckets aligned with backend changelog', () => {
    expect(UNPAID_ORDER_STATUSES).toEqual(['pending']);
    expect(UNPAID_PAYMENT_STATUSES).toEqual(['pending', 'authorize']);
    expect(PACKING_ORDER_STATUSES).toEqual(['paid', 'processing', 'awaiting_shipment']);
    expect(SHIPPED_ORDER_STATUSES).toEqual(['shipped', 'in_transit']);
    expect(COMPLETED_ORDER_STATUSES).toEqual(['delivered']);
  });
});
