import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Login from '@/scenes/auth/Login';
import { LOGIN_RESET_SUCCESS_MESSAGE } from '@/scenes/auth/authForm.helpers';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
type AuthSceneResult = Promise<unknown>;
let mockRouteParams: { resetSuccess?: string; error?: string } = {};

const mockSignInWithPassword = jest.fn<(...args: unknown[]) => AuthSceneResult>();
const mockSignInWithGoogle = jest.fn<(...args: unknown[]) => AuthSceneResult>();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      navigate: mockNavigate,
    }),
    useLocalSearchParams: () => mockRouteParams,
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('@/services/auth.service', () => ({
  signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
  signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
}));

describe('<Login />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockRouteParams = {};
    mockSignInWithPassword.mockReset();
    mockSignInWithGoogle.mockReset();
    mockSignInWithPassword.mockImplementation(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    }));
    mockSignInWithGoogle.mockImplementation(async () => ({ data: null, error: null }));
  });

  it('shows the required-field message for an empty form', () => {
    render(<Login />);

    fireEvent.press(screen.getByLabelText('Masuk'));

    expect(screen.getByText('Email dan password wajib diisi.')).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('shows the invalid-email message before calling the service', () => {
    render(<Login />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Masuk'));

    expect(screen.getByText('Format email tidak valid.')).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('redirects unverified email logins with the trimmed email param', async () => {
    mockSignInWithPassword.mockImplementationOnce(async () => ({
      data: null,
      error: { code: 'email_not_confirmed', message: 'email_not_confirmed' },
    }));
    render(<Login />);

    fireEvent.changeText(screen.getByTestId('email-input'), '  user@example.com  ');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Masuk'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password1',
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'user@example.com' },
      });
    });
  });

  it('ignores Google OAuth cancellation without showing an error', async () => {
    mockSignInWithGoogle.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Login Google dibatalkan', name: 'AuthCancelError' },
    }));
    render(<Login />);

    fireEvent.press(screen.getByLabelText('Masuk dengan Google'));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledWith();
    });
    expect(screen.queryByText('Login dibatalkan.')).toBeNull();
    expect(screen.queryByText('Login Google dibatalkan')).toBeNull();
  });

  it('shows Google OAuth service errors returned by the auth service', async () => {
    mockSignInWithGoogle.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Provider unavailable', name: 'UnknownGoogleError' },
    }));
    render(<Login />);

    fireEvent.press(screen.getByLabelText('Masuk dengan Google'));

    expect(await screen.findByText('Provider unavailable')).toBeTruthy();
  });

  it('shows the generic login error when password sign-in throws', async () => {
    mockSignInWithPassword.mockImplementationOnce(async () => {
      throw new Error('Unexpected auth failure');
    });
    render(<Login />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Masuk'));

    expect(
      await screen.findByText('Terjadi kesalahan saat login. Silakan coba lagi.'),
    ).toBeTruthy();
  });

  it('navigates to forgot password from the Login form card', () => {
    render(<Login />);

    fireEvent.press(screen.getByLabelText('Lupa Password?'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('shows and clears the reset success route-param message once', async () => {
    mockRouteParams = { resetSuccess: LOGIN_RESET_SUCCESS_MESSAGE };
    render(<Login />);

    expect(screen.getByText(LOGIN_RESET_SUCCESS_MESSAGE)).toBeTruthy();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });

    fireEvent.press(screen.getByLabelText('Dismiss success'));

    await waitFor(() => {
      expect(screen.queryByText(LOGIN_RESET_SUCCESS_MESSAGE)).toBeNull();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('ignores unapproved reset success route-param text', () => {
    mockRouteParams = { resetSuccess: 'Klik tautan ini untuk memperbarui akun Anda.' };
    render(<Login />);

    expect(screen.queryByText('Klik tautan ini untuk memperbarui akun Anda.')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
