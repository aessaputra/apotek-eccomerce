import { test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import Avatar from '@/components/elements/Avatar';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { LinearGradient: View };
});

describe('<Avatar />', () => {
  test('renders initials when no avatarUrl', async () => {
    render(<Avatar avatarUrl={null} name="John Doe" />);
    expect(screen.getByText('JD')).not.toBeNull();
  });

  test('generates correct initials from single name', async () => {
    render(<Avatar avatarUrl={null} name="John" />);
    expect(screen.getByText('JO')).not.toBeNull();
  });

  test('generates correct initials from three-word name', async () => {
    render(<Avatar avatarUrl={null} name="John Michael Doe" />);
    expect(screen.getByText('JD')).not.toBeNull();
  });

  test('renders image when avatarUrl provided', async () => {
    render(<Avatar avatarUrl="https://example.com/avatar.jpg" name="John Doe" />);
    // When avatarUrl is provided, initials should not be shown
    expect(screen.queryByText('JD')).toBeNull();
  });

  test('shows edit indicator when editable is true', async () => {
    render(<Avatar avatarUrl={null} name="John Doe" editable />);
    // Edit overlay shows ✎ character
    expect(screen.getByText('✎')).not.toBeNull();
  });

  test('does not show edit indicator when editable is false', async () => {
    render(<Avatar avatarUrl={null} name="John Doe" editable={false} />);
    expect(screen.queryByText('✎')).toBeNull();
  });

  test('shows uploading indicator when uploading', async () => {
    render(<Avatar avatarUrl={null} name="John Doe" editable uploading />);
    expect(screen.getByText('...')).not.toBeNull();
  });
});
