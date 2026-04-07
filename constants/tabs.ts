import type { ComponentProps } from 'react';
import { HomeIcon, PackageIcon, BellIcon, UserIcon } from '@/components/icons';

export type TabRouteName = 'home' | 'orders' | 'notifications' | 'profile';

export interface TabMetadata {
  name: TabRouteName;
  label: string;
  icon: React.ComponentType<ComponentProps<typeof HomeIcon>>;
  accessibilityLabel: string;
  accessibilityHint: string;
}

/**
 * Tab metadata configuration
 * Single source of truth for all tab definitions
 */
export const TABS: Record<TabRouteName, TabMetadata> = {
  home: {
    name: 'home',
    label: 'Beranda',
    icon: HomeIcon,
    accessibilityLabel: 'Navigasi ke Beranda',
    accessibilityHint: 'Buka halaman beranda',
  },
  orders: {
    name: 'orders',
    label: 'Pesanan',
    icon: PackageIcon,
    accessibilityLabel: 'Navigasi ke Pesanan',
    accessibilityHint: 'Buka halaman pesanan',
  },
  notifications: {
    name: 'notifications',
    label: 'Notifikasi',
    icon: BellIcon,
    accessibilityLabel: 'Navigasi ke Notifikasi',
    accessibilityHint: 'Buka halaman notifikasi',
  },
  profile: {
    name: 'profile',
    label: 'Akun',
    icon: UserIcon,
    accessibilityLabel: 'Navigasi ke Akun',
    accessibilityHint: 'Buka halaman akun',
  },
} as const;

/** Array of visible tab routes in display order */
export const VISIBLE_TAB_ROUTES: TabRouteName[] = ['home', 'orders', 'notifications', 'profile'];

/** Set of visible tab routes for quick lookup */
export const VISIBLE_TAB_ROUTE_SET = new Set<TabRouteName>(VISIBLE_TAB_ROUTES);

/** Route groups where the tab bar should be hidden (matched against segments[0]) */
export const HIDDEN_ROUTE_GROUPS = new Set<string>(['(auth)', 'google-auth', 'cart']);

/** Screen names where the tab bar should be hidden (matched against any segment) */
export const HIDDEN_ROUTE_SCREENS = new Set<string>([
  'edit-profile',
  'address-form',
  'addresses',
  'address-search',
  'area-picker',
  'product-details',
  'search',
  'details',
  'unpaid',
  '[orderId]',
]);

function isTabRouteName(routeName: string): routeName is TabRouteName {
  return VISIBLE_TAB_ROUTE_SET.has(routeName as TabRouteName);
}

/**
 * Get tab metadata by route name
 * @param routeName - The route name to look up
 * @returns TabMetadata or undefined if not found
 */
export function getTabMetadata(routeName: string): TabMetadata | undefined {
  if (isTabRouteName(routeName)) {
    return TABS[routeName];
  }
  return undefined;
}

/**
 * Check if a route should show the tab bar
 * @param currentGroup - Current route group (segments[0])
 * @param segments - All route segments
 * @returns boolean indicating if tab bar should be visible
 */
export function shouldShowTabBar(currentGroup: string | undefined, segments: string[]): boolean {
  if (currentGroup && HIDDEN_ROUTE_GROUPS.has(currentGroup)) {
    return false;
  }
  return !segments.some(segment => HIDDEN_ROUTE_SCREENS.has(segment));
}

/**
 * Check if a route name is a visible tab
 * @param routeName - Route name to check
 * @returns boolean indicating if route is a visible tab
 */
export function isVisibleTab(routeName: string): boolean {
  return isTabRouteName(routeName);
}
