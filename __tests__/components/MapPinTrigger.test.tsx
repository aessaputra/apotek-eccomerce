import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import MapPinTrigger from '@/components/MapPin/MapPinTrigger';

describe('<MapPinTrigger />', () => {
  test('renders placeholder and coordinate states in light and dark themes', async () => {
    render(<MapPinTrigger value={null} onPress={jest.fn()} />);

    expect(screen.getByText('Pilih Lokasi di Peta')).not.toBeNull();
    expect(
      screen.getByText('Opsional — diperlukan untuk kurir instan (Gojek, Grab, dll)'),
    ).not.toBeNull();

    renderWithDarkTheme(
      <MapPinTrigger value={{ latitude: -6.2, longitude: 106.8 }} onPress={jest.fn()} />,
    );

    expect(screen.getByText('-6.20000, 106.80000')).not.toBeNull();
  });

  test('calls onPress', async () => {
    const onPress = jest.fn();
    render(<MapPinTrigger value={null} onPress={onPress} disabled={false} />);

    fireEvent.press(screen.getByText('Pilih Lokasi di Peta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
