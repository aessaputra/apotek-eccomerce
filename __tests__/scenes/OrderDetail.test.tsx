import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render, screen } from '@/test-utils/renderWithTheme';
import OrderDetail from '@/scenes/orders/OrderDetail';

const mockPush = jest.fn();
const mockUseOrderDetail = jest.fn();
const mockBottomActionBar = jest.fn();
const mockCancelUserOrder = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: () => ({ orderId: 'test-order-id' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useOrderDetail', () => ({
  useOrderDetail: (...args: unknown[]) => mockUseOrderDetail(...args),
}));

jest.mock('@/hooks', () => ({
  useOrderDetail: (...args: unknown[]) => mockUseOrderDetail(...args),
}));

jest.mock('@/services/checkout.service', () => ({
  cancelUserOrder: (...args: unknown[]) => mockCancelUserOrder(...args),
}));

jest.mock('@/components/elements/PaymentCountdownTimer', () => ({
  PaymentCountdownTimer: () => null,
}));

jest.mock('@/components/layouts/BottomActionBar', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockBottomActionBar(props);
    return null;
  },
}));

jest.mock('@/components/elements/Image', () => ({
  __esModule: true,
  default: () => null,
}));

const mockOrder = {
  id: 'test-order-id',
  created_at: '2026-12-15T10:30:00Z',
  status: 'processing',
  payment_status: 'settlement',
  gross_amount: 150000,
  total_amount: 150000,
  shipping_cost: 10000,
  order_items: [
    {
      id: 'item-1',
      price_at_purchase: 70000,
      quantity: 2,
      products: {
        id: 'product-1',
        name: 'Test Product',
        product_images: [{ url: 'https://example.com/image.jpg', sort_order: 0 }],
      },
    },
  ],
  addresses: {
    receiver_name: 'John Doe',
    phone_number: '08123456789',
    street_address: 'Jl. Test No. 123',
    address_note: 'Blok B dekat pos satpam',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postal_code: '12345',
  },
  courier_code: 'jne',
  courier_service: 'REG',
  shipping_etd: '2-3 hari',
};

describe('<OrderDetail />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseOrderDetail.mockReset();
    mockBottomActionBar.mockReset();
    mockCancelUserOrder.mockReset();
    mockCancelUserOrder.mockResolvedValue({ data: { cancelled: true }, error: null });
  });

  test('renders loading state', () => {
    mockUseOrderDetail.mockReturnValue({
      order: null,
      status: 'loading',
      isLoading: true,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Memuat detail pesanan...')).not.toBeNull();
  });

  test('renders not-found state when order ID is missing', () => {
    mockUseOrderDetail.mockReturnValue({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Pesanan Tidak Ditemukan')).not.toBeNull();
  });

  test('renders error state', () => {
    mockUseOrderDetail.mockReturnValue({
      order: null,
      status: 'error',
      isLoading: false,
      isRefreshing: false,
      error: 'Network error',
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Gagal Memuat Pesanan')).not.toBeNull();
    expect(screen.getByText('Network error')).not.toBeNull();
  });

  test('renders order details with successful payment status', () => {
    mockUseOrderDetail.mockReturnValue({
      order: mockOrder,
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.getByText('APT-TEST-ORD')).not.toBeNull();
    expect(screen.getByText('Produk')).not.toBeNull();
    expect(screen.getByText('Alamat Pengiriman')).not.toBeNull();
    expect(screen.getByText('John Doe')).not.toBeNull();
    expect(screen.getByText('Blok B dekat pos satpam')).not.toBeNull();
    expect(screen.getByText('Metode Pengiriman')).not.toBeNull();
    expect(screen.getByText('Total')).not.toBeNull();
  });

  test('hides address note when no supplementary detail was saved', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        addresses: {
          ...mockOrder.addresses,
          address_note: null,
        },
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.queryByText('Blok B dekat pos satpam')).toBeNull();
  });

  test('renders payment status label for settled payment', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        payment_status: 'settlement',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Status Pembayaran')).not.toBeNull();
    expect(screen.getByText('Pembayaran Berhasil')).not.toBeNull();
  });

  test('renders order with pending payment status', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'pending',
        payment_status: 'pending',
        snap_redirect_url: 'https://payment.url',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.getByText('Status')).not.toBeNull();
    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Bayar Sekarang',
        disabled: false,
      }),
    );
  });

  test('disables payment CTA when pending order is already expired', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'pending',
        payment_status: 'pending',
        snap_redirect_url: 'https://payment.url',
        expired_at: '2020-01-01T00:00:00Z',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Pembayaran Kadaluarsa',
        disabled: true,
      }),
    );
  });

  test('opens cancel confirmation and cancels actionable unpaid order', async () => {
    const mockRefresh = jest.fn();
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'pending',
        payment_status: 'pending',
        snap_redirect_url: 'https://payment.url',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefresh,
    });

    render(<OrderDetail />);

    fireEvent.press(screen.getByText('Batalkan Pesanan'));
    fireEvent.press(screen.getByText('Ya, Batalkan Pesanan'));

    await waitFor(() => {
      expect(mockCancelUserOrder).toHaveBeenCalledWith('test-order-id');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  test('renders order without shipping info', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        courier_code: null,
        courier_service: null,
        shipping_etd: null,
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.queryByText('Metode Pengiriman')).toBeNull();
  });

  test('renders order without address', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        addresses: null,
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.queryByText('Alamat Pengiriman')).toBeNull();
  });

  test('displays product information correctly', () => {
    mockUseOrderDetail.mockReturnValue({
      order: mockOrder,
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Test Product')).not.toBeNull();
    expect(screen.getByText(/Rp 70.000/)).not.toBeNull();
  });

  test('displays shipping cost when present', () => {
    mockUseOrderDetail.mockReturnValue({
      order: mockOrder,
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(screen.getByText('Ongkir')).not.toBeNull();
    expect(screen.getByText('Metode Pengiriman')).not.toBeNull();
  });

  test('renders tracking bottom action for shipped orders', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'shipped',
        waybill_number: 'JNE12345',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Lacak Pengiriman',
        disabled: false,
      }),
    );
  });

  test('disables tracking bottom action when shipped order has no waybill', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'shipped',
        waybill_number: null,
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Lacak Pengiriman',
        disabled: true,
      }),
    );
  });

  test('navigates to tracking screen from bottom action', () => {
    mockUseOrderDetail.mockReturnValue({
      order: {
        ...mockOrder,
        status: 'in_transit',
        waybill_number: 'JNE12345',
      },
      status: 'success',
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<OrderDetail />);

    const actionProps = mockBottomActionBar.mock.calls.at(-1)?.[0] as { onPress: () => void };
    actionProps.onPress();

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/track-shipment/[orderId]',
      params: { orderId: 'test-order-id' },
    });
  });
});
