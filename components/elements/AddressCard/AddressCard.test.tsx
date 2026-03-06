import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import AddressCard from './AddressCard';
import type { Address } from '@/types/address';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const mockAddress: Address = {
  id: '1',
  profile_id: 'user-1',
  receiver_name: 'John Doe',
  phone_number: '081234567890',
  street_address: 'Jl. Sudirman No. 1',
  city: 'Jakarta',
  city_id: null,
  province: 'DKI Jakarta',
  province_id: null,
  district_id: null,
  subdistrict_id: null,
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
    expect(screen.getByText('Default')).not.toBeNull();
  });

  test('does not show default badge when isDefault is false', async () => {
    render(<AddressCard address={mockAddress} isDefault={false} />);
    expect(screen.queryByText('Default')).toBeNull();
  });

  test('calls onPress when card is pressed', async () => {
    const onPress = jest.fn();
    render(<AddressCard address={mockAddress} onPress={onPress} />);
    const card = screen.getByLabelText('Alamat John Doe');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not show action buttons when showActions is false', async () => {
    render(
      <AddressCard
        address={mockAddress}
        showActions={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Edit alamat')).toBeNull();
    expect(screen.queryByLabelText('Hapus alamat')).toBeNull();
  });

  test('shows edit and delete buttons when showActions is true', async () => {
    render(
      <AddressCard address={mockAddress} showActions onEdit={jest.fn()} onDelete={jest.fn()} />,
    );
    expect(screen.getByLabelText('Edit alamat')).not.toBeNull();
    expect(screen.getByLabelText('Hapus alamat')).not.toBeNull();
  });

  test('shows set default button when not default and onSetDefault provided', async () => {
    render(
      <AddressCard address={mockAddress} isDefault={false} showActions onSetDefault={jest.fn()} />,
    );
    expect(screen.getByLabelText('Jadikan alamat default')).not.toBeNull();
  });

  test('does not show set default button when already default', async () => {
    render(<AddressCard address={mockAddress} isDefault showActions onSetDefault={jest.fn()} />);
    expect(screen.queryByLabelText('Jadikan alamat default')).toBeNull();
  });
});
