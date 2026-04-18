import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';

const mockReplace = jest.fn();
const mockHandleStartCheckout = jest.fn<() => Promise<void>>();
const mockClearCheckoutSession = jest.fn<() => Promise<void>>();
const mockResetPaymentError = jest.fn();

const validParams = {
  addressPayload: JSON.stringify({
    id: 'address-1',
    profile_id: 'profile-1',
    receiver_name: 'User',
    phone_number: '08123456789',
    street_address: 'Jl. Test 1',
    address_note: null,
    city: 'Jakarta',
    city_id: 'CITY-1',
    province: 'DKI Jakarta',
    province_id: 'PROV-1',
    area_id: 'AREA-1',
    area_name: 'Jakarta Selatan',
    postal_code: '12345',
    is_default: true,
    country_code: 'ID',
    latitude: -6.2,
    longitude: 106.8,
    created_at: new Date(Date.UTC(2026, 0, 1)).toISOString(),
  }),
  addressText: 'Jl. Test 1, Jakarta, DKI Jakarta, 12345',
  shippingOptionPayload: JSON.stringify({
    courier_name: 'JNE',
    courier_code: 'jne',
    service_name: 'REG',
    service_code: 'reg',
    shipping_type: 'parcel',
    price: 15000,
    currency: 'IDR',
    estimated_delivery: '2-3 hari',
  }),
  selectedShippingKey: 'jne-reg',
  snapshotPayload: JSON.stringify({
    itemCount: 2,
    estimatedWeightGrams: 400,
    packageValue: 50000,
  }),
  itemSummariesPayload: JSON.stringify([
    { name: 'Paracetamol 500mg', quantity: 2 },
    { name: 'Vitamin C 1000mg', quantity: 1 },
  ]),
  quoteAreaId: 'AREA-1',
  quotePostalCode: '12345',
};

let mockParams: Record<string, string | undefined> = validParams;
let mockCheckoutState = {
  startingCheckout: false,
  activeOrderId: null as string | null,
  paymentError: null as string | null,
  handleStartCheckout: mockHandleStartCheckout,
  clearCheckoutSession: mockClearCheckoutSession,
  resetPaymentError: mockResetPaymentError,
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOffline: false }),
}));

jest.mock('@/hooks/useCartCheckout', () => ({
  useCartCheckout: () => mockCheckoutState,
}));

jest.mock('@/components/elements/StickyBottomBar/StickyBottomBar', () => {
  const actual = jest.requireActual(
    '@/components/elements/StickyBottomBar/StickyBottomBar',
  ) as typeof import('@/components/elements/StickyBottomBar/StickyBottomBar');

  return actual;
});

jest.mock('@/components/icons', () => ({
  CheckCircleIcon: () => null,
  MapPinIcon: () => null,
  ShoppingBagIcon: () => null,
  TruckIcon: () => null,
}));

const CheckoutReview = require('@/scenes/cart/CheckoutReview').default as React.ComponentType;

describe('<CheckoutReview />', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockHandleStartCheckout.mockReset();
    mockClearCheckoutSession.mockReset();
    mockResetPaymentError.mockReset();
    mockParams = validParams;
    mockCheckoutState = {
      startingCheckout: false,
      activeOrderId: null,
      paymentError: null,
      handleStartCheckout: mockHandleStartCheckout,
      clearCheckoutSession: mockClearCheckoutSession,
      resetPaymentError: mockResetPaymentError,
    };
  });

  it('renders product names and continues to payment', () => {
    render(<CheckoutReview />);

    expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.getByText('Vitamin C 1000mg')).toBeTruthy();
    expect(screen.getByText('×1')).toBeTruthy();
    expect(screen.getByText('Subtotal 2 barang')).toBeTruthy();
    expect(screen.getByText('Ongkos kirim')).toBeTruthy();
    expect(screen.getByText('Lanjutkan ke Pembayaran')).toBeTruthy();

    fireEvent.press(screen.getByText('Lanjutkan ke Pembayaran'));

    expect(mockResetPaymentError).toHaveBeenCalledTimes(1);
    expect(mockHandleStartCheckout).toHaveBeenCalledTimes(1);
  });

  it('shows resume state when an active order exists and can cancel', () => {
    mockCheckoutState.activeOrderId = 'order-1';

    render(<CheckoutReview />);

    expect(screen.getByText('Checkout Tertunda')).toBeTruthy();
    expect(screen.getByText('Lanjutkan Pembayaran')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Batalkan checkout tertunda'));

    expect(mockClearCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to cart when review params are incomplete', () => {
    mockParams = {};

    render(<CheckoutReview />);

    expect(screen.getByText('Data review pesanan tidak lengkap.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Kembali ke keranjang'));
    expect(mockReplace).toHaveBeenCalledWith('/cart');
  });

  it('passes hideTotal to StickyBottomBar so total is not duplicated in footer', () => {
    render(<CheckoutReview />);

    expect(screen.getAllByText('Total')).toHaveLength(1);
    expect(screen.getAllByText('Rp 65.000')).toHaveLength(1);
  });

  it('renders the review helper text', () => {
    render(<CheckoutReview />);

    expect(
      screen.getByText('Tinjau Kembali detail pesanan Anda sebelum Melanjutkan pembayaran'),
    ).toBeTruthy();
  });

  it('renders without product names when itemSummariesPayload is absent', () => {
    const { itemSummariesPayload, ...paramsWithoutItems } = validParams;
    mockParams = paramsWithoutItems;

    render(<CheckoutReview />);

    expect(screen.queryByText('Paracetamol 500mg')).toBeNull();
    expect(screen.getByText('Subtotal 2 barang')).toBeTruthy();
  });
});
