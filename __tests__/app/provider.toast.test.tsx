import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Provider from '@/providers/Provider';

const mockUseToastState = jest.fn();
const mockToastViewportProps = jest.fn();
const mockToastProviderProps = jest.fn();

jest.mock('@tamagui/toast', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text, View } = jest.requireActual('react-native') as typeof import('react-native');

  function ToastProvider({ children, ...props }: { children: React.ReactNode }) {
    mockToastProviderProps(props);

    return <View testID="toast-provider">{children}</View>;
  }

  function ToastViewport(props: Record<string, unknown>) {
    mockToastViewportProps(props);
    return <View testID="toast-viewport" />;
  }

  const Toast = ({ children }: { children: React.ReactNode }) => (
    <View testID="current-toast">{children}</View>
  );
  function ToastTitle({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>;
  }

  function ToastDescription({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>;
  }

  Toast.Title = ToastTitle;
  Toast.Description = ToastDescription;

  return {
    Toast,
    ToastProvider,
    ToastViewport,
    useToastState: () => mockUseToastState(),
  };
});

jest.mock('react-redux', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    Provider: ({ children }: { children: React.ReactNode }) => (
      <View testID="redux-provider">{children}</View>
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 24 },
    },
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 24 }),
  };
});

describe('<Provider /> toast host', () => {
  beforeEach(() => {
    mockToastProviderProps.mockClear();
    mockToastViewportProps.mockClear();
    mockUseToastState.mockReset();
    mockUseToastState.mockReturnValue({
      id: 'toast-1',
      title: 'Produk ditambahkan ke keranjang.',
      message: 'Paracetamol sudah ada di keranjang.',
      duration: 3000,
      isHandledNatively: false,
      type: 'background',
    });
  });

  it('renders children, current toast content, and a safe-area-aware viewport', () => {
    render(
      <Provider>
        <Text>Konten aplikasi</Text>
      </Provider>,
    );

    expect(screen.getByText('Konten aplikasi')).toBeTruthy();
    expect(screen.getByText('Produk ditambahkan ke keranjang.')).toBeTruthy();
    expect(screen.getByText('Paracetamol sudah ada di keranjang.')).toBeTruthy();
    expect(screen.getByTestId('toast-viewport')).toBeTruthy();
    expect(mockToastProviderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 3000,
        label: 'Notifikasi',
        native: 'mobile',
        swipeDirection: 'horizontal',
      }),
    );
    expect(mockToastViewportProps).toHaveBeenCalledWith(
      expect.objectContaining({
        bottom: 120,
        label: 'Notifikasi aplikasi ({hotkey})',
        portalToRoot: true,
      }),
    );
  });

  it('does not render custom toast content when native toast handled it', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-native',
      title: 'Native toast',
      isHandledNatively: true,
    });

    render(
      <Provider>
        <Text>Konten aplikasi</Text>
      </Provider>,
    );

    expect(screen.getByText('Konten aplikasi')).toBeTruthy();
    expect(screen.queryByText('Native toast')).toBeNull();
  });
});
