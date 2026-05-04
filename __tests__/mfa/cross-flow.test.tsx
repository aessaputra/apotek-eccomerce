import React from 'react';
import { AppState, Text } from 'react-native';
import {
  act,
  render as renderNative,
  waitFor as waitForNative,
} from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Login from '@/scenes/auth/Login';
import VerifyMfa from '@/scenes/auth/VerifyMfa';
import Profile from '@/scenes/profile/Profile';
import TwoStepVerification from '@/scenes/profile/TwoStepVerification';
import AuthProvider from '@/providers/AuthProvider';
import RootLayout from '@/app/_layout';
import type { User } from '@/types/user';

interface MfaFactor {
  id: string;
  type?: string;
  friendly_name?: string;
  status?: string;
}

interface ListFactorsResult {
  data: { totp: MfaFactor[] } | null;
  error: { message: string; name?: string } | null;
}

interface AuthServiceResult<TData = unknown> {
  data: TData | null;
  error: { message: string; name?: string } | null;
}

interface EnrollmentResult {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockUseSegments = jest.fn<() => string[]>();
const mockUseLinkingURL = jest.fn<() => string | null>();
const mockGetInitialURL = jest.fn<() => Promise<string | null>>();
const mockLoadFonts = jest.fn<() => Promise<void>>();
const mockLoadImages = jest.fn<() => Promise<void>>();
const mockHasNativeNotificationSupport = jest.fn<() => boolean>();
const mockGetExpoNotificationsModuleAsync = jest.fn<() => Promise<unknown>>();
const mockBootstrapNotificationsAsync = jest.fn<() => Promise<void>>();
const mockGetLastNotificationResponseAsync = jest.fn<() => Promise<unknown>>();
const mockAddNotificationResponseReceivedListener = jest.fn<(...args: unknown[]) => unknown>();
const mockResponseSubscriptionRemove = jest.fn();

const mockDispatch = jest.fn();
const mockSetUser = jest.fn((payload: unknown) => ({ type: 'setUser', payload }));
const mockSetLoggedIn = jest.fn((payload: boolean) => ({ type: 'setLoggedIn', payload }));
const mockSetChecked = jest.fn((payload: boolean) => ({ type: 'setChecked', payload }));
const mockSetPendingMfa = jest.fn((payload: boolean) => ({ type: 'setPendingMfa', payload }));
const mockSetAuthPhase = jest.fn((payload: string) => ({ type: 'setAuthPhase', payload }));
const mockReset = jest.fn(() => ({ type: 'reset' }));
const mockUseAppSlice = jest.fn();

const mockSignInWithPassword =
  jest.fn<(input: { email: string; password: string }) => Promise<AuthServiceResult>>();
const mockSignInWithGoogle = jest.fn<() => Promise<AuthServiceResult>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<AuthServiceResult>>();
const mockGetMfaAssuranceLevel =
  jest.fn<
    () => Promise<AuthServiceResult<{ currentLevel?: string | null; nextLevel?: string | null }>>
  >();
const mockRequiresMfaChallenge =
  jest.fn<(data: { currentLevel?: string | null; nextLevel?: string | null }) => boolean>();
const mockListMfaFactors = jest.fn<() => Promise<ListFactorsResult>>();
const mockCreateMfaChallenge =
  jest.fn<(factorId: string) => Promise<AuthServiceResult<{ id: string }>>>();
const mockVerifyMfaChallenge =
  jest.fn<
    (input: { factorId: string; challengeId: string; code: string }) => Promise<AuthServiceResult>
  >();
const mockReauthenticateWithPassword =
  jest.fn<(input: { email: string; password: string }) => Promise<AuthServiceResult>>();
const mockEnrollTotpFactor =
  jest.fn<
    (input: {
      friendlyName?: string;
      issuer?: string;
    }) => Promise<AuthServiceResult<EnrollmentResult>>
  >();
const mockRefreshAuthSession = jest.fn<() => Promise<AuthServiceResult>>();
const mockUnenrollMfaFactor = jest.fn<(factorId: string) => Promise<AuthServiceResult>>();
const mockGetCurrentUser = jest.fn<() => Promise<unknown>>();
const mockHandleOAuthHashTokens = jest.fn<() => Promise<unknown>>();
const mockClearLocalAuthSessionForInvalidRefreshToken = jest.fn<() => Promise<boolean>>();
const mockSyncExpoPushTokenIfPermitted = jest.fn<() => Promise<AuthServiceResult>>();
const mockClearExpoPushToken = jest.fn<() => Promise<AuthServiceResult>>();
const mockStartAutoRefresh = jest.fn();
const mockStopAutoRefresh = jest.fn();
const mockSubscriptionUnsubscribe = jest.fn();
const mockAppStateRemove = jest.fn();
const mockRemovePersistData = jest.fn<() => Promise<boolean>>();

let mockRouteParams: { resetSuccess?: string; error?: string } = {};
let mockUser: User | null = null;

jest.mock('@/tamagui-web.css', () => ({}), { virtual: true });

jest.mock('expo-router', () => {
  const MockStack = Object.assign(
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
    { Screen: () => null },
  );

  return {
    __esModule: true,
    Stack: MockStack,
    useRouter: () => ({ push: mockPush, replace: mockReplace, navigate: mockNavigate }),
    useSegments: () => mockUseSegments(),
    useLocalSearchParams: () => mockRouteParams,
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('expo-linking', () => ({
  getInitialURL: () => mockGetInitialURL(),
  useLinkingURL: () => mockUseLinkingURL(),
}));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: (listener: (response: unknown) => void) =>
    mockAddNotificationResponseReceivedListener(listener),
  getLastNotificationResponse: () => mockGetLastNotificationResponseAsync(),
}));
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
}));
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return { ...actual, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    SvgXml: ({ xml }: { xml: string }) => <View testID="svg-xml" accessibilityLabel={xml} />,
  };
});

jest.mock('@/providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/layouts/WelcomeSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('@/utils/config', () => ({ __esModule: true, default: { env: 'production' } }));
jest.mock('@/utils/fonts', () => ({
  fonts: { poppins: { regular: 'poppins_regular' } },
  loadFonts: () => mockLoadFonts(),
}));
jest.mock('@/utils/images', () => ({ images: { logo: 1 }, loadImages: () => mockLoadImages() }));
jest.mock('@/utils/notifications', () => ({
  bootstrapNotificationsAsync: () => mockBootstrapNotificationsAsync(),
  getExpoNotificationsModuleAsync: () => mockGetExpoNotificationsModuleAsync(),
  hasNativeNotificationSupport: () => mockHasNativeNotificationSupport(),
}));

jest.mock('@/components/elements/Avatar', () => {
  const { Text: NativeText } = jest.requireActual('react-native') as typeof import('react-native');

  return function MockAvatar({ name }: { name: string }) {
    return <NativeText>{`Avatar ${name}`}</NativeText>;
  };
});
jest.mock('@/components/elements/AppAlertDialog', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/icons', () => ({
  __esModule: true,
  AlertCircleIcon: () => null,
  ChevronRightIcon: () => null,
  CircleHelpIcon: () => null,
  CloseIcon: () => null,
  EyeIcon: () => null,
  EyeOffIcon: () => null,
  GoogleIcon: () => null,
  LockIcon: () => null,
  MapPinIcon: () => null,
  UserIcon: () => null,
}));

jest.mock('@/hooks', () => ({
  DataPersistKeys: { USER: 'USER' },
  useDataPersist: () => ({ removePersistData: mockRemovePersistData }),
}));
jest.mock('@/slices', () => ({
  useAppSlice: () => mockUseAppSlice(),
}));
jest.mock('@/services/user.service', () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock('@/services/notification.service', () => ({
  clearExpoPushToken: () => mockClearExpoPushToken(),
  syncExpoPushTokenIfPermitted: () => mockSyncExpoPushTokenIfPermitted(),
}));
jest.mock('@/services/auth.service', () => ({
  signInWithPassword: (input: { email: string; password: string }) => mockSignInWithPassword(input),
  signInWithGoogle: () => mockSignInWithGoogle(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  getMfaAssuranceLevel: () => mockGetMfaAssuranceLevel(),
  requiresMfaChallenge: (data: { currentLevel?: string | null; nextLevel?: string | null }) =>
    mockRequiresMfaChallenge(data),
  listMfaFactors: () => mockListMfaFactors(),
  createMfaChallenge: (factorId: string) => mockCreateMfaChallenge(factorId),
  verifyMfaChallenge: (input: { factorId: string; challengeId: string; code: string }) =>
    mockVerifyMfaChallenge(input),
  reauthenticateWithPassword: (input: { email: string; password: string }) =>
    mockReauthenticateWithPassword(input),
  enrollTotpFactor: (input: { friendlyName?: string; issuer?: string }) =>
    mockEnrollTotpFactor(input),
  refreshAuthSession: () => mockRefreshAuthSession(),
  unenrollMfaFactor: (factorId: string) => mockUnenrollMfaFactor(factorId),
  handleOAuthHashTokens: () => mockHandleOAuthHashTokens(),
  clearLocalAuthSessionForInvalidRefreshToken: () =>
    mockClearLocalAuthSessionForInvalidRefreshToken(),
}));
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: mockSubscriptionUnsubscribe } },
      }),
      startAutoRefresh: () => mockStartAutoRefresh(),
      stopAutoRefresh: () => mockStopAutoRefresh(),
    },
  },
}));

const populatedUser: User = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User One',
  full_name: 'User One',
  phone_number: '081234567890',
  avatar_url: null,
  role: 'customer',
  created_at: '2024-01-01T00:00:00Z',
};

const singleFactorResult: ListFactorsResult = {
  data: { totp: [{ id: 'factor-1', type: 'totp', status: 'verified' }] },
  error: null,
};

const twoFactorResult: ListFactorsResult = {
  data: {
    totp: [
      { id: 'factor-1', type: 'totp', friendly_name: 'Authy', status: 'verified' },
      { id: 'factor-2', type: 'totp', friendly_name: 'Google Authenticator', status: 'verified' },
    ],
  },
  error: null,
};

function fillLoginForm() {
  fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
  fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
  fireEvent.press(screen.getByLabelText('Masuk'));
}

function createCurrentUserResult() {
  return {
    user: populatedUser,
    profile: {
      id: 'user-1',
      avatar_url: null,
      created_at: '2026-04-23T00:00:00.000Z',
      expo_push_token: null,
      expo_push_token_updated_at: null,
      full_name: 'User One',
      is_banned: false,
      phone_number: null,
      role: 'customer' as const,
      updated_at: '2026-04-23T00:00:00.000Z',
    },
  };
}

describe('MFA cross-flow coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockNavigate.mockReset();
    mockUseSegments.mockReset();
    mockUseLinkingURL.mockReset();
    mockGetInitialURL.mockReset();
    mockUseAppSlice.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignInWithGoogle.mockReset();
    mockSignOut.mockReset();
    mockGetMfaAssuranceLevel.mockReset();
    mockRequiresMfaChallenge.mockReset();
    mockListMfaFactors.mockReset();
    mockCreateMfaChallenge.mockReset();
    mockVerifyMfaChallenge.mockReset();
    mockReauthenticateWithPassword.mockReset();
    mockEnrollTotpFactor.mockReset();
    mockRefreshAuthSession.mockReset();
    mockUnenrollMfaFactor.mockReset();
    mockGetCurrentUser.mockReset();
    mockHandleOAuthHashTokens.mockReset();
    mockClearLocalAuthSessionForInvalidRefreshToken.mockReset();
    mockSyncExpoPushTokenIfPermitted.mockReset();
    mockClearExpoPushToken.mockReset();
    mockLoadFonts.mockReset();
    mockLoadImages.mockReset();
    mockHasNativeNotificationSupport.mockReset();
    mockGetExpoNotificationsModuleAsync.mockReset();
    mockBootstrapNotificationsAsync.mockReset();
    mockGetLastNotificationResponseAsync.mockReset();
    mockAddNotificationResponseReceivedListener.mockReset();
    mockRemovePersistData.mockReset();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: mockAppStateRemove,
    } as ReturnType<typeof AppState.addEventListener>);
    mockRouteParams = {};
    mockUser = populatedUser;
    mockUseAppSlice.mockReturnValue({
      user: mockUser,
      authPhase: 'authenticated',
      checked: true,
      loggedIn: true,
      pendingMfa: false,
      dispatch: mockDispatch,
      setUser: mockSetUser,
      setLoggedIn: mockSetLoggedIn,
      setChecked: mockSetChecked,
      setPendingMfa: mockSetPendingMfa,
      setAuthPhase: mockSetAuthPhase,
      reset: mockReset,
    });
    mockUseSegments.mockReturnValue([]);
    mockUseLinkingURL.mockReturnValue(null);
    mockGetInitialURL.mockResolvedValue(null);
    mockLoadFonts.mockResolvedValue(undefined);
    mockLoadImages.mockResolvedValue(undefined);
    mockHasNativeNotificationSupport.mockReturnValue(false);
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);
    mockGetExpoNotificationsModuleAsync.mockResolvedValue({
      addNotificationResponseReceivedListener: (listener: (response: unknown) => void) =>
        mockAddNotificationResponseReceivedListener(listener),
      getLastNotificationResponse: () => mockGetLastNotificationResponseAsync(),
    });
    mockAddNotificationResponseReceivedListener.mockReturnValue({
      remove: mockResponseSubscriptionRemove,
    });
    mockBootstrapNotificationsAsync.mockResolvedValue(undefined);
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSignInWithGoogle.mockResolvedValue({ data: null, error: null });
    mockSignOut.mockResolvedValue({ data: null, error: null });
    mockGetMfaAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    });
    mockRequiresMfaChallenge.mockImplementation(
      data => data.currentLevel === 'aal1' && data.nextLevel === 'aal2',
    );
    mockListMfaFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mockCreateMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mockVerifyMfaChallenge.mockResolvedValue({ data: {}, error: null });
    mockReauthenticateWithPassword.mockResolvedValue({ data: {}, error: null });
    mockEnrollTotpFactor.mockResolvedValue({
      data: {
        id: 'factor-new',
        type: 'totp',
        totp: { qr_code: '<svg />', secret: 'SECRET123', uri: 'otpauth://totp/Apotek' },
      },
      error: null,
    });
    mockRefreshAuthSession.mockResolvedValue({ data: {}, error: null });
    mockUnenrollMfaFactor.mockResolvedValue({ data: {}, error: null });
    mockGetCurrentUser.mockResolvedValue(null);
    mockHandleOAuthHashTokens.mockResolvedValue(null);
    mockClearLocalAuthSessionForInvalidRefreshToken.mockResolvedValue(false);
    mockSyncExpoPushTokenIfPermitted.mockResolvedValue({ data: null, error: null });
    mockClearExpoPushToken.mockResolvedValue({ data: null, error: null });
    mockRemovePersistData.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('dispatches checking-mfa after password sign-in and does not redirect from login form', async () => {
    render(<Login />);
    fillLoginForm();

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password1',
      });
      expect(mockSetAuthPhase).toHaveBeenCalledWith('checking-mfa');
    });

    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/verify-mfa');
  });

  it('keeps protected access blocked after an invalid MFA code', async () => {
    mockListMfaFactors.mockResolvedValueOnce(singleFactorResult);
    mockVerifyMfaChallenge.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid code', name: 'AuthError' },
    });

    render(<VerifyMfa />);

    await waitFor(() => {
      expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
    });

    fireEvent.changeText(screen.getByLabelText('Kode verifikasi'), '000000');
    fireEvent.press(screen.getByLabelText('Lanjutkan verifikasi'));

    expect(await screen.findByText('Kode verifikasi tidak valid. Coba lagi.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith('/home');

    mockUseAppSlice.mockReturnValue({
      user: mockUser,
      authPhase: 'requires-mfa',
      checked: true,
      loggedIn: true,
      pendingMfa: true,
      dispatch: mockDispatch,
      setUser: mockSetUser,
      setLoggedIn: mockSetLoggedIn,
      setChecked: mockSetChecked,
      setPendingMfa: mockSetPendingMfa,
      setAuthPhase: mockSetAuthPhase,
      reset: mockReset,
    });
    mockUseSegments.mockReturnValue(['cart']);
    renderNative(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.runAllTimers();
    });

    await waitForNative(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/verify-mfa');
    });
  });

  it('routes to home after successful MFA verification', async () => {
    mockListMfaFactors.mockResolvedValueOnce(singleFactorResult);

    render(<VerifyMfa />);

    await waitFor(() => {
      expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
    });

    fireEvent.changeText(screen.getByLabelText('Kode verifikasi'), '123456');
    fireEvent.press(screen.getByLabelText('Lanjutkan verifikasi'));

    await waitFor(() => {
      expect(mockVerifyMfaChallenge).toHaveBeenCalledWith({
        factorId: 'factor-1',
        challengeId: 'challenge-1',
        code: '123456',
      });
      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
  });

  it('renders the profile MFA menu copy exactly', () => {
    render(<Profile />);

    expect(screen.getByText('Verifikasi 2 Langkah')).toBeTruthy();
    expect(screen.queryByText('Tambahkan lapisan keamanan saat masuk.')).toBeNull();
  });

  it('completes the full enable flow from password through enrollment verification', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          totp: [{ id: 'factor-new', friendly_name: 'Aplikasi Autentikator', status: 'verified' }],
        },
        error: null,
      });

    render(<TwoStepVerification />);

    await waitFor(() =>
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => expect(screen.getByText('Hubungkan aplikasi autentikator')).toBeTruthy());
    expect(screen.getByText('SECRET123')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Saya sudah menyalin secret'));

    await waitFor(() => expect(screen.getByLabelText('Kode autentikator')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Kode autentikator'), '123456');
    fireEvent.press(screen.getByLabelText('Aktifkan dengan kode autentikator'));

    await waitFor(() => expect(screen.getByText('Aktif')).toBeTruthy());
    expect(mockReauthenticateWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'valid-password',
    });
    expect(mockReauthenticateWithPassword.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnrollTotpFactor.mock.invocationCallOrder[0],
    );
    expect(mockEnrollTotpFactor).toHaveBeenCalledWith({
      friendlyName: 'Aplikasi Autentikator',
      issuer: 'Apotek Ecommerce',
    });
    expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-new');
    expect(mockVerifyMfaChallenge).toHaveBeenCalledWith({
      factorId: 'factor-new',
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
  });

  it('completes the full disable flow through password, unenroll, and refresh without another TOTP prompt', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() =>
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => expect(screen.getByText('Nonaktif')).toBeTruthy());
    expect(mockReauthenticateWithPassword.mock.invocationCallOrder[0]).toBeLessThan(
      mockUnenrollMfaFactor.mock.invocationCallOrder[0],
    );
    expect(screen.queryByLabelText('Kode autentikator untuk menonaktifkan')).toBeNull();
    expect(mockGetMfaAssuranceLevel).not.toHaveBeenCalled();
    expect(mockCreateMfaChallenge).not.toHaveBeenCalled();
    expect(mockVerifyMfaChallenge).not.toHaveBeenCalled();
    expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-1');
    expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
  });

  it('supports multiple factor selection in both challenge and disable flows', async () => {
    mockListMfaFactors.mockResolvedValueOnce(twoFactorResult);
    render(<VerifyMfa />);

    expect(await screen.findByText('Pilih aplikasi autentikator')).toBeTruthy();
    fireEvent.press(screen.getAllByText('Aplikasi Autentikator')[1]);

    await waitFor(() => expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-2'));

    mockListMfaFactors.mockResolvedValueOnce(twoFactorResult).mockResolvedValueOnce({
      data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
      error: null,
    });
    render(<TwoStepVerification />);

    await waitFor(() =>
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.press(screen.getByLabelText('Pilih aplikasi autentikator Google Authenticator'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-2'));
    expect(mockUnenrollMfaFactor).not.toHaveBeenCalledWith('factor-1');
  });

  it('cleans up an abandoned enrollment when the user cancels after factor creation', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() =>
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => expect(screen.getByText('Hubungkan aplikasi autentikator')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Batalkan setup aktivasi'));

    await waitFor(() => expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-new'));
  });

  it('routes OAuth or persisted cold-start AAL1 sessions requiring AAL2 to verify MFA', async () => {
    jest.useRealTimers();
    mockGetCurrentUser.mockResolvedValueOnce(createCurrentUserResult());
    mockGetMfaAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    });

    renderNative(
      <AuthProvider>
        <Text>child</Text>
      </AuthProvider>,
    );

    await waitForNative(() => {
      expect(mockSetAuthPhase).toHaveBeenLastCalledWith('requires-mfa');
    });

    mockUseAppSlice.mockReturnValue({
      user: mockUser,
      authPhase: 'requires-mfa',
      checked: true,
      loggedIn: true,
      pendingMfa: true,
      dispatch: mockDispatch,
      setUser: mockSetUser,
      setLoggedIn: mockSetLoggedIn,
      setChecked: mockSetChecked,
      setPendingMfa: mockSetPendingMfa,
      setAuthPhase: mockSetAuthPhase,
      reset: mockReset,
    });
    mockUseSegments.mockReturnValue(['(tabs)', 'home']);
    renderNative(<RootLayout />);

    await waitForNative(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/verify-mfa');
    });
  });

  it('renders recovery-deferred copy in the settings shell', async () => {
    mockListMfaFactors.mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    expect(
      await screen.findByText(
        'Kode cadangan belum tersedia. Pastikan Anda tetap dapat membuka aplikasi autentikator.',
      ),
    ).toBeTruthy();
  });
});
