import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import OrderDetail from '@/scenes/orders/OrderDetail';

const mockPush = jest.fn();
const mockUseOrderDetail = jest.fn();
const mockBottomActionBar = jest.fn();
const mockUseLocalSearchParams = jest.fn();

let mockRouteParams: { orderId?: string | string[] } = { orderId: 'test-order-id' };

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: (...args: unknown[]) => mockUseLocalSearchParams(...args),
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
  created_at: '2024-01-15T10:30:00Z',
  status: 'processing',
  delivered_at: null,
  complaint_window_expires_at: null,
  customer_completed_at: null,
  customer_completion_source: null,
  customer_completion_stage: 'not_applicable',
  customer_order_bucket: 'packing',
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

function setRouteParams(orderId?: string | string[]) {
  mockRouteParams = { orderId };
}

function setOrderDetailReturn(overrides: Record<string, unknown> = {}) {
  const refresh = jest.fn();
  const confirmReceived = jest.fn();

  mockUseOrderDetail.mockReturnValue({
    order: mockOrder,
    status: 'success',
    isLoading: false,
    isRefreshing: false,
    isConfirming: false,
    error: null,
    refresh,
    confirmReceived,
    ...overrides,
  });

  return { refresh, confirmReceived };
}

function renderOrderDetail() {
  return render(<OrderDetail />);
}

describe('<OrderDetail />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseOrderDetail.mockReset();
    mockBottomActionBar.mockReset();
    mockUseLocalSearchParams.mockImplementation(() => mockRouteParams);
    setRouteParams('test-order-id');
  });

  test('renders loading state', () => {
    setOrderDetailReturn({
      order: null,
      status: 'loading',
      isLoading: true,
      isRefreshing: false,
      error: null,
    });

    renderOrderDetail();

    expect(screen.getByText('Memuat detail pesanan...')).not.toBeNull();
  });

  test('handles normal string route param without throwing', () => {
    setRouteParams('test-order-id');
    setOrderDetailReturn({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    expect(() => renderOrderDetail()).not.toThrow();
    expect(mockUseOrderDetail).toHaveBeenCalledWith('test-order-id');
  });

  test('handles array route param without throwing', () => {
    setRouteParams(['test-order-id', 'ignored']);
    setOrderDetailReturn({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    expect(() => renderOrderDetail()).not.toThrow();
    expect(mockUseOrderDetail).toHaveBeenCalledWith('test-order-id');
  });

  test('handles undefined route param without throwing', () => {
    setRouteParams(undefined);
    setOrderDetailReturn({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    expect(() => renderOrderDetail()).not.toThrow();
    expect(mockUseOrderDetail).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('Pesanan Tidak Ditemukan')).not.toBeNull();
  });

  test('handles invalid string route param without throwing', () => {
    setRouteParams('   ');
    setOrderDetailReturn({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    expect(() => renderOrderDetail()).not.toThrow();
    expect(mockUseOrderDetail).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('Pesanan Tidak Ditemukan')).not.toBeNull();
  });

  test('renders not-found state when order ID is missing', () => {
    setRouteParams(undefined);
    setOrderDetailReturn({
      order: null,
      status: 'not-found',
      isLoading: false,
      isRefreshing: false,
      error: null,
    });

    renderOrderDetail();

    expect(screen.getByText('Pesanan Tidak Ditemukan')).not.toBeNull();
  });

  test('renders error state', () => {
    setOrderDetailReturn({
      order: null,
      status: 'error',
      isLoading: false,
      isRefreshing: false,
      error: 'Network error',
    });

    renderOrderDetail();

    expect(screen.getByText('Gagal Memuat Pesanan')).not.toBeNull();
    expect(screen.getByText('Network error')).not.toBeNull();
  });

  test('renders order details with successful payment status', () => {
    setOrderDetailReturn();

    renderOrderDetail();

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.getByText('APT-TEST-ORD')).not.toBeNull();
    expect(screen.getByText('Produk')).not.toBeNull();
    expect(screen.getByText('Alamat Pengiriman')).not.toBeNull();
    expect(screen.getByText('John Doe')).not.toBeNull();
    expect(screen.getByText('Blok B dekat pos satpam')).not.toBeNull();
    expect(screen.getByText('Metode Pengiriman')).not.toBeNull();
    expect(screen.getByText('Total')).not.toBeNull();
  });

  test('falls back when product details are missing', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        order_items: [
          {
            ...mockOrder.order_items[0],
            products: null,
          },
        ],
      },
    });

    renderOrderDetail();

    expect(screen.getAllByText('Produk')).toHaveLength(2);
    expect(screen.queryByText('Test Product')).toBeNull();
  });

  test('hides address note when no supplementary detail was saved', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        addresses: {
          ...mockOrder.addresses,
          address_note: null,
        },
      },
    });

    renderOrderDetail();

    expect(screen.queryByText('Blok B dekat pos satpam')).toBeNull();
  });

  test('renders payment status label for settled payment', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        payment_status: 'settlement',
      },
    });

    renderOrderDetail();

    expect(screen.getByText('Status Pembayaran')).not.toBeNull();
    expect(screen.getByText('Pembayaran Berhasil')).not.toBeNull();
  });

  test('renders pending payment CTA and routes to payment when payment can resume', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        payment_status: 'pending',
        snap_redirect_url: 'https://payment.url',
      },
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Bayar Sekarang',
        disabled: false,
      }),
    );

    const actionProps = mockBottomActionBar.mock.calls[
      mockBottomActionBar.mock.calls.length - 1
    ][0] as {
      onPress: () => void;
    };

    actionProps.onPress();

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/cart/payment',
      params: { orderId: 'test-order-id', paymentUrl: 'https://payment.url' },
    });
  });

  test('disables pending payment CTA when payment cannot resume', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        payment_status: 'pending',
        snap_redirect_url: null,
      },
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Bayar Sekarang',
        disabled: true,
      }),
    );

    const actionProps = mockBottomActionBar.mock.calls[
      mockBottomActionBar.mock.calls.length - 1
    ][0] as {
      onPress: () => void;
    };

    actionProps.onPress();

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('renders order without shipping info', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        courier_code: null,
        courier_service: null,
        shipping_etd: null,
      },
    });

    renderOrderDetail();

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.queryByText('Metode Pengiriman')).toBeNull();
  });

  test('renders order without address', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        addresses: null,
      },
    });

    renderOrderDetail();

    expect(screen.getByText('NOMOR PESANAN')).not.toBeNull();
    expect(screen.queryByText('Alamat Pengiriman')).toBeNull();
  });

  test('displays product information correctly', () => {
    setOrderDetailReturn();

    renderOrderDetail();

    expect(screen.getByText('Test Product')).not.toBeNull();
    expect(screen.getByText(/Rp 70.000/)).not.toBeNull();
  });

  test('displays shipping cost when present', () => {
    setOrderDetailReturn();

    renderOrderDetail();

    expect(screen.getByText('Ongkir')).not.toBeNull();
    expect(screen.getByText('Metode Pengiriman')).not.toBeNull();
  });

  test('renders tracking bottom action for shipped orders', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        status: 'shipped',
        waybill_number: 'JNE12345',
      },
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Lacak Pengiriman',
        disabled: false,
      }),
    );
  });

  test('renders confirm received bottom action for delivered orders awaiting confirmation', () => {
    const confirmReceived = jest.fn();

    setOrderDetailReturn({
      order: {
        ...mockOrder,
        status: 'delivered',
        customer_completion_stage: 'awaiting_customer',
      },
      confirmReceived,
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Pesanan Diterima',
        disabled: false,
      }),
    );

    const actionProps = mockBottomActionBar.mock.calls[
      mockBottomActionBar.mock.calls.length - 1
    ][0] as {
      onPress: () => void;
    };

    actionProps.onPress();

    expect(confirmReceived).toHaveBeenCalledTimes(1);
  });

  test('marks confirm received CTA as loading while confirmation is in progress', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        status: 'delivered',
        customer_completion_stage: 'awaiting_customer',
      },
      isConfirming: true,
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Pesanan Diterima',
        disabled: true,
        isLoading: true,
      }),
    );
  });

  test('disables tracking bottom action when shipped order has no waybill', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        status: 'shipped',
        waybill_number: null,
      },
    });

    renderOrderDetail();

    expect(mockBottomActionBar).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonTitle: 'Lacak Pengiriman',
        disabled: true,
      }),
    );
  });

  test('navigates to tracking screen from bottom action', () => {
    setOrderDetailReturn({
      order: {
        ...mockOrder,
        status: 'in_transit',
        waybill_number: 'JNE12345',
      },
    });

    renderOrderDetail();

    const actionProps = mockBottomActionBar.mock.calls[
      mockBottomActionBar.mock.calls.length - 1
    ][0] as {
      onPress: () => void;
    };

    actionProps.onPress();

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/orders/track-shipment/[orderId]',
      params: { orderId: 'test-order-id' },
    });
  });
});
