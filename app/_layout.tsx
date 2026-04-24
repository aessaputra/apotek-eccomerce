import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import type { EventSubscription, NotificationResponse } from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';

import {
  getNotificationResponseIdentifier,
  resolveNotificationNavigationHref,
} from '@/utils/notificationRouting';
import WelcomeSheet from '@/components/layouts/WelcomeSheet';
import Provider, { AuthProvider } from '@/providers';
import { QueryProvider } from '@/providers/QueryProvider';
import { useAppSlice } from '@/slices';
import config from '@/utils/config';
import { loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';
import {
  bootstrapNotificationsAsync,
  getExpoNotificationsModuleAsync,
  hasNativeNotificationSupport,
} from '@/utils/notifications';

import '@/tamagui-web.css';

SplashScreen.preventAutoHideAsync();

const PROTECTED_ROUTE_GROUPS = ['(tabs)', 'cart', 'product-details'];

function Router() {
  const colorScheme = useColorScheme();
  const { checked, loggedIn } = useAppSlice();
  const segments = useSegments();
  const router = useRouter();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const assetsReadyRef = useRef(false);
  const checkedRef = useRef(checked);
  const loggedInRef = useRef(loggedIn);
  const pendingNotificationResponseRef = useRef<NotificationResponse | null>(null);
  const lastHandledNotificationResponseIdRef = useRef<string | null>(null);
  const currentGroup = segments[0] as string | undefined;
  const shouldShowWelcomeSheet = config.env === 'development';

  useEffect(() => {
    assetsReadyRef.current = assetsReady;
  }, [assetsReady]);

  useEffect(() => {
    checkedRef.current = checked;
  }, [checked]);

  useEffect(() => {
    loggedInRef.current = loggedIn;
  }, [loggedIn]);

  const navigateFromNotificationResponse = useCallback(
    (response: NotificationResponse | null) => {
      if (!response) {
        return;
      }

      pendingNotificationResponseRef.current = response;

      if (!assetsReadyRef.current || !checkedRef.current || !loggedInRef.current) {
        return;
      }

      const responseIdentifier = getNotificationResponseIdentifier(response);

      if (
        responseIdentifier &&
        lastHandledNotificationResponseIdRef.current === responseIdentifier
      ) {
        pendingNotificationResponseRef.current = null;
        return;
      }

      const href = resolveNotificationNavigationHref(response.notification.request.content.data);

      pendingNotificationResponseRef.current = null;

      if (responseIdentifier) {
        lastHandledNotificationResponseIdRef.current = responseIdentifier;
      }

      setTimeout(() => router.navigate(href), 0);
    },
    [router],
  );

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
    navigateFromNotificationResponse(pendingNotificationResponseRef.current);

    if (checked && !loggedIn) {
      pendingNotificationResponseRef.current = null;
    }
  }, [checked, loggedIn, navigateFromNotificationResponse]);

  useEffect(() => {
    if (!hasNativeNotificationSupport()) {
      return;
    }

    let cancelled = false;
    let responseSubscription: EventSubscription | null = null;

    void (async () => {
      try {
        const Notifications = await getExpoNotificationsModuleAsync();

        await bootstrapNotificationsAsync();

        if (cancelled) {
          return;
        }

        responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          navigateFromNotificationResponse(response);
        });

        const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();

        if (cancelled || !lastNotificationResponse) {
          return;
        }

        navigateFromNotificationResponse(lastNotificationResponse);
      } catch (error) {
        if (__DEV__) {
          console.warn('[RootLayout] notification bootstrap error:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      responseSubscription?.remove();
    };
  }, [navigateFromNotificationResponse]);

  useEffect(() => {
    if (!checked) return;

    const inAuthGroup = currentGroup === '(auth)';
    const isCallback = currentGroup === 'google-auth';

    if (loggedIn) {
      if (inAuthGroup || isCallback) {
        setTimeout(() => router.navigate('/home'), 0);
      }
    } else {
      const inProtectedRoute = !!currentGroup && PROTECTED_ROUTE_GROUPS.includes(currentGroup);

      if (inProtectedRoute) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }
    }
  }, [checked, currentGroup, loggedIn, router]);

  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  // Gate Tabs render until fonts are loaded to prevent fallback font on Android cold start
  if (!assetsReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product-details" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="google-auth" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar
        style={statusBarStyle}
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
        hidden={false}
      />
      {shouldShowWelcomeSheet ? <WelcomeSheet open={isOpen} onOpenChange={setOpen} /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <QueryProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryProvider>
    </Provider>
  );
}
