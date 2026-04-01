import { describe, test, expect } from '@jest/globals';
import { TABS, VISIBLE_TAB_ROUTES } from '@/constants/tabs';
import { BellIcon } from '@/components/icons';

describe('Tab Configuration', () => {
  test('has all 4 tabs defined', () => {
    expect(Object.keys(TABS)).toHaveLength(4);
    expect(TABS.home).toBeDefined();
    expect(TABS.orders).toBeDefined();
    expect(TABS.notifications).toBeDefined();
    expect(TABS.profile).toBeDefined();
  });

  test('VISIBLE_TAB_ROUTES contains all tabs in correct order', () => {
    expect(VISIBLE_TAB_ROUTES).toEqual(['home', 'orders', 'notifications', 'profile']);
  });

  test('all tabs have required metadata', () => {
    Object.values(TABS).forEach(tab => {
      expect(tab.name).toBeDefined();
      expect(tab.label).toBeDefined();
      expect(tab.icon).toBeDefined();
      expect(tab.accessibilityLabel).toBeDefined();
      expect(tab.accessibilityHint).toBeDefined();
    });
  });

  test('tab labels are in Indonesian', () => {
    expect(TABS.home.label).toBe('Beranda');
    expect(TABS.orders.label).toBe('Pesanan');
    expect(TABS.notifications.label).toBe('Notifikasi');
    expect(TABS.profile.label).toBe('Akun');
  });

  test('tab accessibility labels are in Indonesian', () => {
    expect(TABS.home.accessibilityLabel).toBe('Navigasi ke Beranda');
    expect(TABS.orders.accessibilityLabel).toBe('Navigasi ke Pesanan');
    expect(TABS.notifications.accessibilityLabel).toBe('Navigasi ke Notifikasi');
    expect(TABS.profile.accessibilityLabel).toBe('Navigasi ke Akun');
  });

  test('tab accessibility hints are in Indonesian', () => {
    expect(TABS.home.accessibilityHint).toBe('Buka halaman beranda');
    expect(TABS.orders.accessibilityHint).toBe('Buka halaman pesanan');
    expect(TABS.notifications.accessibilityHint).toBe('Buka halaman notifikasi');
    expect(TABS.profile.accessibilityHint).toBe('Buka halaman akun');
  });

  test('notifications tab has correct icon', () => {
    expect(TABS.notifications.icon).toBe(BellIcon);
  });

  test('all tabs have unique names', () => {
    const names = Object.values(TABS).map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('all tabs have unique labels', () => {
    const labels = Object.values(TABS).map(t => t.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});
