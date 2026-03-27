import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { getTokens, Text, useTheme } from 'tamagui';

import BottomSheet from '@/components/elements/BottomSheet';
import BottomSheetContents from '@/components/layouts/BottomSheetContents';
import TabBarIconWithPill from '@/components/layouts/TabBarIconWithPill';
import { HomeIcon, PackageIcon, UserIcon } from '@/components/icons';
import Provider, { AuthProvider } from '@/providers';
import { useAppSlice } from '@/slices';
import { DEFAULT_THEME_VALUES } from '@/themes';
import {
  BOTTOM_BAR_SHADOW,
  ICON_SIZES,
  TAB_BAR_HEIGHT,
  TAB_BAR_ITEM_PADDING_VERTICAL_TOKEN,
  TAB_BAR_LABEL_SIZE,
  TAB_BAR_LABEL_MARGIN_TOP_TOKEN,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
} from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';
import { loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';

import '@/tamagui-web.css';

SplashScreen.preventAutoHideAsync();

const VISIBLE_TAB_ROUTES = new Set(['home', 'orders', 'profile']);

// Route groups where the tab bar should be hidden (matched against segments[0])
const HIDDEN_GROUPS = new Set(['(auth)', 'google-auth', 'cart']);
// Screen names where the tab bar should be hidden (matched against any segment)
const HIDDEN_SCREENS = new Set([
  'edit-profile',
  'address-form',
  'addresses',
  'product-details',
  'search',
  'details',
]);

const spaceTokens = getTokens().space;
const TAB_BAR_ITEM_PADDING_VERTICAL = spaceTokens[TAB_BAR_ITEM_PADDING_VERTICAL_TOKEN]?.val ?? 4;
const TAB_BAR_LABEL_MARGIN_TOP = spaceTokens[TAB_BAR_LABEL_MARGIN_TOP_TOKEN]?.val ?? 4;

function Router() {
  const theme = useTheme();
  const { checked, loggedIn } = useAppSlice();
  const segments = useSegments();
  const router = useRouter();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const currentGroup = segments[0] as string | undefined;

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadImages(), loadFonts()]);
      } catch (error) {
        if (__DEV__) console.warn('[RootLayout] Failed to load assets:', error);
      } finally {
        setAssetsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (assetsReady && checked) {
      SplashScreen.hideAsync();
      setOpen(true);
    }
  }, [assetsReady, checked]);

  // Centralized auth guard: handles all auth-based redirects.
  // Uses setTimeout(0) to avoid navigation being swallowed during deep link re-mounts.
  useEffect(() => {
    // Wait until AuthProvider has finished initial session check
    if (!checked) return;

    const inAuthGroup = currentGroup === '(auth)';
    const isCallback = currentGroup === 'google-auth';

    if (loggedIn) {
      // Authenticated user on auth/callback screens → redirect to main app
      if (inAuthGroup || isCallback) {
        setTimeout(() => router.replace('/home'), 0);
      }
    } else {
      // Unauthenticated user on protected screens → redirect to login
      // Skip: google-auth (let token exchange complete)
      // Skip: index (handles its own declarative <Redirect>)
      const protectedRoutes = ['home', 'orders', 'profile', 'cart'];
      const inProtectedRoute = !!currentGroup && protectedRoutes.includes(currentGroup);
      if (inProtectedRoute) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }
    }
  }, [checked, currentGroup, loggedIn, router]);

  const tabBarColors = useMemo(() => {
    const background = getThemeColor(
      theme,
      'surfaceElevated',
      getThemeColor(
        theme,
        'surface',
        getThemeColor(theme, 'background', DEFAULT_THEME_VALUES.background),
      ),
    );
    return {
      background,
      borderColor: getThemeColor(theme, 'borderColor', DEFAULT_THEME_VALUES.borderColor),
      active: getThemeColor(
        theme,
        'primary',
        getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
      ),
      inactive: getThemeColor(theme, 'tabBarInactive', DEFAULT_THEME_VALUES.tabBarInactive),
      shadowColor: getThemeColor(theme, 'shadowColor', DEFAULT_THEME_VALUES.shadowColor),
    };
  }, [theme]);

  // Exact segment sets to avoid false positives from future routes reusing the same names
  const hideTabBar =
    HIDDEN_GROUPS.has(currentGroup ?? '') || segments.some(s => HIDDEN_SCREENS.has(s));

  const tabBarStyle = useMemo(() => {
    const base = {
      display: (hideTabBar ? 'none' : 'flex') as 'none' | 'flex',
      height: TAB_BAR_HEIGHT,
      paddingTop: TAB_BAR_PADDING_TOP,
      paddingBottom: TAB_BAR_PADDING_BOTTOM,
      backgroundColor: tabBarColors.background,
      borderTopWidth: 1,
      borderTopColor: tabBarColors.borderColor,
    };
    return Platform.OS === 'web'
      ? { ...base, ...BOTTOM_BAR_SHADOW }
      : { ...base, ...BOTTOM_BAR_SHADOW, shadowColor: tabBarColors.shadowColor, elevation: 8 };
  }, [hideTabBar, tabBarColors]);

  // Get header background color for StatusBar consistency
  const headerBg = getThemeColor(theme, 'headerBackground', getThemeColor(theme, 'brandPrimary'));

  // Memoized tab bar icon render functions to prevent recreation on each render
  const renderHomeIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabBarIconWithPill focused={focused}>
        <HomeIcon size={ICON_SIZES.BUTTON} color={color} />
      </TabBarIconWithPill>
    ),
    [],
  );

  const renderOrdersIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabBarIconWithPill focused={focused}>
        <PackageIcon size={ICON_SIZES.BUTTON} color={color} />
      </TabBarIconWithPill>
    ),
    [],
  );

  const renderProfileIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabBarIconWithPill focused={focused}>
        <UserIcon size={ICON_SIZES.BUTTON} color={color} />
      </TabBarIconWithPill>
    ),
    [],
  );

  const renderHomeTabButton = useCallback(
    ({
      onPress,
      onLongPress,
      accessibilityLabel,
      accessibilityState,
      testID,
      children,
      style,
    }: BottomTabBarButtonProps) => (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        testID={testID}
        style={style}
        accessibilityRole="tab"
        accessibilityHint="Buka halaman beranda">
        {children}
      </Pressable>
    ),
    [],
  );

  const renderOrdersTabButton = useCallback(
    ({
      onPress,
      onLongPress,
      accessibilityLabel,
      accessibilityState,
      testID,
      children,
      style,
    }: BottomTabBarButtonProps) => (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        testID={testID}
        style={style}
        accessibilityRole="tab"
        accessibilityHint="Buka halaman pesanan">
        {children}
      </Pressable>
    ),
    [],
  );

  const renderProfileTabButton = useCallback(
    ({
      onPress,
      onLongPress,
      accessibilityLabel,
      accessibilityState,
      testID,
      children,
      style,
    }: BottomTabBarButtonProps) => (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        testID={testID}
        style={style}
        accessibilityRole="tab"
        accessibilityHint="Buka halaman akun">
        {children}
      </Pressable>
    ),
    [],
  );

  return (
    <Fragment>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          href: VISIBLE_TAB_ROUTES.has(route.name) ? undefined : null,
          tabBarInactiveTintColor: tabBarColors.inactive,
          tabBarInactiveBackgroundColor: tabBarColors.background,
          tabBarActiveTintColor: tabBarColors.active,
          tabBarActiveBackgroundColor: tabBarColors.background,
          tabBarStyle,
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: TAB_BAR_ITEM_PADDING_VERTICAL,
          },
          tabBarLabel: ({ color, children }) => (
            <Text
              allowFontScaling={false}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              ellipsizeMode="clip"
              fontSize={TAB_BAR_LABEL_SIZE}
              marginTop={TAB_BAR_LABEL_MARGIN_TOP}
              textAlign="center"
              width="100%"
              style={{ color, includeFontPadding: false }}>
              {children}
            </Text>
          ),
        })}>
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            title: 'Beranda',
            tabBarAccessibilityLabel: 'Navigasi ke Beranda',
            tabBarButton: renderHomeTabButton,
            tabBarIcon: renderHomeIcon,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Pesanan',
            tabBarAccessibilityLabel: 'Navigasi ke Pesanan',
            tabBarButton: renderOrdersTabButton,
            tabBarIcon: renderOrdersIcon,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Akun',
            tabBarAccessibilityLabel: 'Navigasi ke Akun',
            tabBarButton: renderProfileTabButton,
            tabBarIcon: renderProfileIcon,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(auth)"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="google-auth"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="+not-found"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <StatusBar style="light" backgroundColor={headerBg} translucent={false} />
      <BottomSheet
        isOpen={isOpen}
        initialOpen
        // Use theme-aware background with light mode default fallback (#FFFFFF)
        backgroundStyle={{ backgroundColor: getThemeColor(theme, 'background') }}>
        <BottomSheetContents onClose={() => setOpen(false)} />
      </BottomSheet>
    </Fragment>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </Provider>
  );
}
