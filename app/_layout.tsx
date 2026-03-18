// Import tamagui config to ensure TypeScript module augmentation is loaded
import '@/tamagui.config';

import { Fragment, useEffect, useMemo, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
// Tamagui web CSS - loaded for web platform
import '@/tamagui-web.css';
import { Platform, Text } from 'react-native';
import BottomSheetContents from '@/components/layouts/BottomSheetContents';
import BottomSheet from '@/components/elements/BottomSheet';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { fonts, loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppSlice } from '@/slices';
import Provider, { AuthProvider } from '@/providers';
import { DEFAULT_THEME_VALUES } from '@/themes';
import {
  ICON_SIZES,
  TAB_BAR_HEIGHT,
  TAB_BAR_LABEL_SIZE,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
} from '@/constants/ui';
import TabBarIconWithPill from '@/components/layouts/TabBarIconWithPill';
import { HomeIcon, PackageIcon, UserIcon } from '@/components/icons';

SplashScreen.preventAutoHideAsync();

const TAB_BAR_ITEM_PADDING_VERTICAL = 4;
const TAB_BAR_LABEL_MARGIN_TOP = 2;
const VISIBLE_TAB_ROUTES = new Set(['home', 'orders', 'profile']);

function Router() {
  const theme = useTheme();
  const { checked, loggedIn } = useAppSlice();
  const segments = useSegments();
  const router = useRouter();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

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

    const currentGroup = segments[0] as string | undefined;
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
        setTimeout(() => router.replace('/login'), 0);
      }
    }
  }, [checked, loggedIn, segments, router]);

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

  const currentGroup = segments[0] as string | undefined;
  const hideTabBar =
    currentGroup === '(auth)' ||
    currentGroup === 'google-auth' ||
    currentGroup === 'cart' ||
    segments.includes('edit-profile') ||
    segments.includes('address-form') ||
    segments.includes('addresses') ||
    segments.includes('product-details');

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
      ? { ...base, boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' }
      : {
          ...base,
          elevation: 8,
          shadowColor: tabBarColors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        };
  }, [hideTabBar, tabBarColors]);

  // Get header background color for StatusBar consistency
  const headerBg = getThemeColor(theme, 'headerBackground', getThemeColor(theme, 'brandPrimary'));

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
            minWidth: 70,
            paddingVertical: TAB_BAR_ITEM_PADDING_VERTICAL,
          },
          tabBarAllowFontScaling: false,
          tabBarLabel: ({ color, children }) => (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                color,
                fontFamily: fonts.poppins.regular,
                fontSize: TAB_BAR_LABEL_SIZE,
                marginTop: TAB_BAR_LABEL_MARGIN_TOP,
                textAlign: 'center',
                width: '100%',
                includeFontPadding: false,
              }}>
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
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWithPill focused={focused}>
                <HomeIcon size={ICON_SIZES.BUTTON} color={color} />
              </TabBarIconWithPill>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Pesanan',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWithPill focused={focused}>
                <PackageIcon size={ICON_SIZES.BUTTON} color={color} />
              </TabBarIconWithPill>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Akun',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIconWithPill focused={focused}>
                <UserIcon size={ICON_SIZES.BUTTON} color={color} />
              </TabBarIconWithPill>
            ),
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
