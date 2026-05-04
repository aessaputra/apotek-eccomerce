import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import TwoStepVerification from '@/scenes/profile/TwoStepVerification';

interface MfaFactor {
  id: string;
  friendly_name?: string;
  status?: string;
}

interface ListFactorsResult {
  data: { totp: MfaFactor[] } | null;
  error: { message: string; name: string } | null;
}

interface AuthServiceResult<TData = unknown> {
  data: TData | null;
  error: { message: string; name: string } | null;
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

const mockListMfaFactors = jest.fn<() => Promise<ListFactorsResult>>();
const mockReauthenticateWithPassword =
  jest.fn<(input: { email: string; password: string }) => Promise<AuthServiceResult>>();
const mockEnrollTotpFactor =
  jest.fn<
    (input: {
      friendlyName?: string;
      issuer?: string;
    }) => Promise<AuthServiceResult<EnrollmentResult>>
  >();
const mockCreateMfaChallenge =
  jest.fn<(factorId: string) => Promise<AuthServiceResult<{ id: string }>>>();
const mockGetMfaAssuranceLevel =
  jest.fn<
    () => Promise<AuthServiceResult<{ currentLevel?: string | null; nextLevel?: string | null }>>
  >();
const mockRequiresMfaChallenge =
  jest.fn<(data: { currentLevel?: string | null; nextLevel?: string | null }) => boolean>();
const mockVerifyMfaChallenge =
  jest.fn<
    (input: { factorId: string; challengeId: string; code: string }) => Promise<AuthServiceResult>
  >();
const mockRefreshAuthSession = jest.fn<() => Promise<AuthServiceResult>>();
const mockUnenrollMfaFactor = jest.fn<(factorId: string) => Promise<AuthServiceResult>>();
const mockCopyTextToClipboard = jest.fn<(value: string) => Promise<boolean>>();

jest.mock('@/utils/clipboard', () => ({
  copyTextToClipboard: (value: string) => mockCopyTextToClipboard(value),
}));

jest.mock('@/services/auth.service', () => ({
  listMfaFactors: () => mockListMfaFactors(),
  reauthenticateWithPassword: (input: { email: string; password: string }) =>
    mockReauthenticateWithPassword(input),
  enrollTotpFactor: (input: { friendlyName?: string; issuer?: string }) =>
    mockEnrollTotpFactor(input),
  createMfaChallenge: (factorId: string) => mockCreateMfaChallenge(factorId),
  getMfaAssuranceLevel: () => mockGetMfaAssuranceLevel(),
  requiresMfaChallenge: (data: { currentLevel?: string | null; nextLevel?: string | null }) =>
    mockRequiresMfaChallenge(data),
  verifyMfaChallenge: (input: { factorId: string; challengeId: string; code: string }) =>
    mockVerifyMfaChallenge(input),
  refreshAuthSession: () => mockRefreshAuthSession(),
  unenrollMfaFactor: (factorId: string) => mockUnenrollMfaFactor(factorId),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { email: 'user@example.com' } }),
}));

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    SvgXml: ({ xml }: { xml: string }) => <View testID="svg-xml" accessibilityLabel={xml} />,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

describe('<TwoStepVerification />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauthenticateWithPassword.mockResolvedValue({ data: {}, error: null });
    mockEnrollTotpFactor.mockResolvedValue({
      data: {
        id: 'factor-new',
        type: 'totp',
        totp: {
          qr_code: '<svg />',
          secret: 'SECRET123',
          uri: 'otpauth://totp/Apotek',
        },
      },
      error: null,
    });
    mockCreateMfaChallenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mockGetMfaAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    });
    mockRequiresMfaChallenge.mockReturnValue(false);
    mockVerifyMfaChallenge.mockResolvedValue({ data: {}, error: null });
    mockRefreshAuthSession.mockResolvedValue({ data: {}, error: null });
    mockUnenrollMfaFactor.mockResolvedValue({ data: {}, error: null });
    mockCopyTextToClipboard.mockResolvedValue(true);
  });

  it('shows loading state while fetching factors', () => {
    mockListMfaFactors.mockReturnValue(new Promise(() => undefined));

    render(<TwoStepVerification />);

    expect(screen.getByLabelText('Memuat verifikasi')).not.toBeNull();
  });

  it('shows disabled state when no verified factors exist', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Nonaktif')).not.toBeNull();
    });

    expect(screen.getByText('Belum ada metode verifikasi yang aktif.')).not.toBeNull();
    expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
  });

  it('shows enabled state when verified factors exist', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: {
        totp: [
          { id: 'factor-1', friendly_name: 'Google Authenticator' },
          { id: 'factor-2', friendly_name: undefined },
        ],
      },
      error: null,
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Aktif')).not.toBeNull();
    });

    expect(screen.getByText('Google Authenticator')).not.toBeNull();
    expect(screen.getByText('Metode verifikasi tersimpan')).not.toBeNull();
    expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
  });

  it('shows error state with retry CTA', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: null,
      error: { message: 'Network error', name: 'MfaListFactorsError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat pengaturan verifikasi')).not.toBeNull();
    });

    expect(screen.getByText('Network error')).not.toBeNull();
    expect(screen.getByLabelText('Muat ulang pengaturan verifikasi')).not.toBeNull();
  });

  it('retries loading factors when retry button is pressed', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error', name: 'MfaListFactorsError' },
      })
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-1', friendly_name: 'Authy' }] },
        error: null,
      });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat pengaturan verifikasi')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Muat ulang pengaturan verifikasi'));

    await waitFor(() => {
      expect(screen.getByText('Aktif')).not.toBeNull();
    });

    expect(mockListMfaFactors).toHaveBeenCalledTimes(2);
  });

  it('renders product limitation copy', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada metode verifikasi yang aktif.')).not.toBeNull();
    });

    expect(
      screen.getByText(
        'Kode cadangan belum tersedia. Pastikan Anda tetap dapat membuka aplikasi autentikator.',
      ),
    ).not.toBeNull();
  });

  it('keeps body copy simple without duplicating the page header', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByText('Nonaktif')).not.toBeNull();
    });

    expect(screen.queryByText('Verifikasi 2 Langkah')).toBeNull();
    expect(screen.queryByText('Tambahkan lapisan keamanan saat masuk.')).toBeNull();
  });

  it('requires password re-auth before enrollment', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });
    mockReauthenticateWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', name: 'InvalidLoginCredentialsError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'wrong-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Password salah. Coba lagi.')).not.toBeNull();
    });

    expect(mockReauthenticateWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrong-password',
    });
    expect(mockEnrollTotpFactor).not.toHaveBeenCalled();
  });

  it('blocks second enrollment when a verified factor already exists', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-verified', friendly_name: 'Authy', status: 'verified' }] },
        error: null,
      });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Sudah aktif.')).not.toBeNull();
    });

    expect(screen.getByText('Aktif')).not.toBeNull();
    expect(mockEnrollTotpFactor).not.toHaveBeenCalled();
  });

  it('renders QR and manual secret fallback UI after enrollment starts', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Hubungkan aplikasi autentikator')).not.toBeNull();
    });

    expect(screen.getByTestId('mfa-qr-code')).not.toBeNull();
    expect(screen.getByText('SECRET123')).not.toBeNull();
    expect(screen.getByLabelText('Salin secret manual')).not.toBeNull();
    expect(screen.getByLabelText('Batalkan setup aktivasi')).not.toBeNull();
  });

  it('copies manual secret from the setup dialog', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByLabelText('Salin secret manual')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Salin secret manual'));

    await waitFor(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith('SECRET123');
      expect(screen.getByText('Secret disalin')).not.toBeNull();
      expect(screen.getByLabelText('Secret sudah disalin')).not.toBeNull();
    });
  });

  it('keeps setup open with manual copy guidance when clipboard is unavailable', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });
    mockCopyTextToClipboard.mockResolvedValue(false);

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByLabelText('Salin secret manual')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Salin secret manual'));

    await waitFor(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith('SECRET123');
      expect(screen.getByText('Gagal menyalin. Salin manual.')).not.toBeNull();
    });
  });

  it('completes enrollment and reloads enabled state', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          totp: [
            { id: 'factor-new', friendly_name: 'Metode verifikasi tersimpan', status: 'verified' },
          ],
        },
        error: null,
      });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByLabelText('Saya sudah menyalin secret')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Saya sudah menyalin secret'));

    await waitFor(() => {
      expect(screen.getByLabelText('Kode autentikator')).not.toBeNull();
    });

    fireEvent.changeText(screen.getByLabelText('Kode autentikator'), '123456');
    fireEvent.press(screen.getByLabelText('Aktifkan dengan kode autentikator'));

    await waitFor(() => {
      expect(screen.getByText('Aktif')).not.toBeNull();
    });

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
    expect(mockUnenrollMfaFactor).not.toHaveBeenCalled();
  });

  it('shows an error and stays in enrollment when session refresh fails after enrollment', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });
    mockRefreshAuthSession.mockResolvedValue({
      data: null,
      error: { message: 'Refresh failed', name: 'AuthError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByLabelText('Saya sudah menyalin secret')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Saya sudah menyalin secret'));

    await waitFor(() => {
      expect(screen.getByLabelText('Kode autentikator')).not.toBeNull();
    });

    fireEvent.changeText(screen.getByLabelText('Kode autentikator'), '123456');
    fireEvent.press(screen.getByLabelText('Aktifkan dengan kode autentikator'));

    await waitFor(() => {
      expect(screen.getByText('Sesi belum diperbarui. Coba lagi.')).not.toBeNull();
    });

    expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
    expect(mockListMfaFactors).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Kode autentikator')).not.toBeNull();
    expect(screen.getByText('Nonaktif')).not.toBeNull();
  });

  it('cleans up unverified factor when enrollment is cancelled', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Hubungkan aplikasi autentikator')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Batalkan setup aktivasi'));

    await waitFor(() => {
      expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-new');
    });
    expect(screen.getByText('Nonaktif')).not.toBeNull();
  });

  it('shows invalid authenticator code error without cleaning up enrollment', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });
    mockVerifyMfaChallenge.mockResolvedValue({
      data: null,
      error: { message: 'Invalid code', name: 'AuthError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Aktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Aktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk mengaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan aktivasi verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByLabelText('Saya sudah menyalin secret')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Saya sudah menyalin secret'));

    await waitFor(() => {
      expect(screen.getByLabelText('Kode autentikator')).not.toBeNull();
    });

    fireEvent.changeText(screen.getByLabelText('Kode autentikator'), '000000');
    fireEvent.press(screen.getByLabelText('Aktifkan dengan kode autentikator'));

    await waitFor(() => {
      expect(screen.getByText('Kode salah. Coba lagi.')).not.toBeNull();
    });

    expect(mockUnenrollMfaFactor).not.toHaveBeenCalled();
  });

  it('disables verification after password re-auth when session is already sufficient', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Nonaktif')).not.toBeNull();
    });

    expect(mockReauthenticateWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'valid-password',
    });
    expect(mockGetMfaAssuranceLevel).not.toHaveBeenCalled();
    expect(mockRequiresMfaChallenge).not.toHaveBeenCalled();
    expect(mockCreateMfaChallenge).not.toHaveBeenCalled();
    expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-1');
    expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
  });

  it('does not request an authenticator code while disabling verification', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { totp: [] }, error: null });
    mockGetMfaAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    });
    mockRequiresMfaChallenge.mockReturnValue(true);

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Nonaktif')).not.toBeNull();
    });

    expect(screen.queryByLabelText('Kode autentikator untuk menonaktifkan')).toBeNull();
    expect(mockGetMfaAssuranceLevel).not.toHaveBeenCalled();
    expect(mockRequiresMfaChallenge).not.toHaveBeenCalled();
    expect(mockCreateMfaChallenge).not.toHaveBeenCalled();
    expect(mockVerifyMfaChallenge).not.toHaveBeenCalled();
    expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-1');
    expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
  });

  it('shows password error during disable and does not unenroll', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
      error: null,
    });
    mockReauthenticateWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials', name: 'InvalidLoginCredentialsError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'wrong-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Password salah. Coba lagi.')).not.toBeNull();
    });

    expect(mockUnenrollMfaFactor).not.toHaveBeenCalled();
    expect(mockRefreshAuthSession).not.toHaveBeenCalled();
  });

  it('shows generic retry copy for disable password transport failures', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
      error: null,
    });
    mockReauthenticateWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Too many requests', name: 'ReauthenticateWithPasswordError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Gagal memverifikasi password. Coba lagi.')).not.toBeNull();
    });

    expect(mockUnenrollMfaFactor).not.toHaveBeenCalled();
    expect(mockRefreshAuthSession).not.toHaveBeenCalled();
  });

  it('disables only the selected factor when multiple factors exist', async () => {
    mockListMfaFactors
      .mockResolvedValueOnce({
        data: {
          totp: [
            { id: 'factor-1', friendly_name: 'Authy', status: 'verified' },
            { id: 'factor-2', friendly_name: 'Google Authenticator', status: 'verified' },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
        error: null,
      });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.press(screen.getByLabelText('Pilih aplikasi autentikator Google Authenticator'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(mockUnenrollMfaFactor).toHaveBeenCalledWith('factor-2');
    });

    expect(mockUnenrollMfaFactor).not.toHaveBeenCalledWith('factor-1');
    expect(screen.getByText('Authy')).not.toBeNull();
  });

  it('shows failed unenroll error and leaves factor list unchanged', async () => {
    mockListMfaFactors.mockResolvedValue({
      data: { totp: [{ id: 'factor-1', friendly_name: 'Authy', status: 'verified' }] },
      error: null,
    });
    mockUnenrollMfaFactor.mockResolvedValue({
      data: null,
      error: { message: 'Unenroll failed', name: 'AuthError' },
    });

    render(<TwoStepVerification />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah')).not.toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Nonaktifkan verifikasi 2 langkah'));
    fireEvent.changeText(
      screen.getByLabelText('Password akun untuk menonaktifkan verifikasi 2 langkah'),
      'valid-password',
    );
    fireEvent.press(screen.getByLabelText('Lanjutkan penonaktifan verifikasi 2 langkah'));

    await waitFor(() => {
      expect(screen.getByText('Unenroll failed')).not.toBeNull();
    });

    expect(screen.getByText('Aktif')).not.toBeNull();
    expect(screen.getByText('Authy')).not.toBeNull();
    expect(mockRefreshAuthSession).not.toHaveBeenCalled();
    expect(mockListMfaFactors).toHaveBeenCalledTimes(1);
  });
});
