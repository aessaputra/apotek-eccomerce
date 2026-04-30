import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import RootLayout from '@/app/_layout';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockBootstrapNotificationsAsync = jest.fn();
const mockGetExpoNotificationsModuleAsync = jest.fn();
const mockHasNativeNotificationSupport = jest.fn();
const mockLoadImages = jest.fn();
const mockLoadFonts = jest.fn();
const mockResponseSubscriptionRemove = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockUseAppSlice = jest.fn();
const mockUseSegments = jest.fn<() => string[]>();
const mockUseLinkingURL = jest.fn<() => string | null>();
const mockGetInitialURL = jest.fn<() => Promise<string | null>>();

jest.mock('@/tamagui-web.css', () => ({}), { virtual: true });

jest.mock('expo-router', () => {
  const MockStack = Object.assign(
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
    {
      Screen: () => null,
    },
  );

  return {
    Stack: MockStack,
    useRouter: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
    useSegments: () => mockUseSegments(),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: (listener: (response: unknown) => void) =>
    mockAddNotificationResponseReceivedListener(listener),
  getLastNotificationResponseAsync: () => mockGetLastNotificationResponseAsync(),
}));

jest.mock('expo-linking', () => ({
  getInitialURL: () => mockGetInitialURL(),
  useLinkingURL: () => mockUseLinkingURL(),
}));

jest.mock('@/providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/layouts/WelcomeSheet', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => mockUseAppSlice(),
}));

jest.mock('@/utils/config', () => ({
  __esModule: true,
  default: { env: 'production' },
}));

jest.mock('@/utils/fonts', () => ({
  loadFonts: () => mockLoadFonts(),
}));

jest.mock('@/utils/images', () => ({
  loadImages: () => mockLoadImages(),
}));

jest.mock('@/utils/notifications', () => ({
  bootstrapNotificationsAsync: () => mockBootstrapNotificationsAsync(),
  getExpoNotificationsModuleAsync: () => mockGetExpoNotificationsModuleAsync(),
  hasNativeNotificationSupport: () => mockHasNativeNotificationSupport(),
}));

function createNotificationResponse(data: Record<string, unknown>) {
  return {
    notification: {
      request: {
        content: { data },
        identifier: 'request-1',
      },
    },
  };
}

describe('RootLayout notification lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: true }));
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(() => null);
    mockGetInitialURL.mockImplementation(async () => null);
    mockHasNativeNotificationSupport.mockImplementation(() => true);
    mockBootstrapNotificationsAsync.mockImplementation(async () => undefined);
    mockGetExpoNotificationsModuleAsync.mockImplementation(async () => ({
      addNotificationResponseReceivedListener: (listener: (response: unknown) => void) =>
        mockAddNotificationResponseReceivedListener(listener),
      getLastNotificationResponseAsync: () => mockGetLastNotificationResponseAsync(),
    }));
    mockLoadImages.mockImplementation(async () => undefined);
    mockLoadFonts.mockImplementation(async () => undefined);
    mockGetLastNotificationResponseAsync.mockImplementation(async () => null);
    mockAddNotificationResponseReceivedListener.mockImplementation(() => ({
      remove: mockResponseSubscriptionRemove,
    }));
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('bootstraps notifications before registering the response listener and routes valid taps', async () => {
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/track-shipment/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockBootstrapNotificationsAsync).toHaveBeenCalled();
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/orders/track-shipment/[orderId]',
        params: { orderId: 'order-42' },
      });
    });

    expect(mockBootstrapNotificationsAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddNotificationResponseReceivedListener.mock.invocationCallOrder[0],
    );
  });

  it('falls back to /notifications when the notification payload is unsupported', async () => {
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notifications');
    });
  });

  it('does not let a stale notification response interrupt logged-in reset-password users', async () => {
    mockUseSegments.mockImplementation(() => ['(auth)', 'reset-password']);
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockBootstrapNotificationsAsync).toHaveBeenCalled();
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not let a stale notification response interrupt an active reset-password deep link', async () => {
    mockUseSegments.mockImplementation(() => ['(tabs)', 'notifications']);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('routes active reset-password deep links to the recovery scene before home redirects', async () => {
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );

    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/reset-password?code=recovery-code');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });

  it('does not replay a handled reset-password deep link after returning to login', async () => {
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );

    const { rerender } = render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/reset-password?code=recovery-code');
    expect(mockReplace).toHaveBeenCalledTimes(1);

    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: false }));
    mockUseSegments.mockImplementation(() => ['(auth)', 'login']);

    rerender(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });

  it('does not replay a handled reset-password deep link after login reaches Home', async () => {
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );

    const { rerender } = render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/reset-password?code=recovery-code');
    expect(mockReplace).toHaveBeenCalledTimes(1);

    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: true }));
    mockUseSegments.mockImplementation(() => ['(tabs)', 'home']);

    rerender(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });

  it('routes a different reset-password deep link after a previous link was handled', async () => {
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );

    const { rerender } = render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/reset-password?code=recovery-code');
    expect(mockReplace).toHaveBeenCalledTimes(1);

    mockUseSegments.mockImplementation(() => ['(tabs)', 'home']);
    mockUseLinkingURL.mockImplementation(
      () => 'apotek-ecommerce:///reset-password?code=fresh-recovery-code',
    );

    rerender(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenLastCalledWith('/(auth)/reset-password?code=fresh-recovery-code');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });

  it('preserves hash recovery params when routing reset-password deep links', async () => {
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(
      () =>
        'apotek-ecommerce:///reset-password#access_token=token-1&refresh_token=token-2&type=recovery',
    );

    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockReplace).toHaveBeenCalledWith(
      '/(auth)/reset-password?access_token=token-1&refresh_token=token-2&type=recovery',
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });

  it('does not let a stale notification response interrupt logged-in Google OAuth callbacks', async () => {
    mockUseSegments.mockImplementation(() => ['google-auth']);
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not let a stale notification response interrupt an active Google OAuth deep link', async () => {
    mockUseSegments.mockImplementation(() => ['(tabs)', 'notifications']);
    mockUseLinkingURL.mockImplementation(() => 'apotek-ecommerce://google-auth?code=oauth-code');
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not process stale notification responses before a cold-start reset link is visible', async () => {
    mockUseSegments.mockImplementation(() => ['(tabs)', 'notifications']);
    mockUseLinkingURL.mockImplementation(() => null);
    mockGetInitialURL.mockImplementation(
      async () => 'apotek-ecommerce:///reset-password?code=recovery-code',
    );
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetInitialURL).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockGetLastNotificationResponseAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not process stale notification responses before a cold-start Google OAuth link is visible', async () => {
    mockUseSegments.mockImplementation(() => ['(tabs)', 'notifications']);
    mockUseLinkingURL.mockImplementation(() => null);
    mockGetInitialURL.mockImplementation(
      async () => 'apotek-ecommerce://google-auth?code=oauth-code',
    );
    mockGetLastNotificationResponseAsync.mockImplementation(async () =>
      createNotificationResponse({
        type: 'order_shipped',
        cta_route: 'orders/order-detail/[orderId]',
        data: { orderId: 'order-42', shipmentStage: 'shipped' },
      }),
    );

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockGetInitialURL).toHaveBeenCalled();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockGetLastNotificationResponseAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/notifications');
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('routes live notification tap responses from the listener after bootstrap completes', async () => {
    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    const listener = mockAddNotificationResponseReceivedListener.mock.calls[0]?.[0] as
      | ((response: ReturnType<typeof createNotificationResponse>) => void)
      | undefined;

    expect(listener).toBeDefined();

    act(() => {
      listener?.(
        createNotificationResponse({
          type: 'order_completed',
          cta_route: 'orders/order-detail/[orderId]',
          data: { orderId: 'order-77' },
        }),
      );
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: 'order-77' },
      });
    });
  });

  it('routes live notification taps after Google OAuth settles even if the last linking URL is retained', async () => {
    mockUseSegments.mockImplementation(() => ['(tabs)', 'home']);
    mockUseLinkingURL.mockImplementation(() => 'apotek-ecommerce://google-auth?code=oauth-code');

    render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    const listener = mockAddNotificationResponseReceivedListener.mock.calls[0]?.[0] as
      | ((response: ReturnType<typeof createNotificationResponse>) => void)
      | undefined;

    expect(listener).toBeDefined();

    act(() => {
      listener?.(
        createNotificationResponse({
          type: 'order_completed',
          cta_route: 'orders/order-detail/[orderId]',
          data: { orderId: 'order-88' },
        }),
      );
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/orders/order-detail/[orderId]',
        params: { orderId: 'order-88' },
      });
    });
  });

  it('removes the notification response listener on cleanup', async () => {
    const view = render(<RootLayout />);

    await Promise.resolve();

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    view.unmount();

    expect(mockResponseSubscriptionRemove).toHaveBeenCalled();
  });
});

describe('RootLayout auth redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSegments.mockImplementation(() => []);
    mockUseLinkingURL.mockImplementation(() => null);
    mockGetInitialURL.mockImplementation(async () => null);
    mockHasNativeNotificationSupport.mockImplementation(() => false);
    mockLoadImages.mockImplementation(async () => undefined);
    mockLoadFonts.mockImplementation(async () => undefined);
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('navigates logged-in login route users to /home', async () => {
    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: true }));
    mockUseSegments.mockImplementation(() => ['(auth)', 'login']);

    render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('does not navigate logged-in reset-password route users to /home', async () => {
    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: true }));
    mockUseSegments.mockImplementation(() => ['(auth)', 'reset-password']);

    render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  it('replaces logged-out protected cart users with the login route', async () => {
    mockUseAppSlice.mockImplementation(() => ({ checked: true, loggedIn: false }));
    mockUseSegments.mockImplementation(() => ['cart']);

    render(<RootLayout />);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('/home');
  });
});
