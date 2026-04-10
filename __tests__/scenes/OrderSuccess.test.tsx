import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import OrderSuccess from '@/scenes/orders/OrderSuccess';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockUseOrderDetail = jest.fn();

jest.mock('@/hooks/useOrderDetail', () => ({
  useOrderDetail: (...args: unknown[]) => mockUseOrderDetail(...args),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    navigate: mockNavigate,
    push: mockPush,
  }),
  useLocalSearchParams: () => ({
    orderId: 'ORDER-123',
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

describe('<OrderSuccess />', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
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

  test('navigates to /home when the user presses back to home', () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Kembali ke Beranda'));

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  test('navigates to /orders when the user presses view all orders', () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Lihat Semua Pesanan'));

    expect(mockNavigate).toHaveBeenCalledWith('/orders');
  });

  test('pushes order detail route when the user presses view order detail', () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Lihat Detail Pesanan'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/order-detail/[orderId]',
      params: { orderId: 'ORDER-123' },
    });
  });

  test('renders the success summary with payment and total information', () => {
    render(<OrderSuccess />);

    expect(screen.getAllByText('Pembayaran Berhasil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('APT-ORDER-12')).toHaveLength(1);
    expect(screen.getByText('Ringkasan Pesanan')).not.toBeNull();
    expect(screen.getByText('Pembayaran telah berhasil dikonfirmasi')).not.toBeNull();
    expect(screen.getAllByText('Rp 10.000').length).toBeGreaterThan(0);
  });

  test('renders a pending-payment hero state when payment is still being verified', () => {
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

    expect(screen.getByText('Pembayaran Sedang Diverifikasi')).not.toBeNull();
    expect(
      screen.getByText('Status pembayaran akan diperbarui setelah proses verifikasi selesai.'),
    ).not.toBeNull();
    expect(screen.getByText('Menunggu Pembayaran')).not.toBeNull();
  });
});
