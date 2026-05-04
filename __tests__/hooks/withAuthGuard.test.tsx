import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { withAuthGuard } from '@/hooks/withAuthGuard';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockUseAppSlice = jest.fn();
jest.mock('@/slices', () => ({
  useAppSlice: () => mockUseAppSlice(),
}));

function ProtectedScreen() {
  return <Text testID="protected-screen">Protected</Text>;
}

describe('withAuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders wrapped component when auth is fully authenticated', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'authenticated' });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { getByTestId } = render(<Guarded />);

    expect(getByTestId('protected-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not render wrapped component while auth is initializing', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'initializing' });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not render wrapped component while checking MFA', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'checking-mfa' });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('redirects when auth phase is signed-out', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'signed-out' });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  test('uses custom redirect path', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'signed-out' });
    const Guarded = withAuthGuard(ProtectedScreen, '/custom-login');

    render(<Guarded />);

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/custom-login');
  });

  test('blocks protected content and redirects to verify MFA when a challenge is pending', () => {
    mockUseAppSlice.mockReturnValue({ authPhase: 'requires-mfa' });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/verify-mfa');
  });
});
