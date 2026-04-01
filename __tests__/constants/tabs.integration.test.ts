import { describe, test, expect } from '@jest/globals';
import {
  TABS,
  VISIBLE_TAB_ROUTES,
  shouldShowTabBar,
  isVisibleTab,
  getTabMetadata,
  type TabRouteName,
} from '@/constants/tabs';

describe('Tab Configuration Integration', () => {
  test('VISIBLE_TAB_ROUTES contains all 4 tabs in correct order', () => {
    expect(VISIBLE_TAB_ROUTES).toEqual(['home', 'orders', 'notifications', 'profile']);
    expect(VISIBLE_TAB_ROUTES.length).toBe(4);
  });

  test('each VISIBLE_TAB_ROUTES entry has corresponding TABS metadata', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      const tab = TABS[routeName];
      expect(tab).toBeDefined();
      expect(tab.name).toBe(routeName);
      expect(tab.label).toBeTruthy();
      expect(tab.accessibilityLabel).toBeTruthy();
      expect(tab.accessibilityHint).toBeTruthy();
      expect(typeof tab.icon).toBe('function');
    });
  });

  test('Notifications tab has correct Indonesian metadata', () => {
    const notificationsTab = TABS.notifications;
    expect(notificationsTab.label).toBe('Notifikasi');
    expect(notificationsTab.accessibilityLabel).toBe('Navigasi ke Notifikasi');
    expect(notificationsTab.accessibilityHint).toBe('Buka halaman notifikasi');
  });

  test('all tabs have Indonesian labels and hints', () => {
    const expectedLabels = {
      home: { label: 'Beranda', hint: 'Buka halaman beranda' },
      orders: { label: 'Pesanan', hint: 'Buka halaman pesanan' },
      notifications: { label: 'Notifikasi', hint: 'Buka halaman notifikasi' },
      profile: { label: 'Akun', hint: 'Buka halaman akun' },
    };

    VISIBLE_TAB_ROUTES.forEach(routeName => {
      const tab = TABS[routeName];
      const expected = expectedLabels[routeName as keyof typeof expectedLabels];
      expect(tab.label).toBe(expected.label);
      expect(tab.accessibilityHint).toBe(expected.hint);
    });
  });

  test('shouldShowTabBar hides tab bar for auth routes', () => {
    expect(shouldShowTabBar('(auth)', ['(auth)', 'login'])).toBe(false);
    expect(shouldShowTabBar('google-auth', ['google-auth'])).toBe(false);
    expect(shouldShowTabBar('cart', ['cart'])).toBe(false);
  });

  test('shouldShowTabBar shows tab bar for visible tabs', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      expect(shouldShowTabBar(routeName, [routeName])).toBe(true);
    });
  });

  test('shouldShowTabBar hides tab bar for hidden screens', () => {
    const hiddenScreens = ['edit-profile', 'address-form', 'product-details'];
    hiddenScreens.forEach(screen => {
      expect(shouldShowTabBar('profile', ['profile', screen])).toBe(false);
    });
  });

  test('isVisibleTab returns true for visible tabs', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      expect(isVisibleTab(routeName)).toBe(true);
    });
  });

  test('isVisibleTab returns false for non-visible routes', () => {
    expect(isVisibleTab('cart')).toBe(false);
    expect(isVisibleTab('index')).toBe(false);
    expect(isVisibleTab('login')).toBe(false);
    expect(isVisibleTab('unknown')).toBe(false);
  });

  test('getTabMetadata returns correct metadata for valid tabs', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      const metadata = getTabMetadata(routeName);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe(routeName);
    });
  });

  test('getTabMetadata returns undefined for invalid routes', () => {
    expect(getTabMetadata('invalid')).toBeUndefined();
    expect(getTabMetadata('')).toBeUndefined();
    expect(getTabMetadata('cart')).toBeUndefined();
  });

  test('tab bar visibility logic is consistent across all routes', () => {
    const allRoutes = [...VISIBLE_TAB_ROUTES, 'cart', '(auth)', 'google-auth', 'login'];
    allRoutes.forEach(route => {
      const isVisible = isVisibleTab(route);
      const shouldShow = shouldShowTabBar(route, [route]);

      if (VISIBLE_TAB_ROUTES.includes(route as TabRouteName)) {
        expect(isVisible).toBe(true);
        expect(shouldShow).toBe(true);
      }
    });
  });
});
