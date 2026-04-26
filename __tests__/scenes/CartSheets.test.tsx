import React from 'react';
import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import { AddressSelectionSheet, ShippingOptionsSheet } from '@/scenes/cart/CartSheets';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';

jest.mock('@/components/elements/AddressCard', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    default: ({
      address,
      badgeText,
      onPress,
      onEdit,
    }: {
      address: Address;
      badgeText?: string | null;
      onPress?: () => void;
      onEdit?: () => void;
    }) => (
      <View>
        <Text>{address.receiver_name}</Text>
        {badgeText ? <Text>{badgeText}</Text> : null}
        <Pressable accessibilityLabel={`select-${address.id}`} onPress={onPress}>
          <Text>Pilih {address.id}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`edit-${address.id}`} onPress={onEdit}>
          <Text>Ubah {address.id}</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock('@/components/icons', () => ({
  MapPinIcon: () => null,
}));

const address: Address = {
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

describe('<CartSheets />', () => {
  test('renders shipping options and offline confirmation messaging', () => {
    const onSelectShippingKey = jest.fn();
    const onConfirm = jest.fn();

    render(
      <ShippingOptionsSheet
        open
        onOpenChange={jest.fn()}
        shippingOptions={[shippingOption]}
        selectedShippingKey={null}
        onSelectShippingKey={onSelectShippingKey}
        onConfirm={onConfirm}
        isOffline
      />,
    );

    expect(screen.getByText('Opsi Pengiriman')).toBeTruthy();
    expect(screen.getByText('JNE - REG')).toBeTruthy();
    expect(screen.getByText('Rp 15.000')).toBeTruthy();
    expect(screen.getByText('Tidak tersedia offline')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('JNE REG Rp 15.000'));
    expect(onSelectShippingKey).toHaveBeenCalledWith('jne-reg');

    const confirmButton = screen.getByText('Konfirmasi');
    expect(confirmButton).toBeTruthy();
  });

  test('renders empty address state when no addresses exist', () => {
    const onAddAddress = jest.fn();

    render(
      <AddressSelectionSheet
        open
        onOpenChange={jest.fn()}
        loadingAddresses={false}
        availableAddresses={[]}
        selectedAddressId={null}
        onSelectAddress={jest.fn()}
        onEditAddress={jest.fn()}
        onAddAddress={onAddAddress}
      />,
    );

    expect(screen.getByText('Pilih Alamat')).toBeTruthy();
    expect(screen.getByText('Belum ada alamat')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Tambah alamat pengiriman'));
    expect(onAddAddress).toHaveBeenCalledTimes(1);
  });

  test('renders address list and forwards select and edit callbacks', () => {
    const onSelectAddress = jest.fn();
    const onEditAddress = jest.fn();

    render(
      <AddressSelectionSheet
        open
        onOpenChange={jest.fn()}
        loadingAddresses={false}
        availableAddresses={[address]}
        selectedAddressId="address-1"
        onSelectAddress={onSelectAddress}
        onEditAddress={onEditAddress}
        onAddAddress={jest.fn()}
      />,
    );

    expect(screen.getByText('User')).toBeTruthy();
    expect(screen.getByText('Utama')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('select-address-1'));
    fireEvent.press(screen.getByLabelText('edit-address-1'));

    expect(onSelectAddress).toHaveBeenCalledWith('address-1');
    expect(onEditAddress).toHaveBeenCalledWith('address-1');
  });
});
