import { createRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AddressForm from '@/components/AddressForm/AddressForm';
import type { AddressFormErrors, AddressFormValues } from '@/utils/addressValidation';
import type { BiteshipArea } from '@/types/shipping';

const mockArea: BiteshipArea = {
  id: 'area-1',
  name: 'Kelapa Gading',
  administrative_division_level_1_name: 'DKI Jakarta',
  administrative_division_level_2_name: 'Jakarta Utara',
  administrative_division_level_3_name: 'Kelapa Gading',
  postal_code: 14240,
};

const mockCoords = {
  latitude: -6.2,
  longitude: 106.8,
};

jest.mock('@/components/elements/FormInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text, TextInput, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  const MockFormInput = React.forwardRef(
    (
      {
        label,
        required,
        error,
        helperText,
        value,
        placeholder,
        onChangeText,
        onBlur,
        onSubmitEditing,
        editable,
      }: {
        label?: string;
        required?: boolean;
        error?: string | null;
        helperText?: string;
        value?: string;
        placeholder?: string;
        onChangeText?: (text: string) => void;
        onBlur?: () => void;
        onSubmitEditing?: () => void;
        editable?: boolean;
      },
      ref: React.ForwardedRef<import('react-native').TextInput>,
    ) => (
      <View>
        {label ? <Text>{label}</Text> : null}
        {required ? <Text> *</Text> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? placeholder}
          placeholder={placeholder}
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
        />
        {error ? <Text>{error}</Text> : null}
        {helperText ? <Text>{helperText}</Text> : null}
      </View>
    ),
  );

  MockFormInput.displayName = 'MockFormInput';

  return {
    __esModule: true,
    default: MockFormInput,
  };
});

jest.mock('@/components/AreaPicker', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    AreaPickerTrigger: ({ onPress, areaName }: { onPress: () => void; areaName: string }) => (
      <View>
        <Pressable accessibilityLabel="Buka area picker" onPress={onPress}>
          <Text>{areaName || 'Pilih area pengiriman'}</Text>
        </Pressable>
        <Text>Wajib dipilih untuk kalkulasi ongkir</Text>
      </View>
    ),
    AreaPickerSheet: ({
      open,
      onSelect,
    }: {
      open: boolean;
      onSelect: (area: BiteshipArea) => void;
    }) =>
      open ? (
        <View>
          <Text>Area Picker Sheet</Text>
          <Pressable accessibilityLabel="Pilih area mock" onPress={() => onSelect(mockArea)}>
            <Text>Pilih Area Mock</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

jest.mock('@/components/MapPin', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    MapPinTrigger: ({ onPress }: { onPress: () => void }) => (
      <Pressable accessibilityLabel="Buka map pin" onPress={onPress}>
        <Text>Pilih Lokasi di Peta</Text>
      </Pressable>
    ),
    MapPinSheet: ({
      isOpen,
      onConfirm,
    }: {
      isOpen: boolean;
      onConfirm: (coords: typeof mockCoords) => void;
    }) =>
      isOpen ? (
        <View>
          <Text>Map Pin Sheet</Text>
          <Pressable
            accessibilityLabel="Konfirmasi map pin mock"
            onPress={() => onConfirm(mockCoords)}>
            <Text>Konfirmasi Map Pin Mock</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

function createProps(overrides: Partial<React.ComponentProps<typeof AddressForm>> = {}) {
  const values: AddressFormValues = {
    receiverName: 'John Doe',
    phoneNumber: '081234567890',
    streetAddress: 'Jl. Mawar No. 1',
    areaId: '',
    areaName: '',
    city: 'Jakarta',
    postalCode: '12345',
    province: 'DKI Jakarta',
    isDefault: false,
    latitude: null,
    longitude: null,
  };

  const errors: AddressFormErrors = {
    receiverName: null,
    phoneNumber: null,
    streetAddress: null,
    areaId: null,
    city: null,
    postalCode: null,
  };

  return {
    values,
    errors,
    isSaving: false,
    refs: {
      receiverNameRef: createRef<RNTextInput>(),
      phoneNumberRef: createRef<RNTextInput>(),
      streetAddressRef: createRef<RNTextInput>(),
      cityRef: createRef<RNTextInput>(),
      postalCodeRef: createRef<RNTextInput>(),
      provinceRef: createRef<RNTextInput>(),
    },
    onFieldSave: jest.fn(),
    onFieldValidate: jest.fn(),
    onFieldCommitted: jest.fn(),
    onAreaSelect: jest.fn(),
    onAreaClear: jest.fn(),
    onCoordinatesChange: jest.fn(),
    ...overrides,
  };
}

describe('<AddressForm />', () => {
  test('renders required fields in light and dark themes', async () => {
    const props = createProps();
    render(<AddressForm {...props} />);

    expect(screen.getByText('Nama Penerima')).not.toBeNull();
    expect(screen.getByText('Nomor Telepon')).not.toBeNull();
    expect(screen.getByText('Alamat Lengkap')).not.toBeNull();
    expect(screen.getByText('Wajib dipilih untuk kalkulasi ongkir')).not.toBeNull();

    renderWithDarkTheme(<AddressForm {...props} />);
    expect(screen.getAllByText('Nama Penerima').length).toBeGreaterThan(0);
  });

  test('commits receiver name changes and validates trimmed value on blur', async () => {
    const props = createProps({
      values: {
        ...createProps().values,
        receiverName: '  John Doe  ',
      },
    });

    render(<AddressForm {...props} />);

    const input = screen.getByLabelText('Nama Penerima');
    fireEvent.changeText(input, 'Jane Doe');

    expect(props.onFieldSave).toHaveBeenCalledWith('receiverName', 'Jane Doe');
    expect(props.onFieldCommitted).toHaveBeenCalledTimes(1);

    fireEvent(input, 'blur');

    expect(props.onFieldSave).toHaveBeenCalledWith('receiverName', 'John Doe');
    expect(props.onFieldValidate).toHaveBeenCalledWith('receiverName', 'John Doe');
  });

  test('clears selected area when city changes manually', async () => {
    const props = createProps({
      values: {
        ...createProps().values,
        areaId: 'area-1',
        city: 'Jakarta',
      },
    });

    render(<AddressForm {...props} />);

    fireEvent.changeText(screen.getByLabelText('Kota'), 'Bandung');

    expect(props.onAreaClear).toHaveBeenCalledTimes(1);
    expect(props.onFieldSave).toHaveBeenCalledWith('city', 'Bandung');
    expect(props.onFieldCommitted).toHaveBeenCalledTimes(1);
  });

  test('maps selected area data before saving', async () => {
    const props = createProps();
    render(<AddressForm {...props} />);

    fireEvent.press(screen.getByLabelText('Buka area picker'));
    fireEvent.press(screen.getByLabelText('Pilih area mock'));

    expect(props.onAreaSelect).toHaveBeenCalledWith({
      id: 'area-1',
      name: 'Kelapa Gading',
      city: 'Jakarta Utara',
      province: 'DKI Jakarta',
      postalCode: '14240',
    });
    expect(props.onFieldCommitted).toHaveBeenCalledTimes(1);
  });

  test('saves confirmed map coordinates', async () => {
    const props = createProps();
    render(<AddressForm {...props} />);

    fireEvent.press(screen.getByLabelText('Buka map pin'));
    fireEvent.press(screen.getByLabelText('Konfirmasi map pin mock'));

    expect(props.onFieldSave).toHaveBeenCalledWith('latitude', -6.2);
    expect(props.onFieldSave).toHaveBeenCalledWith('longitude', 106.8);
    expect(props.onCoordinatesChange).toHaveBeenCalledWith(mockCoords);
    expect(props.onFieldCommitted).toHaveBeenCalledTimes(1);
  });
});
