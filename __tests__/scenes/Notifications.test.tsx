import React from 'react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import Notifications from '@/scenes/notifications/Notifications';
import type { UseNotificationsReturn } from '@/hooks/useNotifications';
import type { NotificationRow } from '@/types/notification';
import { Linking } from 'react-native';

const mockPush = jest.fn();
const mockUseNotifications = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

function createNotification(id: string, overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id,
    user_id: 'user-1',
    type: 'order_completed',
    title: `Notifikasi ${id}`,
    body: `Isi notifikasi ${id}`,
    cta_route: 'orders/order-detail/[orderId]',
    data: { orderId: `order-${id}` },
    priority: 'high',
    source_event_key: `event-${id}`,
    read_at: null,
    created_at: `2026-04-${id.padStart(2, '0')}T10:00:00.000Z`,
    ...overrides,
  };
}

function createHookState(overrides: Partial<UseNotificationsReturn> = {}): UseNotificationsReturn {
  return {
    items: [],
    status: 'empty',
    error: null,
    unreadCount: 0,
    isLoading: false,
    isRefreshing: false,
    permissionStatus: {
      status: 'idle',
      syncStatus: 'updated',
      canRequest: false,
      isSupported: true,
      didPrompt: true,
      isRequesting: false,
      error: null,
    },
    realtimeState: 'connected',
    refresh: jest.fn(async () => undefined),
    markAsRead: jest.fn(async () => true),
    markAllAsRead: jest.fn(async () => true),
    requestPermission: jest.fn(async () => true),
    ...overrides,
  };
}

const deniedPermissionStatus =
  'denied' as unknown as UseNotificationsReturn['permissionStatus']['status'];

describe('<Notifications />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseNotifications.mockReset();
    mockUseNotifications.mockReturnValue(createHookState());
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  });

  test('loads notifications for the signed-in user', () => {
    render(<Notifications />);

    expect(mockUseNotifications).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  test('renders loading state', () => {
    mockUseNotifications.mockReturnValue(
      createHookState({
        status: 'loading',
        isLoading: true,
      }),
    );

    render(<Notifications />);

    expect(screen.getByText('Memuat notifikasi...')).not.toBeNull();
  });

  test('renders retryable error state', () => {
    const refresh = jest.fn(async () => undefined);
    mockUseNotifications.mockReturnValue(
      createHookState({
        status: 'error',
        error: 'Jaringan sedang bermasalah.',
        refresh,
      }),
    );

    render(<Notifications />);

    expect(screen.getByText('Gagal memuat notifikasi')).not.toBeNull();
    expect(screen.getByText('Jaringan sedang bermasalah.')).not.toBeNull();

    fireEvent.press(screen.getByText('Coba Lagi'));

    expect(refresh).toHaveBeenCalled();
  });

  test('auto-opens the permission dialog once when permission becomes requestable without rendering a duplicate inline reminder', async () => {
    let hookState = createHookState();
    mockUseNotifications.mockImplementation(() => hookState);

    const { rerender } = render(<Notifications />);

    expect(screen.queryByText('Nanti')).toBeNull();
    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();

    hookState = createHookState({
      permissionStatus: {
        status: 'idle',
        syncStatus: 'permission_not_granted',
        canRequest: true,
        isSupported: true,
        didPrompt: false,
        isRequesting: false,
        error: null,
      },
    });

    rerender(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Nanti')).not.toBeNull();
    });

    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();

    fireEvent.press(screen.getByText('Nanti'));

    await waitFor(() => {
      expect(screen.queryByText('Nanti')).toBeNull();
    });

    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();

    hookState = createHookState();
    rerender(<Notifications />);

    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();

    hookState = createHookState({
      permissionStatus: {
        status: 'idle',
        syncStatus: 'permission_not_granted',
        canRequest: true,
        isSupported: true,
        didPrompt: true,
        isRequesting: false,
        error: null,
      },
    });
    rerender(<Notifications />);

    expect(screen.queryByText('Nanti')).toBeNull();
    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();
  });

  test('requests permission from the dialog confirm action', async () => {
    const requestPermission = jest.fn(async () => true);
    mockUseNotifications.mockReturnValue(
      createHookState({
        permissionStatus: {
          status: 'idle',
          syncStatus: 'permission_not_granted',
          canRequest: true,
          isSupported: true,
          didPrompt: false,
          isRequesting: false,
          error: null,
        },
        requestPermission,
      }),
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Aktifkan Sekarang')).not.toBeNull();
    });

    fireEvent.press(screen.getByText('Aktifkan Sekarang'));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalled();
    });
  });

  test('opens device settings from the permission dialog after notification permission is denied', async () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const requestPermission = jest.fn(async () => true);

    mockUseNotifications.mockReturnValue(
      createHookState({
        permissionStatus: {
          status: deniedPermissionStatus,
          syncStatus: 'permission_not_granted',
          canRequest: true,
          isSupported: true,
          didPrompt: true,
          isRequesting: false,
          error: null,
        },
        requestPermission,
      }),
    );

    render(<Notifications />);

    await waitFor(() => {
      expect(screen.getByText('Buka Pengaturan')).not.toBeNull();
    });

    expect(screen.queryByTestId('notifications-permission-reminder')).toBeNull();

    fireEvent.press(screen.getByText('Buka Pengaturan'));

    await waitFor(() => {
      expect(openSettingsSpy).toHaveBeenCalled();
    });

    expect(requestPermission).not.toHaveBeenCalled();
  });

  test('renders the empty inbox state', () => {
    render(<Notifications />);

    expect(screen.getByText('Belum ada notifikasi')).not.toBeNull();
    expect(
      screen.getByText(
        'Update pembayaran, pengiriman, dan pesanan akan muncul di sini saat tersedia.',
      ),
    ).not.toBeNull();
  });

  test('renders unread and read items, then marks unread items as read before navigating', async () => {
    const markAsRead = jest.fn(async () => true);
    mockUseNotifications.mockReturnValue(
      createHookState({
        items: [
          createNotification('01', {
            title: 'Pesanan dikirim',
            body: 'Pesanan Anda sedang menuju alamat tujuan.',
            type: 'order_shipped',
            cta_route: 'orders/track-shipment/[orderId]',
            data: { orderId: 'order-1', shipmentStage: 'shipped' },
          }),
          createNotification('02', {
            title: 'Pembayaran berhasil',
            body: 'Pembayaran Anda sudah kami terima.',
            read_at: '2026-04-23T11:00:00.000Z',
            data: { orderId: 'order-2' },
          }),
        ],
        status: 'success',
        unreadCount: 1,
        markAsRead,
      }),
    );

    render(<Notifications />);

    expect(screen.getByText('Belum dibaca')).not.toBeNull();
    expect(screen.getByText('Sudah dibaca')).not.toBeNull();

    fireEvent.press(screen.getByTestId('notification-item-01'));

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith('01');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/orders/track-shipment/[orderId]',
        params: { orderId: 'order-1' },
      });
    });
  });
});
