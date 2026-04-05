import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AreaPickerTrigger from '@/components/AreaPicker/AreaPickerTrigger';

describe('<AreaPickerTrigger />', () => {
  test('renders empty and selected states in light and dark themes', async () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    expect(screen.getByText('Pilih provinsi, kota, kecamatan, kode pos')).not.toBeNull();

    renderWithDarkTheme(
      <AreaPickerTrigger
        areaName="Banten, Kabupaten Serang, Ciruas, 42182"
        areaId="area-1"
        onPress={jest.fn()}
        error={null}
        disabled={false}
      />,
    );

    expect(screen.getByText('BANTEN')).not.toBeNull();
    expect(screen.getByText('KAB. SERANG')).not.toBeNull();
    expect(screen.getByText('CIRUAS')).not.toBeNull();
    expect(screen.getByText('42182')).not.toBeNull();
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
      screen.getByText('Area tersimpan, silakan pilih ulang untuk menyegarkan detail'),
    ).not.toBeNull();
    expect(screen.getByText('Area wajib dipilih')).not.toBeNull();
  });

  test('calls onPress', async () => {
    const onPress = jest.fn();
    render(<AreaPickerTrigger areaName="" areaId="" onPress={onPress} disabled={false} />);

    fireEvent.press(screen.getByText('Pilih provinsi, kota, kecamatan, kode pos'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
