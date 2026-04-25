import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Profile from '@/scenes/profile/Profile';
import type { User } from '@/types/user';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRemovePersistData = jest.fn<() => Promise<boolean>>();
const mockSignOut = jest.fn<() => Promise<void>>();

let mockUser: User | null = null;

const populatedUser: User = {
  id: 'user-1',
  email: 'siti@example.com',
  name: 'Siti Fallback',
  full_name: 'Siti Aminah',
  phone_number: '081234567890',
  avatar_url: null,
  role: 'customer',
  created_at: '2024-01-01T00:00:00Z',
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: mockUser }),
}));

jest.mock('@/hooks', () => ({
  DataPersistKeys: { USER: 'USER' },
  useDataPersist: () => ({
    removePersistData: mockRemovePersistData,
  }),
}));

jest.mock('@/services/auth.service', () => ({
  signOut: () => mockSignOut(),
}));

jest.mock('@/components/elements/Avatar', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  function MockAvatar({ name }: { name: string }) {
    return <Text>{`Avatar ${name}`}</Text>;
  }

  return MockAvatar;
});

jest.mock('@/components/elements/AppAlertDialog', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  function MockAppAlertDialog({
    open,
    title,
    description,
    cancelText,
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    cancelText?: string;
    confirmText?: string;
    onConfirm?: () => void | Promise<void>;
  }) {
    if (!open) return null;

    return (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        {cancelText ? <Text>{cancelText}</Text> : null}
        <Pressable accessibilityLabel={`confirm-${confirmText ?? 'OK'}`} onPress={onConfirm}>
          <Text>{confirmText ?? 'OK'}</Text>
        </Pressable>
      </View>
    );
  }

  return MockAppAlertDialog;
});

jest.mock('@/components/icons', () => ({
  __esModule: true,
  ChevronRightIcon: () => null,
  CircleHelpIcon: () => null,
  HistoryIcon: () => null,
  MapPinIcon: () => null,
  UserIcon: () => null,
}));

describe('<Profile />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = populatedUser;
    mockRemovePersistData.mockResolvedValue(true);
    mockSignOut.mockResolvedValue(undefined);
  });

  it('shows the loading state when no user is available', () => {
    mockUser = null;

    render(<Profile />);

    expect(screen.getByLabelText('Memuat profil')).not.toBeNull();
  });

  it('renders populated user information and member badge', () => {
    render(<Profile />);

    expect(screen.getByText('Siti Aminah')).not.toBeNull();
    expect(screen.getByText('Avatar Siti Aminah')).not.toBeNull();
    expect(screen.getByText('Bergabung 1 Januari 2024')).not.toBeNull();
  });

  it('falls back to name and Pengguna for missing profile names', () => {
    mockUser = { ...populatedUser, full_name: null, name: 'Nama Cadangan', created_at: undefined };
    const { rerender } = render(<Profile />);

    expect(screen.getByText('Nama Cadangan')).not.toBeNull();

    mockUser = { ...populatedUser, full_name: null, name: '', created_at: undefined };
    rerender(<Profile />);

    expect(screen.getByText('Pengguna')).not.toBeNull();
  });

  it('navigates each profile menu item to its current route', () => {
    render(<Profile />);

    fireEvent.press(screen.getByLabelText('Profile Saya'));
    fireEvent.press(screen.getByLabelText('Alamat pengiriman'));
    fireEvent.press(screen.getByLabelText('Riwayat Pesanan'));
    fireEvent.press(screen.getByLabelText('Dukungan'));

    expect(mockPush).toHaveBeenNthCalledWith(1, '/profile/edit-profile');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/profile/addresses');
    expect(mockPush).toHaveBeenNthCalledWith(3, '/profile/order-history');
    expect(mockPush).toHaveBeenNthCalledWith(4, '/profile/support');
  });

  it('opens the logout dialog and logs out successfully', async () => {
    render(<Profile />);

    fireEvent.press(screen.getByLabelText('Keluar dari akun'));

    expect(screen.getAllByText('Keluar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Anda yakin ingin keluar?')).not.toBeNull();
    expect(screen.getByText('Batal')).not.toBeNull();

    fireEvent.press(screen.getByLabelText('confirm-Keluar'));

    await waitFor(() => {
      expect(mockRemovePersistData).toHaveBeenCalledWith('USER');
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('still routes to login when logout fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSignOut.mockRejectedValueOnce(new Error('network failed'));
    render(<Profile />);

    fireEvent.press(screen.getByLabelText('Keluar dari akun'));
    fireEvent.press(screen.getByLabelText('confirm-Keluar'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });

    consoleErrorSpy.mockRestore();
  });
});
