import { test, expect, jest } from '@jest/globals';
import {
  render,
  renderWithDarkTheme,
  screen,
  fireEvent,
} from '../../../test-utils/renderWithTheme';
import BottomSheetContents from './BottomSheetContents';

jest.mock('@/components/elements/GradientButton', () => ({
  __esModule: true,
  default: ({ title, onPress }: { title?: string; onPress?: () => void }) => {
    const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');
    return (
      <Pressable accessibilityLabel={title ?? 'gradient-button'} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
}));

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: {
    env: 'development',
    apiUrl: 'https://example.com',
    projectId: 'project-id',
  },
}));

jest.mock('@/utils/deviceInfo', () => ({
  __esModule: true,
  windowWidth: 360,
}));

describe('<BottomSheetContents />', () => {
  test('renders environment summary in light and dark themes', async () => {
    render(<BottomSheetContents onClose={jest.fn()} />);

    expect(screen.getByText(/Aplikasi Apotek Eccomerce berjalan di environment/i)).not.toBeNull();
    expect(screen.getAllByText('development').length).toBeGreaterThan(0);
    expect(screen.getByText(/apiUrl:/i)).not.toBeNull();
    expect(screen.getByText('https://example.com')).not.toBeNull();

    renderWithDarkTheme(<BottomSheetContents onClose={jest.fn()} />);
    expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
  });

  test('calls onClose from the gradient button', async () => {
    const onClose = jest.fn();
    render(<BottomSheetContents onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('OK'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
