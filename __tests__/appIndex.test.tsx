import { test, expect, jest } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import { useAppSlice } from '@/slices';
import Index from '@/app/index';

jest.mock('expo-router', () => ({
  __esModule: true,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>{`redirect:${href}`}</Text>;
  },
}));

jest.mock('@/slices', () => ({
  __esModule: true,
  useAppSlice: jest.fn(),
}));

const mockedUseAppSlice = jest.mocked(useAppSlice);

describe('<Index />', () => {
  test('renders loading state while auth is not checked', async () => {
    mockedUseAppSlice.mockReturnValue({ checked: false, loggedIn: false } as ReturnType<
      typeof useAppSlice
    >);

    render(<Index />);

    expect(screen.toJSON()).toBeTruthy();
  });

  test('redirects unauthenticated users to login', async () => {
    mockedUseAppSlice.mockReturnValue({ checked: true, loggedIn: false } as ReturnType<
      typeof useAppSlice
    >);

    render(<Index />);

    expect(screen.getByText('redirect:/(auth)/login')).not.toBeNull();
  });

  test('redirects authenticated users to /home', async () => {
    mockedUseAppSlice.mockReturnValue({ checked: true, loggedIn: true } as ReturnType<
      typeof useAppSlice
    >);

    render(<Index />);

    expect(screen.getByText('redirect:/home')).not.toBeNull();
  });
});
