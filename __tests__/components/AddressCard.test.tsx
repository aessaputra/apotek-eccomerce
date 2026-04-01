import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AddressCard from '@/components/elements/AddressCard';
import type { Address } from '@/types/address';

const mockAddress: Address = {
  id: '1',
  profile_id: 'user-1',
  receiver_name: 'John Doe',
  phone_number: '081234567890',
  street_address: 'Jl. Sudirman No. 1',
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
});
