import { test, expect, jest } from '@jest/globals';
import {
  render,
  renderWithDarkTheme,
  screen,
  fireEvent,
} from '../../../test-utils/renderWithTheme';
import BottomSheetContents from './BottomSheetContents';

let mockGradientButtonProps:
  | {
      title?: string;
      onPress?: () => void;
      gradientBackgroundProps?: { colors?: string[] };
    }
  | undefined;

jest.mock('@/components/elements/GradientButton', () => ({
  __esModule: true,
  default: (props: {
    title?: string;
    onPress?: () => void;
    gradientBackgroundProps?: { colors?: string[] };
  }) => {
    mockGradientButtonProps = props;
    const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');
    return (
      <Pressable accessibilityLabel={props.title ?? 'gradient-button'} onPress={props.onPress}>
        <Text>{props.title}</Text>
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
  beforeEach(() => {
    mockGradientButtonProps = undefined;
  });

  test('renders environment summary in light and dark themes', async () => {
    render(<BottomSheetContents onClose={jest.fn()} />);

    expect(screen.getByText(/Aplikasi Apotek Eccomerce berjalan di environment/i)).not.toBeNull();
    expect(screen.getAllByText('development').length).toBeGreaterThan(0);
    expect(screen.getByText(/apiUrl:/i)).not.toBeNull();
    expect(screen.getByText('https://example.com')).not.toBeNull();

    renderWithDarkTheme(<BottomSheetContents onClose={jest.fn()} />);
    expect(screen.getAllByText('OK').length).toBeGreaterThan(0);

    expect(mockGradientButtonProps?.gradientBackgroundProps?.colors).toEqual([
      '#06B6D4',
      'hsla(187, 92%, 47%, 1)',
    ]);
  });

  test('calls onClose from the gradient button', async () => {
    const onClose = jest.fn();
    render(<BottomSheetContents onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('OK'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
