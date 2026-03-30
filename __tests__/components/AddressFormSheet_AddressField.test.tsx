import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import * as Haptics from 'expo-haptics';
import AddressField from '@/components/AddressFormSheet/AddressField';

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

const mockImpactAsync = jest.mocked(Haptics.impactAsync);

jest.mock('@/components/AddressFormSheet/AddressEditSheet', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    value,
    placeholder,
  }: {
    open: boolean;
    title: string;
    value: string;
    placeholder: string;
  }) => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');

    return open ? (
      <>
        <Text>{title}</Text>
        <Text>{value}</Text>
        <Text>{placeholder}</Text>
      </>
    ) : null;
  },
}));

beforeEach(() => {
  mockImpactAsync.mockClear();
});

describe('<AddressField />', () => {
  test('renders current value and error state', async () => {
    const onSave = (_value: string) => null;

    render(
      <AddressField
        label="Kota"
        value="Jakarta"
        placeholder="Masukkan kota"
        required
        error="Kota wajib diisi"
        onSave={onSave}
      />,
    );

    expect(screen.getAllByText(/Kota/).length).toBeGreaterThan(0);
    expect(screen.getByText('Jakarta')).not.toBeNull();
    expect(screen.getByText('Kota wajib diisi')).not.toBeNull();
  });

  test('opens edit sheet and triggers haptic feedback on press', async () => {
    const onSave = (_value: string) => null;

    render(
      <AddressField label="Kota" value="Jakarta" placeholder="Masukkan kota" onSave={onSave} />,
    );

    fireEvent.press(screen.getByLabelText('Edit Kota. Nilai saat ini: Jakarta'));

    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Kota').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Masukkan kota').length).toBeGreaterThan(0);
  });

  test('marks the field as disabled', async () => {
    const onSave = (_value: string) => null;

    render(
      <AddressField
        label="Kota"
        value="Jakarta"
        placeholder="Masukkan kota"
        disabled
        onSave={onSave}
      />,
    );

    expect(
      screen.getByLabelText('Edit Kota. Nilai saat ini: Jakarta').props.accessibilityState,
    ).toEqual({
      disabled: true,
    });
  });

  test('renders in dark theme', async () => {
    const onSave = (_value: string) => null;

    renderWithDarkTheme(
      <AddressField
        label="Provinsi"
        value="DKI Jakarta"
        placeholder="Masukkan provinsi"
        onSave={onSave}
      />,
    );

    expect(screen.getByText('Provinsi')).not.toBeNull();
    expect(screen.getByText('DKI Jakarta')).not.toBeNull();
  });
});
