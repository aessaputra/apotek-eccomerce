import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '../../test-utils/renderWithTheme';
import * as Haptics from 'expo-haptics';
import DefaultAddressToggle from './DefaultAddressToggle';

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

const mockImpactAsync = jest.mocked(Haptics.impactAsync);

beforeEach(() => {
  mockImpactAsync.mockClear();
});

describe('<DefaultAddressToggle />', () => {
  test('renders copy in light and dark themes', async () => {
    render(<DefaultAddressToggle isDefault={false} isSaving={false} onToggle={jest.fn()} />);

    expect(screen.getByText('Jadikan alamat default')).not.toBeNull();
    expect(
      screen.getByText('Alamat ini akan digunakan secara otomatis saat checkout'),
    ).not.toBeNull();

    renderWithDarkTheme(
      <DefaultAddressToggle isDefault={true} isSaving={false} onToggle={jest.fn()} />,
    );

    expect(screen.getAllByText('Jadikan alamat default').length).toBeGreaterThan(0);
  });

  test('toggles value and triggers haptics when pressed', async () => {
    const onToggle = jest.fn();
    render(<DefaultAddressToggle isDefault={false} isSaving={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByLabelText('Jadikan alamat default'));

    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test('does not toggle while saving', async () => {
    const onToggle = jest.fn();
    render(<DefaultAddressToggle isDefault={true} isSaving={true} onToggle={onToggle} />);

    fireEvent.press(screen.getByLabelText('Jadikan alamat default'));

    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
