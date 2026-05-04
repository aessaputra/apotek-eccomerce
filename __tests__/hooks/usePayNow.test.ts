import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePayNow } from '@/hooks/usePayNow';

const mockPush = jest.fn();
const mockRequestSnapTokenWithRetry = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useCartCheckout.helpers', () => ({
  requestSnapTokenWithRetry: (...args: unknown[]) => mockRequestSnapTokenWithRetry(...args),
}));

describe('usePayNow', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRequestSnapTokenWithRetry.mockReset();
  });

  it('navigates to payment screen when snap token request succeeds', async () => {
    mockRequestSnapTokenWithRetry.mockResolvedValue({
      redirectUrl: 'https://pay.example.com/order-1',
      snapToken: 'snap-1',
    });

    const onPaymentComplete = jest.fn();
    const { result } = renderHook(() => usePayNow({ orderId: 'order-1', onPaymentComplete }));

    await act(async () => {
      await result.current.handlePayNow();
    });

    expect(mockRequestSnapTokenWithRetry).toHaveBeenCalledWith('order-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/cart/payment',
      params: {
        paymentUrl: 'https://pay.example.com/order-1',
        orderId: 'order-1',
      },
    });
    expect(onPaymentComplete).toHaveBeenCalledWith(true);
  });

  it('reports translated retryable errors through onError', async () => {
    const onError = jest.fn();
    mockRequestSnapTokenWithRetry.mockRejectedValue(
      Object.assign(new Error('network timeout'), { status: 503 }),
    );

    const { result } = renderHook(() => usePayNow({ orderId: 'order-1', onError }));

    await act(async () => {
      await result.current.handlePayNow();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          retryable: true,
        }),
      );
    });
  });

  it('does not start another request while already processing', async () => {
    let resolveRequest: (() => void) | undefined;
    mockRequestSnapTokenWithRetry.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = () => resolve({ redirectUrl: 'https://pay.example.com/order-1' });
        }),
    );

    const { result } = renderHook(() => usePayNow({ orderId: 'order-1' }));

    await act(async () => {
      const first = result.current.handlePayNow();
      const second = result.current.handlePayNow();
      resolveRequest?.();
      await Promise.all([first, second]);
    });

    expect(mockRequestSnapTokenWithRetry).toHaveBeenCalledTimes(1);
  });
});
