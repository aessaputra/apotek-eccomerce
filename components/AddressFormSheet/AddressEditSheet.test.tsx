import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '../../test-utils/renderWithTheme';
import AddressEditSheet from './AddressEditSheet';

jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui') as typeof import('tamagui');
  const { ScrollView, View } = jest.requireActual('react-native') as typeof import('react-native');

  const Sheet = ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <View>{children}</View> : null;

  function SheetHandle() {
    return <View />;
  }

  Sheet.displayName = 'MockSheet';
  SheetHandle.displayName = 'MockSheetHandle';

  Sheet.Overlay = View;
  Sheet.Handle = SheetHandle;
  Sheet.Frame = View;
  Sheet.ScrollView = ScrollView;

  return {
    ...actual,
    Sheet,
  };
});

describe('<AddressEditSheet />', () => {
  test('renders content in light and dark themes', async () => {
    const props = {
      open: true,
      onOpenChange: jest.fn(),
      title: 'Kota',
      value: 'Jakarta',
      placeholder: 'Masukkan kota',
      onSave: jest.fn(() => null),
    };

    render(<AddressEditSheet {...props} />);
    expect(screen.getByText('Kota')).not.toBeNull();
    expect(screen.getByLabelText('Input Kota')).not.toBeNull();

    renderWithDarkTheme(<AddressEditSheet {...props} />);
    expect(screen.getAllByText('Kota').length).toBeGreaterThan(0);
  });

  test('shows validation error when save fails', async () => {
    const onSave = jest.fn(() => 'Kota wajib diisi');
    const onOpenChange = jest.fn();

    render(
      <AddressEditSheet
        open
        onOpenChange={onOpenChange}
        title="Kota"
        value="Jakarta"
        placeholder="Masukkan kota"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Input Kota'), '');
    fireEvent.press(screen.getByLabelText('Simpan Kota'));

    expect(onSave).toHaveBeenCalledWith('');
    expect(screen.getByText('Kota wajib diisi')).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('closes sheet after successful save', async () => {
    const onSave = jest.fn(() => null);
    const onOpenChange = jest.fn();

    render(
      <AddressEditSheet
        open
        onOpenChange={onOpenChange}
        title="Kota"
        value="Jakarta"
        placeholder="Masukkan kota"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Input Kota'), 'Bandung');
    fireEvent.press(screen.getByLabelText('Simpan Kota'));

    expect(onSave).toHaveBeenCalledWith('Bandung');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
