import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import VerifyMfa from '@/scenes/auth/VerifyMfa';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();

const mockListMfaFactors = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateMfaChallenge = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockVerifyMfaChallenge = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRefreshAuthSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDispatch = jest.fn();
const mockSetAuthPhase = jest.fn((payload: string) => ({ type: 'setAuthPhase', payload }));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    navigate: mockNavigate,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/services/auth.service', () => ({
  listMfaFactors: (...args: unknown[]) => mockListMfaFactors(...args),
  createMfaChallenge: (...args: unknown[]) => mockCreateMfaChallenge(...args),
  verifyMfaChallenge: (...args: unknown[]) => mockVerifyMfaChallenge(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  refreshAuthSession: (...args: unknown[]) => mockRefreshAuthSession(...args),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    dispatch: mockDispatch,
    setAuthPhase: mockSetAuthPhase,
  }),
}));

const SINGLE_FACTOR_DATA = {
  data: {
    totp: [{ id: 'factor-1', type: 'totp', status: 'verified' }],
  },
  error: null,
};

const MULTI_FACTOR_DATA = {
  data: {
    totp: [
      { id: 'factor-1', type: 'totp', status: 'verified' },
      { id: 'factor-2', type: 'totp', status: 'verified' },
    ],
  },
  error: null,
};

const CHALLENGE_DATA = {
  data: { id: 'challenge-1' },
  error: null,
};

describe('<VerifyMfa />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockListMfaFactors.mockReset();
    mockCreateMfaChallenge.mockReset();
    mockVerifyMfaChallenge.mockReset();
    mockSignOut.mockReset();
    mockRefreshAuthSession.mockReset();
    mockDispatch.mockClear();
    mockSetAuthPhase.mockClear();
    mockRefreshAuthSession.mockImplementation(async () => ({ data: {}, error: null }));
  });

  describe('single factor auto-challenge and success', () => {
    it('auto-challenges the single verified TOTP factor and verifies successfully', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => SINGLE_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);
      mockVerifyMfaChallenge.mockImplementationOnce(async () => ({
        data: { session: 'verified' },
        error: null,
      }));

      render(<VerifyMfa />);

      await waitFor(() => {
        expect(mockListMfaFactors).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
      });

      const codeInput = screen.getByLabelText('Kode verifikasi');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(screen.getByLabelText('Lanjutkan verifikasi'));

      await waitFor(() => {
        expect(mockVerifyMfaChallenge).toHaveBeenCalledWith({
          factorId: 'factor-1',
          challengeId: 'challenge-1',
          code: '123456',
        });
      });

      await waitFor(() => {
        expect(mockRefreshAuthSession).toHaveBeenCalledTimes(1);
        expect(mockSetAuthPhase).toHaveBeenCalledWith('authenticated');
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'setAuthPhase',
          payload: 'authenticated',
        });
        expect(mockReplace).toHaveBeenCalledWith('/home');
      });
    });

    it('shows an error when session refresh fails after successful verification', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => SINGLE_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);
      mockVerifyMfaChallenge.mockImplementationOnce(async () => ({
        data: { session: 'verified' },
        error: null,
      }));
      mockRefreshAuthSession.mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'Refresh failed' },
      }));

      render(<VerifyMfa />);

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
      });

      const codeInput = screen.getByLabelText('Kode verifikasi');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(screen.getByLabelText('Lanjutkan verifikasi'));

      expect(await screen.findByText('Gagal memperbarui sesi. Silakan coba lagi.')).toBeTruthy();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('invalid code shows error', () => {
    it('shows error message when verification fails', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => SINGLE_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);
      mockVerifyMfaChallenge.mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'Invalid code' },
      }));

      render(<VerifyMfa />);

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
      });

      const codeInput = screen.getByLabelText('Kode verifikasi');
      fireEvent.changeText(codeInput, '000000');
      fireEvent.press(screen.getByLabelText('Lanjutkan verifikasi'));

      expect(await screen.findByText('Kode verifikasi tidak valid. Coba lagi.')).toBeTruthy();
    });
  });

  describe('cancel signs out and returns to login', () => {
    it('calls signOut and navigates to login on cancel', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => SINGLE_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);
      mockSignOut.mockImplementationOnce(async () => ({ error: null }));

      render(<VerifyMfa />);

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
      });

      fireEvent.press(screen.getByLabelText('Kembali ke login'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });

    it('navigates to login even if signOut fails', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => SINGLE_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);
      mockSignOut.mockImplementationOnce(async () => {
        throw new Error('Sign out failed');
      });

      render(<VerifyMfa />);

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalledWith('factor-1');
      });

      fireEvent.press(screen.getByLabelText('Kembali ke login'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
      });
    });
  });

  describe('multiple factor selection', () => {
    it('shows factor selection when multiple verified TOTP factors exist', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => MULTI_FACTOR_DATA);

      render(<VerifyMfa />);

      expect(await screen.findByText('Pilih aplikasi autentikator')).toBeTruthy();
      expect(screen.getAllByText('Aplikasi Autentikator').length).toBe(2);
    });

    it('challenges the selected factor when user picks one', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => MULTI_FACTOR_DATA);
      mockCreateMfaChallenge.mockImplementationOnce(async () => CHALLENGE_DATA);

      render(<VerifyMfa />);

      expect(await screen.findByText('Pilih aplikasi autentikator')).toBeTruthy();

      const authButtons = screen.getAllByText('Aplikasi Autentikator');
      fireEvent.press(authButtons[0]);

      await waitFor(() => {
        expect(mockCreateMfaChallenge).toHaveBeenCalled();
      });
    });
  });

  describe('missing factor error', () => {
    it('shows error when no verified TOTP factors exist', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => ({
        data: { totp: [] },
        error: null,
      }));

      render(<VerifyMfa />);

      expect(
        await screen.findByText('Verifikasi 2 langkah belum siap. Silakan masuk ulang.'),
      ).toBeTruthy();
    });

    it('shows error when listMfaFactors returns an error', async () => {
      mockListMfaFactors.mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'Network error' },
      }));

      render(<VerifyMfa />);

      expect(
        await screen.findByText('Verifikasi 2 langkah belum siap. Silakan masuk ulang.'),
      ).toBeTruthy();
    });
  });
});
