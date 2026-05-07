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

jest.mock('@/providers', () => ({
  useNotificationsContext: () => mockUseNotifications(),
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
  const baseState: UseNotificationsReturn = {
    items: [],
    status: 'empty',
    error: null,
    unreadCount: 0,
    isLoading: false,
    isRefreshing: false,
    hasMore: false,
    nextCursor: null,
    isLoadingMore: false,
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
    loadMore: jest.fn(async () => undefined),
    markAsRead: jest.fn(async () => true),
    markAllAsRead: jest.fn(async () => true),
    requestPermission: jest.fn(async () => true),
  };

  return {
    ...baseState,
    ...overrides,
    loadMore: overrides.loadMore ?? baseState.loadMore,
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

  test('renders inline permission banner when permission is requestable', () => {
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
      }),
    );

    render(<Notifications />);

    expect(screen.getByTestId('notifications-permission-banner')).not.toBeNull();
    expect(screen.getByText('Aktifkan notifikasi')).not.toBeNull();
    expect(screen.getByText('Dapatkan update pesanan dan pembayaran tepat waktu.')).not.toBeNull();
    expect(screen.getByText('Aktifkan Sekarang')).not.toBeNull();
  });

  test('does not render permission banner when permission is not requestable', () => {
    mockUseNotifications.mockReturnValue(createHookState());

    render(<Notifications />);

    expect(screen.queryByTestId('notifications-permission-banner')).toBeNull();
  });

  test('requests permission from the banner CTA', async () => {
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

    fireEvent.press(screen.getByText('Aktifkan Sekarang'));

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalled();
    });
  });

  test('opens device settings from the banner CTA when permission is denied', async () => {
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

    expect(screen.getByTestId('notifications-permission-banner')).not.toBeNull();
    expect(screen.getByText('Notifikasi belum aktif')).not.toBeNull();
    expect(screen.getByText('Buka pengaturan untuk menyalakan izin notifikasi.')).not.toBeNull();

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

    const item = screen.getByTestId('notification-item-01');
    expect(item.props.accessibilityLabel).toContain('Belum dibaca');
    expect(item.props.accessibilityHint).toContain('menandai dibaca');

    fireEvent.press(item);

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith('01');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/orders/track-shipment/[orderId]',
        params: { orderId: 'order-1' },
      });
    });
  });
});
