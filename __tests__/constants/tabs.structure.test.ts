import { describe, test, expect } from '@jest/globals';
import { TABS, VISIBLE_TAB_ROUTES } from '@/constants/tabs';

describe('Tab Navigation Structure', () => {
  test('all visible tabs have route files', () => {
    const expectedRoutes = ['home', 'orders', 'notifications', 'profile'];
    expect(VISIBLE_TAB_ROUTES).toEqual(expectedRoutes);
  });

  test('all tabs have required metadata for navigation', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      const tab = TABS[routeName];
      expect(tab).toBeDefined();
      expect(tab.name).toBe(routeName);
      expect(tab.label).toBeTruthy();
      expect(typeof tab.icon).toBe('function');
      expect(tab.accessibilityLabel).toBeTruthy();
      expect(tab.accessibilityHint).toBeTruthy();
    });
  });

  test('notifications tab is included in visible routes', () => {
    expect(VISIBLE_TAB_ROUTES).toContain('notifications');
    expect(TABS.notifications).toBeDefined();
    expect(TABS.notifications.label).toBe('Notifikasi');
  });

  test('tab order matches display order', () => {
    const expectedOrder = [
      { name: 'home', label: 'Beranda' },
      { name: 'orders', label: 'Pesanan' },
      { name: 'notifications', label: 'Notifikasi' },
      { name: 'profile', label: 'Akun' },
    ];

    expectedOrder.forEach((expected, index) => {
      const routeName = VISIBLE_TAB_ROUTES[index];
      expect(routeName).toBe(expected.name);
      expect(TABS[routeName].label).toBe(expected.label);
    });
  });

  test('all tab icons are valid components', () => {
    VISIBLE_TAB_ROUTES.forEach(routeName => {
      const IconComponent = TABS[routeName].icon;
      expect(IconComponent).toBeDefined();
      expect(typeof IconComponent).toBe('function');
    });
  });

  test('accessibility labels are in Indonesian', () => {
    const expectedLabels = {
      home: 'Navigasi ke Beranda',
      orders: 'Navigasi ke Pesanan',
      notifications: 'Navigasi ke Notifikasi',
      profile: 'Navigasi ke Akun',
    };

    VISIBLE_TAB_ROUTES.forEach(routeName => {
      expect(TABS[routeName].accessibilityLabel).toBe(
        expectedLabels[routeName as keyof typeof expectedLabels],
      );
    });
  });

  test('accessibility hints are in Indonesian', () => {
    const expectedHints = {
      home: 'Buka halaman beranda',
      orders: 'Buka halaman pesanan',
      notifications: 'Buka halaman notifikasi',
      profile: 'Buka halaman akun',
    };

    VISIBLE_TAB_ROUTES.forEach(routeName => {
      expect(TABS[routeName].accessibilityHint).toBe(
        expectedHints[routeName as keyof typeof expectedHints],
      );
    });
  });
});
