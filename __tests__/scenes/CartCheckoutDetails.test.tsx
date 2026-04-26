import React from 'react';
import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import { CartCheckoutDetails } from '@/scenes/cart/CartCheckoutDetails';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';

jest.mock('@/components/icons', () => ({
  ChevronRightIcon: () => null,
  MapPinIcon: () => null,
}));

const baseAddress: Address = {
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
};

const shippingOption: ShippingOption = {
  courier_name: 'JNE',
  courier_code: 'jne',
  service_name: 'REG',
  service_code: 'reg',
  shipping_type: 'parcel',
  price: 15000,
  currency: 'IDR',
  estimated_delivery: '2-3 hari',
};

function createProps() {
  return {
    loadingSelectedAddress: false,
    selectedAddress: baseAddress,
    selectedAddressFullText: 'Jl. Test 1, Jakarta, DKI Jakarta, 12345',
    onOpenAddressSheet: jest.fn(),
    onAddAddress: jest.fn(),
    addressErrorMessage: null,
    loadingRates: false,
    selectedShippingOption: shippingOption,
    isOffline: false,
    onOpenShippingSheet: jest.fn(),
    activeOrderId: null,
    paymentError: null,
    startingCheckout: false,
    onCancelPendingCheckout: jest.fn(),
    onContinuePendingCheckout: jest.fn(),
    shippingOptionsCount: 1,
    shippingErrorMessage: null,
    shippingRecoverySuggestion: null,
    onRetryShipping: jest.fn(),
  };
}

describe('<CartCheckoutDetails />', () => {
  test('renders selected address and shipping option', () => {
    render(<CartCheckoutDetails {...createProps()} />);

    expect(screen.getByText('User')).toBeTruthy();
    expect(screen.getByText('08123456789')).toBeTruthy();
    expect(screen.getByText('Jl. Test 1, Jakarta, DKI Jakarta, 12345')).toBeTruthy();
    expect(screen.getByText('JNE - REG')).toBeTruthy();
    expect(screen.getByText('Estimasi: 2-3 hari')).toBeTruthy();
    expect(screen.getByText('Rp 15.000')).toBeTruthy();
    expect(screen.queryByText('Ringkasan Pesanan')).toBeNull();
  });

  test('renders empty address state and shipping retry error state', () => {
    const props = createProps();

    render(
      <CartCheckoutDetails
        {...props}
        selectedAddress={null}
        selectedShippingOption={null}
        shippingOptionsCount={0}
        shippingErrorMessage="Kurir tidak tersedia"
        shippingRecoverySuggestion="Coba pilih alamat lain"
      />,
    );

    expect(screen.getByText('Belum ada alamat')).toBeTruthy();
    expect(screen.getByText('Tambah Alamat')).toBeTruthy();
    expect(screen.getByText('Pilih Kurir')).toBeTruthy();
    expect(screen.getByText('Kurir tidak tersedia')).toBeTruthy();
    expect(screen.getByText('Coba pilih alamat lain')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Tambah alamat pengiriman'));
    expect(props.onAddAddress).toHaveBeenCalledTimes(1);
    expect(props.onOpenAddressSheet).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Muat ulang ongkir'));
    expect(props.onRetryShipping).toHaveBeenCalledTimes(1);
  });

  test('renders pending checkout banner and offline messaging', () => {
    const props = createProps();

    render(
      <CartCheckoutDetails
        {...props}
        isOffline
        activeOrderId="order-1"
        paymentError="Pembayaran sebelumnya gagal diverifikasi"
      />,
    );

    expect(screen.getByText('Pembayaran Tertunda')).toBeTruthy();
    expect(screen.getByText('Pembayaran sebelumnya gagal diverifikasi')).toBeTruthy();
    expect(screen.getByText('Tidak tersedia offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Batalkan checkout tertunda'));
    expect(props.onCancelPendingCheckout).toHaveBeenCalledTimes(1);

    const continueButton = screen.getByLabelText('Lanjutkan pembayaran');
    expect(continueButton).toBeTruthy();
  });
});
