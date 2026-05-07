import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AreaPickerTrigger from '@/components/AreaPicker/AreaPickerTrigger';

describe('<AreaPickerTrigger />', () => {
  test('renders empty and selected states in light and dark themes', async () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    expect(screen.getByText('Provinsi, kota, kecamatan, kode pos')).not.toBeNull();

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

    fireEvent.press(screen.getByText('Provinsi, kota, kecamatan, kode pos'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('has correct ARIA role and label on the trigger element', () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    const trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props.role).toBe('button');
    expect(trigger.props['aria-label']).toBe('Pilih area pengiriman');
  });

  test('has aria-haspopup="dialog" on the trigger element', () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    const trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-haspopup']).toBe('dialog');
  });

  test('keeps aria-expanded tied to popup state, not selection state', () => {
    const { rerender } = render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    let trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-expanded']).toBe(false);

    rerender(
      <AreaPickerTrigger
        areaName="Banten, Kabupaten Serang, Ciruas, 42182"
        areaId="area-1"
        onPress={jest.fn()}
        error={null}
        disabled={false}
      />,
    );

    trigger = screen.getByLabelText(
      'Area pengiriman BANTEN, KAB. SERANG, CIRUAS, 42182. Ketuk untuk mengubah area pengiriman',
    );
    expect(trigger.props['aria-expanded']).toBe(false);
    expect(trigger.props.accessibilityValue).toEqual({
      text: 'BANTEN, KAB. SERANG, CIRUAS, 42182',
    });
  });

  test('sets aria-disabled based on disabled prop', () => {
    const { rerender } = render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    let trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-disabled']).toBe(false);

    rerender(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={true} />,
    );

    trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-disabled']).toBe(true);
  });

  test('sets aria-invalid based on error prop', () => {
    const { rerender } = render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    let trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-invalid']).toBe(false);

    rerender(
      <AreaPickerTrigger
        areaName=""
        areaId=""
        onPress={jest.fn()}
        error="Area wajib dipilih"
        disabled={false}
      />,
    );

    trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-invalid']).toBe(true);
  });

  test('uses aria-describedby pointing to error text when error is present', () => {
    render(
      <AreaPickerTrigger
        areaName=""
        areaId=""
        onPress={jest.fn()}
        error="Area wajib dipilih"
        disabled={false}
      />,
    );

    const trigger = screen.getByLabelText('Pilih area pengiriman');
    const describedById = trigger.props['aria-describedby'];
    expect(describedById).toBeTruthy();

    const errorText = screen.getByText('Area wajib dipilih');
    expect(errorText.props.id).toBe(describedById);
  });

  test('does not set aria-describedby when no error text is present', () => {
    render(
      <AreaPickerTrigger areaName="" areaId="" onPress={jest.fn()} error={null} disabled={false} />,
    );

    const trigger = screen.getByLabelText('Pilih area pengiriman');
    expect(trigger.props['aria-describedby']).toBeUndefined();
    expect(
      screen.queryByText('Pilih provinsi, kota, kecamatan, dan kode pos untuk pengiriman'),
    ).toBeNull();
  });
});
