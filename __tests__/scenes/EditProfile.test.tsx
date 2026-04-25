import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Keyboard, Platform } from 'react-native';
import type { EmitterSubscription, KeyboardEvent } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import EditProfile from '@/scenes/profile/EditProfile';
import type { User } from '@/types/user';

const mockBack = jest.fn();
const mockDispatch = jest.fn();
const mockSetUser = jest.fn((user: User) => ({ type: 'setUser', payload: user }));
const mockUpdateProfile =
  jest.fn<(...args: unknown[]) => Promise<{ data: Partial<User> | null; error: Error | null }>>();
const mockUploadAvatar =
  jest.fn<(...args: unknown[]) => Promise<{ url: string | null; error: Error | null }>>();

let mockUser: User | null = null;

const profileUser: User = {
  id: 'user-1',
  email: 'siti@example.com',
  name: 'Siti Aminah',
  full_name: 'Siti Aminah',
  phone_number: '081234567890',
  avatar_url: null,
  role: 'customer',
  created_at: '2024-01-01T00:00:00Z',
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 0,
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Error: 'Error', Success: 'Success' },
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
  useAppSlice: () => ({ user: mockUser, dispatch: mockDispatch, setUser: mockSetUser }),
}));

jest.mock('@/services/profile.service', () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
}));

jest.mock('@/components/elements/Avatar', () => {
  const { Pressable, Text, View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  function MockAvatar({
    name,
    onUpload,
    uploading,
  }: {
    name: string;
    onUpload?: (uri: string) => Promise<void>;
    uploading?: boolean;
  }) {
    return (
      <View>
        <Text>{`Avatar ${name}`}</Text>
        <Text>{uploading ? 'Avatar uploading' : 'Avatar idle'}</Text>
        <Pressable
          accessibilityLabel="Upload avatar"
          onPress={() => onUpload?.('file:///avatar.jpg')}>
          <Text>Upload Avatar</Text>
        </Pressable>
      </View>
    );
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
    confirmText,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm?: () => void;
  }) {
    if (!open) return null;

    return (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        <Pressable accessibilityLabel={`confirm-${confirmText ?? 'OK'}`} onPress={onConfirm}>
          <Text>{confirmText ?? 'OK'}</Text>
        </Pressable>
      </View>
    );
  }

  return MockAppAlertDialog;
});

jest.mock('@/components/layouts/BottomActionBar', () => {
  const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');

  function MockBottomActionBar({
    buttonTitle,
    onPress,
    disabled,
  }: {
    buttonTitle: string;
    onPress: () => void | Promise<void>;
    disabled?: boolean;
  }) {
    return (
      <Pressable accessibilityLabel="Simpan perubahan profil" disabled={disabled} onPress={onPress}>
        <Text>{buttonTitle}</Text>
      </Pressable>
    );
  }

  return MockBottomActionBar;
});

jest.mock('@/components/icons', () => ({
  __esModule: true,
  AlertCircleIcon: () => null,
  CloseIcon: () => null,
  XCircleIcon: () => null,
}));

describe('<EditProfile />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = profileUser;
    mockUpdateProfile.mockResolvedValue({
      data: { full_name: 'Siti Updated', phone_number: '089876543210', avatar_url: null },
      error: null,
    });
    mockUploadAvatar.mockResolvedValue({ url: 'https://cdn.example.com/avatar.jpg', error: null });
  });

  it('shows the loading state when no user is available', () => {
    mockUser = null;

    render(<EditProfile />);

    expect(screen.getByLabelText('Memuat profil')).not.toBeNull();
  });

  it('shows required validation failures for empty name and phone', async () => {
    render(<EditProfile />);

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), '');
    fireEvent.changeText(screen.getByLabelText('Input nomor telepon'), '');
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    expect(await screen.findByText('Nama lengkap wajib diisi')).not.toBeNull();
    expect(screen.getByText('Nomor telepon wajib diisi')).not.toBeNull();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows length and format validation failures for invalid edits', async () => {
    render(<EditProfile />);

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), 'A');
    fireEvent.changeText(screen.getByLabelText('Input nomor telepon'), 'abc');
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    expect(await screen.findByText('Nama harus minimal 2 karakter')).not.toBeNull();
    expect(screen.getByText('Format nomor telepon tidak valid')).not.toBeNull();

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), 'A'.repeat(101));
    fireEvent.changeText(screen.getByLabelText('Input nomor telepon'), '1234567');
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    expect(await screen.findByText('Nama maksimal 100 karakter')).not.toBeNull();
    expect(screen.getByText('Nomor telepon harus minimal 8 digit')).not.toBeNull();

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), 'Siti Aminah');
    fireEvent.changeText(screen.getByLabelText('Input nomor telepon'), '1'.repeat(16));
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    expect(await screen.findByText('Nomor telepon maksimal 15 digit')).not.toBeNull();
  });

  it('saves valid profile edits and dispatches the updated user', async () => {
    render(<EditProfile />);

    expect(screen.getByText('Gunakan 2-100 karakter.')).not.toBeNull();
    expect(screen.getByText('Wajib diisi, 8-15 digit angka.')).not.toBeNull();

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), 'Siti Updated');
    fireEvent.changeText(screen.getByLabelText('Input nomor telepon'), '089876543210');
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
        full_name: 'Siti Updated',
        phone_number: '089876543210',
      });
      expect(mockSetUser).toHaveBeenCalledWith({
        ...profileUser,
        full_name: 'Siti Updated',
        name: 'Siti Updated',
        phone_number: '089876543210',
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'setUser',
        payload: {
          ...profileUser,
          full_name: 'Siti Updated',
          name: 'Siti Updated',
          phone_number: '089876543210',
        },
      });
    });

    expect(screen.getByText('Profil Berhasil Diperbarui')).not.toBeNull();
    expect(screen.getByText('Perubahan profil Anda telah berhasil disimpan.')).not.toBeNull();
  });

  it('shows save failures from updateProfile', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      data: null,
      error: new Error('Gagal menyimpan profil.'),
    });
    render(<EditProfile />);

    fireEvent.changeText(screen.getByLabelText('Input nama lengkap'), 'Siti Error');
    fireEvent.press(screen.getByLabelText('Simpan perubahan profil'));

    expect(await screen.findByText('Gagal menyimpan profil.')).not.toBeNull();
  });

  it('uploads an avatar and dispatches the updated avatar URL', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      data: { avatar_url: 'https://cdn.example.com/avatar.jpg' },
      error: null,
    });
    render(<EditProfile />);

    fireEvent.press(screen.getByLabelText('Upload avatar'));

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledWith('user-1', 'file:///avatar.jpg');
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', {
        avatar_url: 'https://cdn.example.com/avatar.jpg',
      });
      expect(mockSetUser).toHaveBeenCalledWith({
        ...profileUser,
        avatar_url: 'https://cdn.example.com/avatar.jpg',
      });
    });
  });

  it('shows avatar upload fallback errors', async () => {
    mockUploadAvatar.mockResolvedValueOnce({ url: null, error: null });
    render(<EditProfile />);

    fireEvent.press(screen.getByLabelText('Upload avatar'));

    expect(await screen.findByText('Gagal mengupload avatar')).not.toBeNull();
  });

  it('shows avatar update failures', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      data: null,
      error: new Error('Avatar gagal disimpan'),
    });
    render(<EditProfile />);

    fireEvent.press(screen.getByLabelText('Upload avatar'));

    expect(await screen.findByText('Avatar gagal disimpan')).not.toBeNull();
  });

  it('registers and removes Android keyboard show/hide listeners', () => {
    const originalPlatform = Platform.OS;
    const removeShow = jest.fn();
    const removeHide = jest.fn();
    const keyboardEvent: KeyboardEvent = {
      duration: 0,
      easing: 'keyboard',
      endCoordinates: { height: 240, screenX: 0, screenY: 0, width: 320 },
      startCoordinates: { height: 0, screenX: 0, screenY: 0, width: 320 },
    };
    const addListenerSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((eventName, listener) => {
        if (eventName === 'keyboardDidShow') {
          listener(keyboardEvent);
          return { remove: removeShow } as unknown as EmitterSubscription;
        }

        listener(keyboardEvent);
        return { remove: removeHide } as unknown as EmitterSubscription;
      });

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { unmount } = render(<EditProfile />);

    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));

    unmount();

    expect(removeShow).toHaveBeenCalled();
    expect(removeHide).toHaveBeenCalled();

    addListenerSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });
});
