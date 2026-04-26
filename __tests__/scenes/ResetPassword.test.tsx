import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import ResetPassword from '@/scenes/auth/ResetPassword';
import { AuthErrorCode } from '@/constants/auth.errors';
import { LOGIN_RESET_SUCCESS_MESSAGE } from '@/scenes/auth/authForm.helpers';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
type AuthSceneResult = Promise<unknown>;
type ResetPasswordRouteParams = {
  token_hash?: string | string[];
  type?: string | string[];
  error?: string | string[];
};

let mockRouteParams: ResetPasswordRouteParams = {};
const mockVerifyEmailOtp = jest.fn<(...args: unknown[]) => AuthSceneResult>();
const mockUpdatePassword = jest.fn<(...args: unknown[]) => AuthSceneResult>();
const mockSignOut = jest.fn<(...args: unknown[]) => AuthSceneResult>();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    navigate: mockNavigate,
  }),
  useLocalSearchParams: () => mockRouteParams,
}));

jest.mock('@/services/auth.service', () => ({
  verifyEmailOtp: (...args: unknown[]) => mockVerifyEmailOtp(...args),
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

function setRecoveryRouteParams(params: ResetPasswordRouteParams = {}) {
  mockRouteParams = params;
}

async function renderVerifiedResetPassword() {
  setRecoveryRouteParams({ token_hash: 'recovery-token-hash', type: 'recovery' });
  render(<ResetPassword />);

  await screen.findByLabelText('Simpan Password Baru');
}

function fillPasswordFields(password: string, confirmation = password) {
  const passwordInputs = screen.getAllByTestId('password-input');
  fireEvent.changeText(passwordInputs[0], password);
  fireEvent.changeText(passwordInputs[1], confirmation);
}

describe('<ResetPassword />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockNavigate.mockClear();
    setRecoveryRouteParams();
    mockVerifyEmailOtp.mockReset();
    mockUpdatePassword.mockReset();
    mockSignOut.mockReset();
    mockVerifyEmailOtp.mockImplementation(async () => ({ data: { session: {} }, error: null }));
    mockUpdatePassword.mockImplementation(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    }));
    mockSignOut.mockImplementation(async () => ({ error: null }));
  });

  it('verifies token_hash recovery links before rendering the password form', async () => {
    setRecoveryRouteParams({ token_hash: 'recovery-token-hash', type: 'recovery' });

    render(<ResetPassword />);

    expect(screen.getByText('Memeriksa tautan reset password...')).toBeTruthy();

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith({
        tokenHash: 'recovery-token-hash',
        type: 'recovery',
      });
      expect(screen.getByLabelText('Simpan Password Baru')).toBeTruthy();
    });
  });

  it('shows the invalid-link state with Forgot Password and Login CTAs when opened directly', async () => {
    render(<ResetPassword />);

    expect(await screen.findByText('Tautan Tidak Valid')).toBeTruthy();
    expect(
      screen.getByText(
        'Tautan reset password tidak valid atau kedaluwarsa. Silakan minta tautan baru.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'Tautan reset password tidak valid, sudah digunakan, atau telah kedaluwarsa.',
      ),
    ).toBeNull();
    expect(screen.queryByLabelText('Dismiss error')).toBeNull();
    expect(mockVerifyEmailOtp).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Minta Tautan Reset Baru'));
    fireEvent.press(screen.getByLabelText('Kembali ke Login'));

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/forgot-password');
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not render arbitrary route error text from reset-password links', async () => {
    setRecoveryRouteParams({ error: 'Klik tautan palsu ini untuk memperbarui akun Anda.' });

    render(<ResetPassword />);

    expect(await screen.findByText('Tautan Tidak Valid')).toBeTruthy();
    expect(
      screen.getByText(
        'Tautan reset password tidak valid atau kedaluwarsa. Silakan minta tautan baru.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Klik tautan palsu ini untuk memperbarui akun Anda.')).toBeNull();
  });

  it('blocks mismatched confirmation before calling updatePassword', async () => {
    await renderVerifiedResetPassword();

    fillPasswordFields('password1', 'password2');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(screen.getByText('Konfirmasi password tidak sama.')).toBeTruthy();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('blocks weak passwords before calling updatePassword', async () => {
    await renderVerifiedResetPassword();

    fillPasswordFields('abcdef');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(screen.getByText('Password harus mengandung huruf dan angka.')).toBeTruthy();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('updates the password, signs out, and navigates to Login with reset-success copy', async () => {
    const callSequence: string[] = [];
    mockUpdatePassword.mockImplementationOnce(async () => {
      callSequence.push('updatePassword');
      return { data: { user: { id: 'user-1' } }, error: null };
    });
    mockSignOut.mockImplementationOnce(async () => {
      callSequence.push('signOut');
      return { error: null };
    });
    await renderVerifiedResetPassword();

    fillPasswordFields('password1');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('password1');
      expect(mockSignOut).toHaveBeenCalledWith();
      expect(callSequence).toEqual(['updatePassword', 'signOut']);
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/login',
        params: { resetSuccess: LOGIN_RESET_SUCCESS_MESSAGE },
      });
    });
  });

  it.each([
    [AuthErrorCode.OTP_EXPIRED, 'expired-token-hash'],
    [AuthErrorCode.INVALID_GRANT, 'reused-token-hash'],
  ])('shows restart CTA for invalid or expired recovery token %s', async (code, tokenHash) => {
    mockVerifyEmailOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { code, message: code },
    }));
    setRecoveryRouteParams({ token_hash: tokenHash, type: 'recovery' });

    render(<ResetPassword />);

    expect(await screen.findByText('Tautan Tidak Valid')).toBeTruthy();
    expect(
      screen.getByText(
        'Tautan reset password tidak valid atau kedaluwarsa. Silakan minta tautan baru.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Minta Tautan Reset Baru')).toBeTruthy();
  });

  it.each([
    [AuthErrorCode.SAME_PASSWORD, 'Password baru tidak boleh sama dengan password lama.'],
    [AuthErrorCode.WEAK_PASSWORD, 'Password terlalu lemah. Gunakan kombinasi yang lebih kuat.'],
  ])('shows mapped service error copy for %s', async (code, message) => {
    mockUpdatePassword.mockImplementationOnce(async () => ({
      data: null,
      error: { code, message: code },
    }));
    await renderVerifiedResetPassword();

    fillPasswordFields('password1');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('shows a visible Indonesian network state when verification throws', async () => {
    mockVerifyEmailOtp.mockImplementationOnce(async () => {
      throw new Error('Network unavailable');
    });
    setRecoveryRouteParams({ token_hash: 'network-token-hash', type: 'recovery' });

    render(<ResetPassword />);

    expect(
      await screen.findByText('Koneksi internet bermasalah. Periksa koneksi Anda dan coba lagi.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Dismiss error')).toBeNull();
    expect(screen.getByLabelText('Minta Tautan Reset Baru')).toBeTruthy();
  });

  it('shows a visible Indonesian error when updatePassword throws', async () => {
    mockUpdatePassword.mockImplementationOnce(async () => {
      throw new Error('Unexpected update failure');
    });
    await renderVerifiedResetPassword();

    fillPasswordFields('password1');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(
      await screen.findByText('Terjadi kesalahan saat memperbarui password. Silakan coba lagi.'),
    ).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does not render arbitrary updatePassword service error messages', async () => {
    mockUpdatePassword.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Click http://evil.example/reset to continue', name: 'UnknownAuthError' },
    }));
    await renderVerifiedResetPassword();

    fillPasswordFields('password1');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(
      await screen.findByText(
        'Password belum dapat diperbarui. Silakan coba lagi atau minta tautan reset baru.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Click http://evil.example/reset to continue')).toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does not render arbitrary signOut service error messages after password update', async () => {
    mockSignOut.mockImplementationOnce(async () => ({
      error: { message: 'Keep this session open', name: 'UnknownSignOutError' },
    }));
    await renderVerifiedResetPassword();

    fillPasswordFields('password1');
    fireEvent.press(screen.getByLabelText('Simpan Password Baru'));

    expect(
      await screen.findByText(
        'Password berhasil diperbarui, tetapi kami gagal mengakhiri sesi reset. Silakan coba lagi.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Keep this session open')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { resetSuccess: LOGIN_RESET_SUCCESS_MESSAGE },
    });
  });
});
