import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
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
    useSegments: () => [],
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

    await Promise.resolve();

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
