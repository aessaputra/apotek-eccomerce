import React from 'react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import Notifications from '@/scenes/notifications/Notifications';
import type { UseNotificationsReturn } from '@/hooks/useNotifications';
import type { NotificationRow } from '@/types/notification';

const mockUseNotifications = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
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

describe('<Notifications /> Theme', () => {
  beforeEach(() => {
    mockUseNotifications.mockReset();
    mockUseNotifications.mockReturnValue(createHookState());
  });

  test('renders the empty inbox copy in light theme', () => {
    render(<Notifications />);

    expect(screen.getByText('Belum ada notifikasi')).toBeTruthy();
    expect(
      screen.getByText(
        'Update pembayaran, pengiriman, dan pesanan akan muncul di sini saat tersedia.',
      ),
    ).toBeTruthy();
  });

  test('renders inline permission banner in dark theme when permission is requestable', () => {
    mockUseNotifications.mockReturnValue(
      createHookState({
        items: [createNotification('01')],
        status: 'success',
        unreadCount: 1,
        permissionStatus: {
          status: 'idle',
          syncStatus: 'permission_not_granted',
          canRequest: true,
          isSupported: true,
          didPrompt: true,
          isRequesting: false,
          error: 'Gagal mengaktifkan notifikasi.',
        },
      }),
    );

    renderWithDarkTheme(<Notifications />);

    expect(screen.getByTestId('notifications-permission-banner')).toBeTruthy();
    expect(screen.getByText('Aktifkan notifikasi')).toBeTruthy();
    expect(screen.getByText('Aktifkan Sekarang')).toBeTruthy();
    expect(screen.getByText('Gagal mengaktifkan notifikasi.')).toBeTruthy();
  });
});
