import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import SignUp from '@/scenes/auth/SignUp';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
type AuthSceneResult = Promise<unknown>;

const mockSignUp = jest.fn<(...args: unknown[]) => AuthSceneResult>();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      navigate: mockNavigate,
    }),
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('@/services/auth.service', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

describe('<SignUp />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockSignUp.mockReset();
    mockSignUp.mockImplementation(async () => ({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    }));
  });

  it('shows the required-field message for an empty form', () => {
    render(<SignUp />);

    fireEvent.press(screen.getByLabelText('Buat Akun'));

    expect(screen.getByText('Email dan password wajib diisi.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows the invalid-email message before calling the service', () => {
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    expect(screen.getByText('Format email tidak valid.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows the minimum password length policy message', () => {
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'a1');
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    expect(screen.getByText('Password minimal 6 karakter.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it.each([
    ['missing a number', 'abcdef'],
    ['missing a letter', '123456'],
  ])('shows the password complexity policy message when the password is %s', (_case, password) => {
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), password);
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    expect(screen.getByText('Password harus mengandung huruf dan angka.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows the user-already-exists email error from the auth service', async () => {
    mockSignUp.mockImplementationOnce(async () => ({
      data: null,
      error: {
        code: 'user_already_exists',
        message: 'User already registered',
      },
    }));
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'registered@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    await waitFor(() => {
      expect(
        screen.getByText('Email sudah terdaftar. Silakan login atau gunakan email lain.'),
      ).toBeTruthy();
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'registered@example.com',
        password: 'password1',
      });
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('updates the password strength indicator from weak to medium to strong', () => {
    render(<SignUp />);
    const passwordInput = screen.getByTestId('password-input');

    fireEvent.changeText(passwordInput, 'abc');
    expect(screen.getByText('Lemah')).toBeTruthy();

    fireEvent.changeText(passwordInput, 'abc123');
    expect(screen.queryByText('Lemah')).toBeNull();
    expect(screen.getByText('Sedang')).toBeTruthy();

    fireEvent.changeText(passwordInput, 'password1');
    expect(screen.queryByText('Sedang')).toBeNull();
    expect(screen.getByText('Kuat')).toBeTruthy();
  });

  it('redirects users without a session to verify email using the trimmed email param', async () => {
    mockSignUp.mockImplementationOnce(async () => ({
      data: { user: { id: 'user-2' }, session: null },
      error: null,
    }));
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), '  new@example.com  ');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password1',
      });
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'new@example.com' },
      });
    });
  });

  it('does not redirect to verify email when sign-up returns a session', async () => {
    mockSignUp.mockImplementationOnce(async () => ({
      data: {
        user: { id: 'user-3' },
        session: { access_token: 'test-access-token' },
      },
      error: null,
    }));
    render(<SignUp />);

    fireEvent.changeText(screen.getByTestId('email-input'), '  session@example.com  ');
    fireEvent.changeText(screen.getByTestId('password-input'), 'password1');
    fireEvent.press(screen.getByLabelText('Buat Akun'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'session@example.com',
        password: 'password1',
      });
    });
    expect(mockPush).not.toHaveBeenCalledWith({
      pathname: '/(auth)/verify-email',
      params: { email: 'session@example.com' },
    });
  });
});
