import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import OrderSuccess from '@/scenes/orders/OrderSuccess';

const mockReplace = jest.fn();
const mockUseOrderDetail = jest.fn();

jest.mock('@/hooks/useOrderDetail', () => ({
  useOrderDetail: (...args: unknown[]) => mockUseOrderDetail(...args),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({
    orderId: 'ORDER-123',
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

describe('<OrderSuccess />', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseOrderDetail.mockReset();
    mockUseOrderDetail.mockReturnValue({
      order: {
        id: 'ORDER-123',
        created_at: '2026-01-01T00:00:00Z',
        payment_status: 'settlement',
        total_amount: 10000,
        order_items: [
          {
            id: 'item-1',
            quantity: 1,
            price_at_purchase: 10000,
            products: { name: 'Vitamin C' },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  test('replaces to /home when the user presses back to home', () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Kembali ke Beranda'));

    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  test('does not render extra order navigation buttons', () => {
    render(<OrderSuccess />);

    expect(screen.queryByText('Lihat Detail Pesanan')).toBeNull();
    expect(screen.queryByText('Lihat Semua Pesanan')).toBeNull();
  });

  test('renders the success summary with payment and total information', () => {
    render(<OrderSuccess />);

    expect(screen.getAllByText('Pembayaran Berhasil').length).toBeGreaterThan(0);
    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.getAllByText('APT-ORDER-12')).toHaveLength(1);
    expect(screen.getByText('Ringkasan Pesanan')).not.toBeNull();
    expect(screen.getByText('Pembayaran telah berhasil dikonfirmasi')).not.toBeNull();
    expect(screen.getAllByText('Rp 10.000').length).toBeGreaterThan(0);
  });

  test('renders an unpaid hero state when payment is still pending', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        id: 'ORDER-123',
        created_at: '2026-01-01T00:00:00Z',
        payment_status: 'pending',
        total_amount: 10000,
        expired_at: null,
        order_items: [],
      },
      isLoading: false,
      error: null,
    });

    render(<OrderSuccess />);

    expect(screen.getByText('Menunggu Pembayaran')).not.toBeNull();
    expect(
      screen.getByText('Segera selesaikan pembayaran agar pesanan bisa diproses.'),
    ).not.toBeNull();
    expect(screen.queryByText('Pembayaran Sedang Diverifikasi')).toBeNull();
  });

  test('renders a failed-payment hero state without referring to removed order actions', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        id: 'ORDER-123',
        created_at: '2026-01-01T00:00:00Z',
        payment_status: 'failed',
        total_amount: 10000,
        expired_at: null,
        order_items: [],
      },
      isLoading: false,
      error: null,
    });

    render(<OrderSuccess />);

    expect(screen.getByText('Pembayaran Belum Berhasil')).not.toBeNull();
    expect(
      screen.getByText('Status pembayaran untuk pesanan ini memerlukan perhatian lebih lanjut.'),
    ).not.toBeNull();
    expect(
      screen.getByText('Silakan kembali ke beranda untuk melanjutkan penggunaan aplikasi.'),
    ).not.toBeNull();
    expect(screen.queryByText(/detail pesanan/i)).toBeNull();
    expect(screen.queryByText(/daftar pesanan/i)).toBeNull();
  });
});
