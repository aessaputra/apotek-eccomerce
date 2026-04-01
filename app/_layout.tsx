import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme, useWindowDimensions } from 'react-native';
import type {
  BottomTabNavigationOptions,
  BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useTheme } from 'tamagui';

import TabBarLabel from '@/components/layouts/TabBarLabel';
import TabBarButton from '@/components/layouts/TabBarButton';
import TabBarIcon from '@/components/layouts/TabBarIcon';
import WelcomeSheet from '@/components/layouts/WelcomeSheet';
import Provider, { AuthProvider } from '@/providers';
import { useAppSlice } from '@/slices';
import { DEFAULT_THEME_VALUES } from '@/themes';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
  TAB_BAR_BORDER_TOP_WIDTH,
  TAB_BAR_ELEVATION,
  getBottomBarShadow,
} from '@/constants/ui';
import { TABS, VISIBLE_TAB_ROUTES, shouldShowTabBar, type TabRouteName } from '@/constants/tabs';
import { getTabBarLayoutMetrics } from '@/utils/tabBarTypography';
import config from '@/utils/config';
import { getThemeColor } from '@/utils/theme';
import { loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';

import '@/tamagui-web.css';

SplashScreen.preventAutoHideAsync();

const PROTECTED_ROUTES = [...VISIBLE_TAB_ROUTES, 'cart'];

function Router() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { checked, loggedIn } = useAppSlice();
  const segments = useSegments();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const currentGroup = segments[0] as string | undefined;
  const shouldShowWelcomeSheet = config.env === 'development';

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
      setOpen(shouldShowWelcomeSheet);
    }
  }, [assetsReady, checked, shouldShowWelcomeSheet]);

  useEffect(() => {
    if (!checked) return;

    const inAuthGroup = currentGroup === '(auth)';
    const isCallback = currentGroup === 'google-auth';

    if (loggedIn) {
      if (inAuthGroup || isCallback) {
        setTimeout(() => router.navigate('/home'), 0);
      }
    } else {
      const inProtectedRoute = !!currentGroup && PROTECTED_ROUTES.includes(currentGroup);
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

  const hideTabBar = !shouldShowTabBar(currentGroup, segments);
  const tabBarLayoutMetrics = useMemo(() => getTabBarLayoutMetrics(windowWidth), [windowWidth]);

  const tabBarStyle = useMemo(() => {
    const base = {
      display: (hideTabBar ? 'none' : 'flex') as 'none' | 'flex',
      flexDirection: 'row' as const,
      width: '100%' as const,
      height: TAB_BAR_HEIGHT,
      paddingTop: TAB_BAR_PADDING_TOP,
      paddingBottom: TAB_BAR_PADDING_BOTTOM,
      backgroundColor: tabBarColors.background,
      borderTopWidth: TAB_BAR_BORDER_TOP_WIDTH,
      borderTopColor: tabBarColors.borderColor,
    };
    const shadowStyle = getBottomBarShadow(tabBarColors.shadowColor);
    return Platform.OS === 'web'
      ? { ...base, ...shadowStyle }
      : { ...base, ...shadowStyle, elevation: TAB_BAR_ELEVATION };
  }, [hideTabBar, tabBarColors]);

  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  const renderTabIcon = useCallback((tabName: TabRouteName) => {
    const TabIcon = ({ color, focused }: { color: string; focused: boolean }) => {
      const tabConfig = TABS[tabName];
      return <TabBarIcon color={color} focused={focused} icon={tabConfig.icon} />;
    };
    TabIcon.displayName = `TabIcon_${tabName}`;
    return TabIcon;
  }, []);

  const renderTabButton = useCallback((tabName: TabRouteName) => {
    const tabConfig = TABS[tabName];
    const TabButton = (props: BottomTabBarButtonProps) => {
      const { children, ref: _ref, ...rest } = props;

      return (
        <TabBarButton {...rest} accessibilityHint={tabConfig.accessibilityHint}>
          {children}
        </TabBarButton>
      );
    };
    TabButton.displayName = `TabButton_${tabName}`;
    return TabButton;
  }, []);

  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarInactiveTintColor: tabBarColors.inactive,
    tabBarInactiveBackgroundColor: tabBarColors.background,
    tabBarActiveTintColor: tabBarColors.active,
    tabBarActiveBackgroundColor: tabBarColors.background,
    tabBarStyle,
    tabBarItemStyle: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tabBarLayoutMetrics.itemPaddingVertical,
      paddingHorizontal: tabBarLayoutMetrics.itemPaddingHorizontal,
    },
    tabBarLabel: ({ color, children }) => <TabBarLabel color={color}>{children}</TabBarLabel>,
  };

  const getTabScreenOptions = useCallback(
    (tabName: TabRouteName): BottomTabNavigationOptions => ({
      title: TABS[tabName].label,
      tabBarAccessibilityLabel: TABS[tabName].accessibilityLabel,
      tabBarButton: renderTabButton(tabName),
      tabBarIcon: renderTabIcon(tabName),
    }),
    [renderTabButton, renderTabIcon],
  );

  // Gate Tabs render until fonts are loaded to prevent fallback font on Android cold start
  if (!assetsReady) {
    return null;
  }

  return (
    <Fragment>
      <Tabs detachInactiveScreens={false} screenOptions={screenOptions}>
        <Tabs.Screen name="index" options={{ href: null }} />
        {VISIBLE_TAB_ROUTES.map(tabName => (
          <Tabs.Screen key={tabName} name={tabName} options={getTabScreenOptions(tabName)} />
        ))}
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="(auth)" options={{ href: null }} />
        <Tabs.Screen name="google-auth" options={{ href: null }} />
        <Tabs.Screen name="+not-found" options={{ href: null }} />
      </Tabs>
      <StatusBar
        style={statusBarStyle}
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
        hidden={false}
      />
      {shouldShowWelcomeSheet ? <WelcomeSheet open={isOpen} onOpenChange={setOpen} /> : null}
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
