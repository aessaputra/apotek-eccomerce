import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import ForgotPassword from '@/scenes/auth/ForgotPassword';
import {
  AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE,
  AuthErrorCode,
} from '@/constants/auth.errors';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
type AuthSceneResult = Promise<unknown>;

const mockRequestPasswordReset = jest.fn<(...args: unknown[]) => AuthSceneResult>();

jest.mock('expo-router', () => {
  const ReactFromMock = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      navigate: mockNavigate,
    }),
    Link: ({
      children,
      href,
    }: {
      children: React.ReactElement<{ onPress?: () => void }>;
      href: string;
    }) => ReactFromMock.cloneElement(children, { onPress: () => mockPush(href) }),
  };
});

jest.mock('@/services/auth.service', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

describe('<ForgotPassword />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockRequestPasswordReset.mockReset();
    mockRequestPasswordReset.mockImplementation(async () => ({ data: {}, error: null }));
  });

  it('renders title, privacy copy, one email input, submit, and Login CTA', () => {
    render(<ForgotPassword />);

    expect(screen.getByText('Lupa Password')).toBeTruthy();
    expect(screen.getByText(/kami akan mengirim tautan/i)).toBeTruthy();
    expect(screen.getAllByTestId('email-input')).toHaveLength(1);
    expect(screen.getByLabelText('Kirim Tautan Reset')).toBeTruthy();
    expect(screen.getByLabelText('Kembali ke Login')).toBeTruthy();
  });

  it('shows the required-email message for an empty form without calling the service', () => {
    render(<ForgotPassword />);

    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    expect(screen.getByText('Email wajib diisi.')).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows the invalid-email message before calling the service', () => {
    render(<ForgotPassword />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    expect(screen.getByText('Format email tidak valid.')).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it('sets the submit button loading state and disables duplicate submissions while pending', async () => {
    let resolveResetRequest: (value: unknown) => void = () => undefined;
    mockRequestPasswordReset.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveResetRequest = resolve;
        }),
    );
    render(<ForgotPassword />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
      expect(screen.getByLabelText('Kirim Tautan Reset').props.disabled).toBe(true);
    });

    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));
    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);

    resolveResetRequest({ data: {}, error: null });

    expect(await screen.findByText(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE)).toBeTruthy();
  });

  it('shows generic success copy for successful reset requests using the trimmed email', async () => {
    render(<ForgotPassword />);

    fireEvent.changeText(screen.getByTestId('email-input'), '  user@example.com  ');
    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
    });
    expect(await screen.findByText(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE)).toBeTruthy();
  });

  it('shows the same generic success copy for privacy-safe missing-account results', async () => {
    mockRequestPasswordReset.mockImplementationOnce(async () => ({
      data: null,
      error: { code: AuthErrorCode.USER_NOT_FOUND, message: AuthErrorCode.USER_NOT_FOUND },
    }));
    render(<ForgotPassword />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'private@example.com');
    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    expect(await screen.findByText(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE)).toBeTruthy();
    expect(screen.queryByText('Akun tidak ditemukan. Silakan daftar terlebih dahulu.')).toBeNull();
  });

  it('shows actionable retry copy for rate-limited reset requests', async () => {
    mockRequestPasswordReset.mockImplementationOnce(async () => ({
      data: null,
      error: {
        code: AuthErrorCode.OVER_EMAIL_SEND_RATE_LIMIT,
        message: AuthErrorCode.OVER_EMAIL_SEND_RATE_LIMIT,
      },
    }));
    render(<ForgotPassword />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'busy@example.com');
    fireEvent.press(screen.getByLabelText('Kirim Tautan Reset'));

    expect(
      await screen.findByText('Terlalu banyak permintaan email. Silakan tunggu beberapa menit.'),
    ).toBeTruthy();
    expect(screen.queryByText(AUTH_FORGOT_PASSWORD_GENERIC_SUCCESS_MESSAGE)).toBeNull();
  });

  it('navigates back to Login from the form card CTA', () => {
    render(<ForgotPassword />);

    fireEvent.press(screen.getByLabelText('Kembali ke Login'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});
