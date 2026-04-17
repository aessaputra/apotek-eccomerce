import React from 'react';
import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import {
  CartInitialLoadingOverlay,
  CartStatusBanners,
  ErrorBanner,
  OfflineBanner,
} from '@/scenes/cart/CartFeedback';

describe('<CartFeedback />', () => {
  test('renders warning banner with retry affordance and fallback title', () => {
    const onRetry = jest.fn();

    render(
      <ErrorBanner message="Perubahan keranjang belum sinkron." onRetry={onRetry} type="warning" />,
    );

    expect(screen.getByText('Menampilkan data keranjang tersimpan.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Muat ulang keranjang'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('renders offline banner messages for cached and uncached states', () => {
    const { rerender } = render(<OfflineBanner hasCachedData />);

    expect(screen.getByText('Data keranjang tersimpan tetap ditampilkan.')).toBeTruthy();

    rerender(<OfflineBanner hasCachedData={false} />);

    expect(
      screen.getByText('Koneksi internet terputus. Data keranjang tidak tersedia.'),
    ).toBeTruthy();
  });

  test('renders loading overlay with accessible label', () => {
    render(<CartInitialLoadingOverlay />);

    expect(screen.getByLabelText('Memuat keranjang')).toBeTruthy();
  });

  test('composes offline, fetch, and cart action banners together', () => {
    const onRetryFetch = jest.fn();
    const onDismissCartActionError = jest.fn();

    render(
      <CartStatusBanners
        isOffline
        hasCachedData
        offlineActionMessage="Checkout tidak tersedia offline"
        fetchError="Gagal mengambil keranjang"
        onRetryFetch={onRetryFetch}
        cartActionError="Gagal memperbarui jumlah"
        onDismissCartActionError={onDismissCartActionError}
      />,
    );

    expect(screen.getByText('Koneksi internet terputus')).toBeTruthy();
    expect(screen.getByText('Checkout tidak tersedia offline')).toBeTruthy();
    expect(screen.getByText('Gagal mengambil keranjang')).toBeTruthy();
    expect(screen.getByText('Gagal memperbarui jumlah')).toBeTruthy();

    const retryButtons = screen.getAllByLabelText('Muat ulang keranjang');
    fireEvent.press(retryButtons[0]!);
    fireEvent.press(retryButtons[1]!);

    expect(onRetryFetch).toHaveBeenCalledTimes(1);
    expect(onDismissCartActionError).toHaveBeenCalledTimes(1);
  });
});
