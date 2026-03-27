import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { withAuthGuard } from './withAuthGuard';

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

  test('renders wrapped component when auth is checked and logged in', () => {
    mockUseAppSlice.mockReturnValue({ checked: true, loggedIn: true });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { getByTestId } = render(<Guarded />);

    expect(getByTestId('protected-screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('does not render wrapped component while auth check is pending', () => {
    mockUseAppSlice.mockReturnValue({ checked: false, loggedIn: false });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('redirects when auth check is complete and user is logged out', () => {
    mockUseAppSlice.mockReturnValue({ checked: true, loggedIn: false });
    const Guarded = withAuthGuard(ProtectedScreen);

    const { queryByTestId } = render(<Guarded />);

    expect(queryByTestId('protected-screen')).toBeNull();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  test('uses custom redirect path', () => {
    mockUseAppSlice.mockReturnValue({ checked: true, loggedIn: false });
    const Guarded = withAuthGuard(ProtectedScreen, '/custom-login');

    render(<Guarded />);

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/custom-login');
  });
});
