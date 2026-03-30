import { createRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AddressInfoSection from '@/components/AddressFormSheet/AddressInfoSection';

function createProps(overrides: Partial<React.ComponentProps<typeof AddressInfoSection>> = {}) {
  return {
    streetAddress: 'Jl. Melati No. 2',
    city: 'Jakarta',
    postalCode: '12345',
    province: 'DKI Jakarta',
    streetAddressError: null,
    cityError: null,
    postalCodeError: null,
    isSaving: false,
    onStreetAddressChange: jest.fn(),
    onCityChange: jest.fn(),
    onPostalCodeChange: jest.fn(),
    onProvinceChange: jest.fn(),
    onStreetAddressBlur: jest.fn(),
    onCityBlur: jest.fn(),
    onPostalCodeBlur: jest.fn(),
    refs: {
      streetAddressRef: createRef<RNTextInput>(),
      cityRef: createRef<RNTextInput>(),
      postalCodeRef: createRef<RNTextInput>(),
      provinceRef: createRef<RNTextInput>(),
    },
    ...overrides,
  };
}

describe('<AddressInfoSection />', () => {
  test('renders fields in light and dark themes', async () => {
    const props = createProps();
    render(<AddressInfoSection {...props} />);

    expect(screen.getByText('Alamat Pengiriman')).not.toBeNull();
    expect(screen.getByLabelText('Alamat lengkap')).not.toBeNull();
    expect(screen.getByLabelText('Kota')).not.toBeNull();
    expect(screen.getByLabelText('Kode pos')).not.toBeNull();

    renderWithDarkTheme(<AddressInfoSection {...props} />);
    expect(screen.getAllByText('Alamat Pengiriman').length).toBeGreaterThan(0);
  });

  test('forwards change and blur handlers', async () => {
    const props = createProps();
    render(<AddressInfoSection {...props} />);

    fireEvent.changeText(screen.getByLabelText('Alamat lengkap'), 'Jl. Kenanga No. 4');
    fireEvent.changeText(screen.getByLabelText('Kota'), 'Bandung');
    fireEvent.changeText(screen.getByLabelText('Kode pos'), '40123');
    fireEvent.changeText(screen.getByLabelText('Provinsi'), 'Jawa Barat');

    expect(props.onStreetAddressChange).toHaveBeenCalledWith('Jl. Kenanga No. 4');
    expect(props.onCityChange).toHaveBeenCalledWith('Bandung');
    expect(props.onPostalCodeChange).toHaveBeenCalledWith('40123');
    expect(props.onProvinceChange).toHaveBeenCalledWith('Jawa Barat');

    fireEvent(screen.getByLabelText('Alamat lengkap'), 'blur');
    fireEvent(screen.getByLabelText('Kota'), 'blur');
    fireEvent(screen.getByLabelText('Kode pos'), 'blur');

    expect(props.onStreetAddressBlur).toHaveBeenCalledTimes(1);
    expect(props.onCityBlur).toHaveBeenCalledTimes(1);
    expect(props.onPostalCodeBlur).toHaveBeenCalledTimes(1);
  });

  test('disables inputs while saving', async () => {
    render(<AddressInfoSection {...createProps({ isSaving: true })} />);

    expect(screen.getByLabelText('Alamat lengkap').props.editable).toBe(false);
    expect(screen.getByLabelText('Kota').props.editable).toBe(false);
    expect(screen.getByLabelText('Kode pos').props.editable).toBe(false);
    expect(screen.getByLabelText('Provinsi').props.editable).toBe(false);
  });
});
