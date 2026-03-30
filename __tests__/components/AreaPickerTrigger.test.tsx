import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AreaPickerTrigger from '@/components/AreaPicker/AreaPickerTrigger';

describe('<AreaPickerTrigger />', () => {
  test('renders empty and selected states in light and dark themes', async () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    expect(screen.getByText('Pilih area pengiriman')).not.toBeNull();
    expect(screen.getByText('Wajib dipilih untuk kalkulasi ongkir')).not.toBeNull();

    renderWithDarkTheme(
      <AreaPickerTrigger
        areaName="Kelapa Gading"
        areaId="area-1"
        onPress={jest.fn()}
        error={null}
        disabled={false}
      />,
    );

    expect(screen.getByText('Kelapa Gading')).not.toBeNull();
  });

  test('renders partial selection and error text', async () => {
    render(
      <AreaPickerTrigger
        areaName=""
        areaId="area-1"
        error="Area wajib dipilih"
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Area terpilih (silakan pilih ulang untuk melihat nama)'),
    ).not.toBeNull();
    expect(screen.getByText('Area wajib dipilih')).not.toBeNull();
  });

  test('calls onPress', async () => {
    const onPress = jest.fn();
    render(<AreaPickerTrigger areaName="" areaId="" onPress={onPress} disabled={false} />);

    fireEvent.press(screen.getByText('Pilih area pengiriman'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
