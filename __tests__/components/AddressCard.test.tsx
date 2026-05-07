import { test, expect } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AddressCard from '@/components/elements/AddressCard';
import { MIN_TOUCH_TARGET } from '@/constants/ui';
import type { Address } from '@/types/address';

const mockAddress: Address = {
  id: '1',
  profile_id: 'user-1',
  receiver_name: 'John Doe',
  phone_number: '081234567890',
  street_address: 'Jl. Sudirman No. 1',
  address_note: null,
  city: 'Jakarta',
  city_id: null,
  area_id: null,
  country_code: 'ID',
  province: 'DKI Jakarta',
  province_id: null,
  latitude: null,
  longitude: null,
  postal_code: '12345',
  is_default: false,
  created_at: '2025-01-01T00:00:00Z',
};

describe('<AddressCard />', () => {
  test('renders receiver name and phone number', async () => {
    render(<AddressCard address={mockAddress} />);
    expect(screen.getByText('John Doe')).not.toBeNull();
    expect(screen.getByText('081234567890')).not.toBeNull();
  });

  test('renders formatted address', async () => {
    render(<AddressCard address={mockAddress} />);
    expect(screen.getByText('Jl. Sudirman No. 1, Jakarta, DKI Jakarta, 12345')).not.toBeNull();
  });

  test('shows default badge when isDefault is true', async () => {
    render(<AddressCard address={mockAddress} isDefault />);
    expect(screen.getByText('Utama')).not.toBeNull();
  });

  test('does not show default badge when isDefault is false', async () => {
    render(<AddressCard address={mockAddress} isDefault={false} />);
    expect(screen.queryByText('Utama')).toBeNull();
  });

  test('calls onPress when card is pressed', async () => {
    const onPress = jest.fn();
    render(<AddressCard address={mockAddress} onPress={onPress} />);
    const card = screen.getByLabelText('Alamat John Doe');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('shows edit button when onEdit is provided', async () => {
    const onEdit = jest.fn();
    render(<AddressCard address={mockAddress} onEdit={onEdit} />);
    const editButton = screen.getByLabelText('Ubah alamat John Doe');
    expect(editButton).not.toBeNull();
  });

  test('does not show edit button when onEdit is not provided', async () => {
    render(<AddressCard address={mockAddress} />);
    expect(screen.queryByLabelText('Ubah alamat John Doe')).toBeNull();
  });

  test('calls onEdit when edit button is pressed', async () => {
    const onEdit = jest.fn();
    render(<AddressCard address={mockAddress} onEdit={onEdit} />);
    const editButton = screen.getByLabelText('Ubah alamat John Doe');
    fireEvent.press(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  test('edit button press does not trigger card onPress', async () => {
    const onPress = jest.fn();
    const onEdit = jest.fn();
    render(<AddressCard address={mockAddress} onPress={onPress} onEdit={onEdit} />);
    const editButton = screen.getByLabelText('Ubah alamat John Doe');
    fireEvent.press(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('edit button has proper touch target size', async () => {
    const onEdit = jest.fn();
    render(<AddressCard address={mockAddress} onEdit={onEdit} />);
    const editButton = screen.getByLabelText('Ubah alamat John Doe');
    const editButtonStyle = StyleSheet.flatten(editButton.props.style);

    expect(editButtonStyle.minHeight).toBe(MIN_TOUCH_TARGET);
    expect(editButtonStyle.minWidth).toBe(MIN_TOUCH_TARGET);
  });
});
