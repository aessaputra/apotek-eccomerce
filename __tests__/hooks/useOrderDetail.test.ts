import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { appActions } from '@/slices/app.slice';

const mockDispatch = jest.fn();
const mockGetOrderById = jest.fn();
const mockConfirmOrderReceived = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: () => undefined,
}));

jest.mock('@/services/order.service', () => ({
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
  confirmOrderReceived: (...args: unknown[]) => mockConfirmOrderReceived(...args),
}));

jest.mock('@/utils/error', () => ({
  classifyError: (error: unknown) => error,
  translateErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error ?? ''),
}));

const baseOrder = {
  id: 'order-1',
  user_id: 'user-1',
  total_amount: 100000,
  status: 'delivered',
  shipping_address_id: 'address-1',
  created_at: '2026-04-21T08:00:00.000Z',
  shipping_cost: 10000,
  updated_at: '2026-04-21T08:00:00.000Z',
  delivered_at: '2026-04-21T08:00:00.000Z',
  complaint_window_expires_at: '2026-04-23T08:00:00.000Z',
  customer_completed_at: null,
  customer_completion_source: null,
  customer_completion_stage: 'awaiting_customer',
  customer_order_bucket: 'shipped',
  expired_at: null,
  payment_status: 'settlement',
  midtrans_order_id: 'MID-1',
  gross_amount: 110000,
  courier_code: 'jne',
  courier_service: 'reg',
  shipping_etd: '2-3 hari',
  waybill_number: 'JNE123',
  snap_redirect_url: null,
  order_items: [],
  addresses: null,
};

describe('useOrderDetail confirmReceived', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockGetOrderById.mockReset();
    mockConfirmOrderReceived.mockReset();
  });

  it('invalidates shipped and completed caches after a successful confirmation', async () => {
    mockGetOrderById.mockResolvedValueOnce({ data: baseOrder, error: null }).mockResolvedValueOnce({
      data: {
        ...baseOrder,
        customer_completed_at: '2026-04-21T09:00:00.000Z',
        customer_completion_source: 'customer',
        customer_completion_stage: 'completed',
        customer_order_bucket: 'completed',
      },
      error: null,
    });
    mockConfirmOrderReceived.mockResolvedValue({
      data: {
        order_id: 'order-1',
        status: 'delivered',
        customer_completion_stage: 'completed',
        customer_completed_at: '2026-04-21T09:00:00.000Z',
      },
      error: null,
    });

    const { result } = renderHook(() => useOrderDetail('order-1'));

    await waitFor(() => {
      expect(result.current.order?.id).toBe('order-1');
    });

    await act(async () => {
      const response = await result.current.confirmReceived();
      expect(response).toBe(true);
    });

    expect(mockConfirmOrderReceived).toHaveBeenCalledWith('order-1');
    expect(mockDispatch).toHaveBeenCalledWith(
      appActions.invalidateOrdersByStatusCache({ cacheKey: 'shipped', userId: 'user-1' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      appActions.invalidateOrdersByStatusCache({ cacheKey: 'completed', userId: 'user-1' }),
    );
    expect(mockGetOrderById).toHaveBeenCalledTimes(2);
  });

  it('does not invalidate caches when confirmation fails', async () => {
    mockGetOrderById.mockResolvedValue({ data: baseOrder, error: null });
    mockConfirmOrderReceived.mockResolvedValue({
      data: null,
      error: new Error('Gagal mengonfirmasi penerimaan pesanan.'),
    });

    const { result } = renderHook(() => useOrderDetail('order-1'));

    await waitFor(() => {
      expect(result.current.order?.id).toBe('order-1');
    });

    await act(async () => {
      const response = await result.current.confirmReceived();
      expect(response).toBe(false);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockGetOrderById).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('Gagal mengonfirmasi penerimaan pesanan.');
  });
});
