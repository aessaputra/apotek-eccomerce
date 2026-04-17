import React from 'react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { BackHandler, Linking } from 'react-native';
import { render, screen } from '@/test-utils/renderWithTheme';
import Payment, {
  isDeepLink,
  isPollingTimeoutError,
  isTrustedPaymentUrl,
  parsePaymentNavigationStatus,
  translateCheckoutError,
} from '@/scenes/cart/Payment';

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockPollOrderPaymentStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRemovePersistData = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockDispatch = jest.fn();
const mockMarkCartCleared = jest.fn((timestamp: number) => ({
  type: 'MARK_CART_CLEARED',
  payload: timestamp,
}));
const mockInvalidateUnpaidOrdersCache = jest.fn((userId: string) => ({
  type: 'INVALIDATE_UNPAID',
  payload: userId,
}));
const mockInvalidateOrdersByStatusCache = jest.fn(
  (payload: { cacheKey: string; userId: string }) => ({
    type: 'INVALIDATE_BY_STATUS',
    payload,
  }),
);
const mockCanOpenURL = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockOpenURL = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockBackHandlerRemove = jest.fn();
const mockBackHandlerAddEventListener = jest.fn(
  (_eventName: 'hardwareBackPress', _handler: () => boolean | null | undefined) => ({
    remove: mockBackHandlerRemove,
  }),
);

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context') as Record<string, unknown>;

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-webview', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    WebView: (props: Record<string, unknown>) => <View testID="payment-webview" {...props} />,
  };
});

jest.mock('@/hooks/useDataPersist', () => ({
  DataPersistKeys: { CHECKOUT_SESSION: 'CHECKOUT_SESSION' },
  useDataPersist: () => ({
    removePersistData: (...args: unknown[]) => mockRemovePersistData(...args),
  }),
}));

jest.mock('@/services/checkout.service', () => ({
  pollOrderPaymentStatus: (...args: unknown[]) => mockPollOrderPaymentStatus(...args),
}));

jest.mock('@/slices', () => ({
  appActions: {
    invalidateUnpaidOrdersCache: (userId: string) => mockInvalidateUnpaidOrdersCache(userId),
    invalidateOrdersByStatusCache: (payload: { cacheKey: string; userId: string }) =>
      mockInvalidateOrdersByStatusCache(payload),
  },
  useAppSlice: () => ({
    user: { id: 'user-1' },
    dispatch: mockDispatch,
    markCartCleared: mockMarkCartCleared,
  }),
}));

jest.mock('@/components/icons', () => ({
  CloseIcon: () => null,
  LockIcon: () => null,
}));

describe('<Payment />', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'canOpenURL').mockImplementation((url: string) => mockCanOpenURL(url));
    jest.spyOn(Linking, 'openURL').mockImplementation((url: string) => mockOpenURL(url));
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (eventName: 'hardwareBackPress', handler: () => boolean | null | undefined) =>
          mockBackHandlerAddEventListener(eventName, handler),
      );

    mockReplace.mockReset();
    mockUseLocalSearchParams.mockReset();
    mockPollOrderPaymentStatus.mockReset();
    mockRemovePersistData.mockReset();
    mockDispatch.mockReset();
    mockMarkCartCleared.mockClear();
    mockInvalidateUnpaidOrdersCache.mockClear();
    mockInvalidateOrdersByStatusCache.mockClear();
    mockCanOpenURL.mockReset();
    mockOpenURL.mockReset();
    mockBackHandlerAddEventListener.mockClear();
    mockBackHandlerRemove.mockClear();

    mockUseLocalSearchParams.mockReturnValue({});
    mockRemovePersistData.mockResolvedValue(true);
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue();
  });

  test('returns users to /orders when the payment URL is missing', () => {
    render(<Payment />);

    fireEvent.press(screen.getByText('Kembali ke Pesanan'));

    expect(mockReplace).toHaveBeenCalledWith('/orders');
  });

  test('blocks invalid payment URLs before rendering the webview', () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://evil.com',
      orderId: 'order-1',
    });

    render(<Payment />);

    expect(screen.getByText('Link pembayaran tidak valid.')).toBeTruthy();
    expect(screen.queryByTestId('payment-webview')).toBeNull();
  });

  test('exports payment helper functions for critical parsing paths', () => {
    expect(isTrustedPaymentUrl('https://snap.midtrans.com/v1/abc123')).toBe(true);
    expect(isTrustedPaymentUrl('https://simulator.sandbox.midtrans.com/token')).toBe(true);
    expect(isTrustedPaymentUrl('https://evil.com/midtrans.com')).toBe(false);
    expect(isTrustedPaymentUrl('https://snap.midtrans.com.evil.com')).toBe(false);
    expect(isDeepLink('gojek://payment')).toBe(true);
    expect(isDeepLink('https://simulator.sandbox.midtrans.com/token')).toBe(false);
    expect(isDeepLink('https://snap.midtrans.com')).toBe(false);
    expect(translateCheckoutError('network error', 'fallback')).toContain('Koneksi internet');
    expect(isPollingTimeoutError('Status pembayaran masih diproses')).toBe(true);
    expect(
      parsePaymentNavigationStatus(
        'https://snap.midtrans.com/finish?transaction_status=settlement',
      ),
    ).toBe('success');
    expect(parsePaymentNavigationStatus('https://snap.midtrans.com/unfinish')).toBe('cancel');
    expect(parsePaymentNavigationStatus('https://snap.midtrans.com/finish')).toBe('pending');
  });

  test('finalizes successful payments from webview navigation and redirects to success page', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });
    mockPollOrderPaymentStatus.mockResolvedValue({
      data: { payment_status: 'settlement' },
      error: null,
    });

    render(<Payment />);

    await act(async () => {
      fireEvent(screen.getByTestId('payment-webview'), 'onNavigationStateChange', {
        url: 'https://snap.midtrans.com/finish?transaction_status=settlement',
      });
    });

    await waitFor(() => {
      expect(mockPollOrderPaymentStatus).toHaveBeenCalledWith('order-1', 12, 2000);
      expect(mockRemovePersistData).toHaveBeenCalledWith('CHECKOUT_SESSION');
      expect(mockReplace).toHaveBeenCalledWith('/orders/success?orderId=order-1');
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'INVALIDATE_UNPAID', payload: 'user-1' });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'INVALIDATE_BY_STATUS',
      payload: { cacheKey: 'packing', userId: 'user-1' },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'INVALIDATE_BY_STATUS',
      payload: { cacheKey: 'shipped', userId: 'user-1' },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'INVALIDATE_BY_STATUS',
      payload: { cacheKey: 'completed', userId: 'user-1' },
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MARK_CART_CLEARED' }),
    );
  });

  test('shows timeout state when payment status polling returns a processing timeout', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });
    mockPollOrderPaymentStatus.mockResolvedValue({
      data: null,
      error: new Error('Status pembayaran masih diproses, cek beberapa saat lagi'),
    });

    render(<Payment />);

    await act(async () => {
      fireEvent(screen.getByTestId('payment-webview'), 'onNavigationStateChange', {
        url: 'https://snap.midtrans.com/finish?transaction_status=pending',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Pembayaran sedang diproses')).toBeTruthy();
      expect(
        screen.getByText('Pembayaran sedang diproses. Cek status di halaman Pesanan.'),
      ).toBeTruthy();
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'INVALIDATE_UNPAID', payload: 'user-1' });
  });

  test('allows trusted Midtrans simulator URLs to render inside the webview', () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://simulator.sandbox.midtrans.com/v2/vtweb/test',
      orderId: 'order-1',
    });

    render(<Payment />);

    expect(screen.getByTestId('payment-webview')).toBeTruthy();
    expect(screen.queryByText('Link pembayaran tidak valid.')).toBeNull();
  });

  test('treats terminal failure status as failed payment and returns to orders', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });
    mockPollOrderPaymentStatus.mockResolvedValue({
      data: { payment_status: 'failure' },
      error: null,
    });

    render(<Payment />);

    await act(async () => {
      fireEvent(screen.getByTestId('payment-webview'), 'onNavigationStateChange', {
        url: 'https://snap.midtrans.com/error?transaction_status=failure',
      });
    });

    await waitFor(() => {
      expect(mockPollOrderPaymentStatus).toHaveBeenCalledWith('order-1', 12, 2000);
      expect(mockRemovePersistData).toHaveBeenCalledWith('CHECKOUT_SESSION');
      expect(mockReplace).toHaveBeenCalledWith('/orders');
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'INVALIDATE_UNPAID', payload: 'user-1' });
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MARK_CART_CLEARED' }),
    );
  });

  test('blocks untrusted webview navigation and shows a security message', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });

    render(<Payment />);

    await act(async () => {
      fireEvent(screen.getByTestId('payment-webview'), 'onShouldStartLoadWithRequest', {
        url: 'https://evil.example.com/payment',
      });
    });

    expect(
      screen.getByText('Navigasi ke halaman tidak dikenal diblokir untuk keamanan.'),
    ).toBeTruthy();
    expect(mockPollOrderPaymentStatus).not.toHaveBeenCalled();
  });

  test('opens supported deep links through native Linking', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });

    render(<Payment />);

    await act(async () => {
      fireEvent(screen.getByTestId('payment-webview'), 'onShouldStartLoadWithRequest', {
        url: 'gojek://payment',
      });
    });

    await waitFor(() => {
      expect(mockCanOpenURL).toHaveBeenCalledWith('gojek://payment');
      expect(mockOpenURL).toHaveBeenCalledWith('gojek://payment');
    });
  });

  test('opens the close confirmation dialog and finalizes pending state on confirm', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      paymentUrl: 'https://snap.midtrans.com/v1/token',
      orderId: 'order-1',
    });
    mockPollOrderPaymentStatus.mockResolvedValue({
      data: null,
      error: new Error('Status pembayaran masih diproses'),
    });

    render(<Payment />);

    fireEvent.press(screen.getByText('Tutup'));

    expect(screen.getByText('Batalkan Pembayaran?')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Batalkan & Keluar'));
    });

    await waitFor(() => {
      expect(mockPollOrderPaymentStatus).toHaveBeenCalledWith('order-1', 12, 2000);
      expect(screen.getByText('Pembayaran sedang diproses')).toBeTruthy();
    });
  });
});
