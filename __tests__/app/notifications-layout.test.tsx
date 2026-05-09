import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import NotificationsStackLayout from '@/app/(tabs)/notifications/_layout';

const mockSendTestNotification = jest.fn(async () => true);
const mockMarkAllAsRead = jest.fn(async () => true);
const mockStackScreen = jest.fn();

jest.mock('expo-router', () => {
  const Stack = Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, {
    Screen: (props: unknown) => {
      mockStackScreen(props);
      return null;
    },
  });

  return { Stack };
});

jest.mock('tamagui', () => {
  const ReactNative = jest.requireActual('react-native') as typeof import('react-native');

  return {
    Button: ({
      children,
      icon,
      onPress,
      disabled,
      accessibilityLabel,
      accessibilityState,
      'aria-label': ariaLabel,
    }: {
      children: React.ReactNode;
      icon?: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      accessibilityState?: React.ComponentProps<typeof ReactNative.Pressable>['accessibilityState'];
      'aria-label'?: string;
    }) => (
      <ReactNative.Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? ariaLabel}
        accessibilityState={accessibilityState ?? { disabled }}
        disabled={disabled}
        onPress={onPress}>
        {icon}
        <ReactNative.Text>{children}</ReactNative.Text>
      </ReactNative.Pressable>
    ),
    XStack: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
    useTheme: () => ({}),
  };
});

jest.mock('@/components/layouts/HeaderCartIcon', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/icons', () => {
  const ReactNative = jest.requireActual('react-native') as typeof import('react-native');

  return {
    SendIcon: ({ testID }: { testID?: string }) => (
      <ReactNative.Text testID={testID}>Send</ReactNative.Text>
    ),
  };
});

jest.mock('@/components/elements/AppAlertDialog', () => {
  const ReactNative = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({
      open,
      title,
      description,
    }: {
      open: boolean;
      title: string;
      description: string;
    }) =>
      open ? (
        <ReactNative.View accessibilityRole="alert">
          <ReactNative.Text>{title}</ReactNative.Text>
          <ReactNative.Text>{description}</ReactNative.Text>
        </ReactNative.View>
      ) : null,
  };
});

jest.mock('@/utils/theme', () => ({
  getStackHeaderOptions: () => ({}),
}));

jest.mock('@/hooks/withAuthGuard', () => ({
  withAuthGuard: (Component: React.ComponentType) => Component,
}));

jest.mock('@/providers', () => ({
  useNotificationsContext: () => ({
    unreadCount: 0,
    markAllAsRead: mockMarkAllAsRead,
    sendTestNotification: mockSendTestNotification,
    isSendingTestNotification: false,
  }),
}));

describe('notifications stack layout', () => {
  beforeEach(() => {
    mockSendTestNotification.mockClear();
    mockMarkAllAsRead.mockClear();
    mockStackScreen.mockClear();
  });

  it('places the test notification action on the left side of the Notifikasi header', async () => {
    render(<NotificationsStackLayout />);

    const screenProps = mockStackScreen.mock.calls[0]?.[0] as {
      options: { headerLeft: () => React.ReactNode; headerRight: () => React.ReactNode };
    };

    const { getByLabelText, getByTestId, getByText } = render(
      <>{screenProps.options.headerLeft()}</>,
    );

    expect(getByTestId('test-notification-button-icon')).toBeTruthy();
    expect(getByLabelText('Kirim tes notifikasi')).toBeTruthy();
    fireEvent.press(getByLabelText('Kirim tes notifikasi'));

    await waitFor(() => {
      expect(mockSendTestNotification).toHaveBeenCalledTimes(1);
      expect(getByText('Tes Notifikasi Dikirim')).toBeTruthy();
      expect(
        getByText(
          'Permintaan push notifikasi tes sudah dikirim ke perangkat ini. Tidak ada kartu notifikasi yang dibuat di daftar.',
        ),
      ).toBeTruthy();
    });

    expect(screenProps.options.headerRight).toEqual(expect.any(Function));
  });

  it('shows a failure dialog when the test notification request fails', async () => {
    mockSendTestNotification.mockResolvedValueOnce(false);
    render(<NotificationsStackLayout />);

    const screenProps = mockStackScreen.mock.calls[0]?.[0] as {
      options: { headerLeft: () => React.ReactNode; headerRight: () => React.ReactNode };
    };

    const { getByLabelText, getByText } = render(<>{screenProps.options.headerLeft()}</>);

    fireEvent.press(getByLabelText('Kirim tes notifikasi'));

    await waitFor(() => {
      expect(mockSendTestNotification).toHaveBeenCalledTimes(1);
      expect(getByText('Tes Notifikasi Gagal')).toBeTruthy();
      expect(
        getByText(
          'Tes push notifikasi gagal dikirim. Periksa izin notifikasi perangkat, lalu coba lagi.',
        ),
      ).toBeTruthy();
    });
  });
});
