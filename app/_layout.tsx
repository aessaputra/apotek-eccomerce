import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import type { EventSubscription, NotificationResponse } from 'expo-notifications';
import * as Linking from 'expo-linking';
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
const NOTIFICATION_BLOCKING_AUTH_CALLBACK_ROUTES = new Set(['google-auth', 'reset-password']);
const POST_AUTH_NOTIFICATION_ALLOWED_TAB_ROUTES = new Set(['home', 'orders', 'profile']);
const PASSWORD_RECOVERY_ROUTE = 'reset-password';

function getCallbackUrlSegments(url: string) {
  const parsedUrl = new URL(url);

  return [parsedUrl.hostname, ...parsedUrl.pathname.split('/')]
    .map(segment => segment.trim())
    .filter(Boolean);
}

function appendSearchParamsFromString(target: URLSearchParams, rawParams: string) {
  const params = new URLSearchParams(rawParams);

  params.forEach((value, key) => {
    if (!target.has(key)) {
      target.set(key, value);
    }
  });
}

function getPasswordRecoveryRouteFromUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const isPasswordRecoveryUrl = getCallbackUrlSegments(url).some(
      segment => segment === PASSWORD_RECOVERY_ROUTE,
    );

    if (!isPasswordRecoveryUrl) {
      return null;
    }

    const recoveryParams = new URLSearchParams(parsedUrl.search);

    if (parsedUrl.hash) {
      appendSearchParamsFromString(recoveryParams, parsedUrl.hash.replace(/^#/, ''));
    }

    const queryString = recoveryParams.toString();
    return queryString ? `/(auth)/reset-password?${queryString}` : '/(auth)/reset-password';
  } catch {
    if (!url.includes(PASSWORD_RECOVERY_ROUTE)) {
      return null;
    }

    const queryStartIndex = url.indexOf('?');
    const hashStartIndex = url.indexOf('#');
    const recoveryParams = new URLSearchParams();

    if (queryStartIndex >= 0) {
      const queryEndIndex = hashStartIndex >= 0 ? hashStartIndex : undefined;
      appendSearchParamsFromString(recoveryParams, url.slice(queryStartIndex + 1, queryEndIndex));
    }

    if (hashStartIndex >= 0) {
      appendSearchParamsFromString(recoveryParams, url.slice(hashStartIndex + 1));
    }

    const queryString = recoveryParams.toString();
    return queryString ? `/(auth)/reset-password?${queryString}` : '/(auth)/reset-password';
  }
}

function isNotificationBlockingAuthCallbackUrl(url: string | null) {
  if (!url) {
    return false;
  }

  try {
    return getCallbackUrlSegments(url).some(segment =>
      NOTIFICATION_BLOCKING_AUTH_CALLBACK_ROUTES.has(segment),
    );
  } catch {
    return Array.from(NOTIFICATION_BLOCKING_AUTH_CALLBACK_ROUTES).some(route =>
      url.includes(route),
    );
  }
}

function Router() {
  const colorScheme = useColorScheme();
  const { checked, loggedIn } = useAppSlice();
  const segments = useSegments();
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const assetsReadyRef = useRef(false);
  const checkedRef = useRef(checked);
  const loggedInRef = useRef(loggedIn);
  const isNotificationBlockingAuthCallbackRouteRef = useRef(false);
  const handledPasswordRecoveryRouteRef = useRef<string | null>(null);
  const pendingNotificationResponseRef = useRef<NotificationResponse | null>(null);
  const lastHandledNotificationResponseIdRef = useRef<string | null>(null);
  const routeSegments = Array.from(segments);
  const currentGroup = routeSegments[0];
  const currentAuthRoute = routeSegments[1];
  const currentTabRoute = routeSegments[1];
  const shouldShowWelcomeSheet = config.env === 'development';
  const inAuthGroup = currentGroup === '(auth)';
  const isCallback = currentGroup === 'google-auth';
  const isRecoveryAuthRoute = inAuthGroup && currentAuthRoute === 'reset-password';
  const hasSettledPostAuthTabRoute =
    loggedIn &&
    currentGroup === '(tabs)' &&
    (!currentTabRoute || POST_AUTH_NOTIFICATION_ALLOWED_TAB_ROUTES.has(currentTabRoute));
  const isNotificationBlockingAuthCallbackDeepLink =
    !hasSettledPostAuthTabRoute && isNotificationBlockingAuthCallbackUrl(linkingUrl);
  const isNotificationBlockingAuthCallbackFlow =
    isCallback || isRecoveryAuthRoute || isNotificationBlockingAuthCallbackDeepLink;
  const passwordRecoveryRouteFromUrl = getPasswordRecoveryRouteFromUrl(linkingUrl);
  const isHandledPasswordRecoveryReplay =
    passwordRecoveryRouteFromUrl &&
    handledPasswordRecoveryRouteRef.current === passwordRecoveryRouteFromUrl;

  useEffect(() => {
    assetsReadyRef.current = assetsReady;
  }, [assetsReady]);

  useEffect(() => {
    checkedRef.current = checked;
  }, [checked]);

  useEffect(() => {
    loggedInRef.current = loggedIn;
  }, [loggedIn]);

  useEffect(() => {
    isNotificationBlockingAuthCallbackRouteRef.current = isNotificationBlockingAuthCallbackFlow;

    if (isNotificationBlockingAuthCallbackFlow) {
      pendingNotificationResponseRef.current = null;
    }
  }, [isNotificationBlockingAuthCallbackFlow]);

  const navigateFromNotificationResponse = useCallback(
    (response: NotificationResponse | null) => {
      if (!response) {
        return;
      }

      if (isNotificationBlockingAuthCallbackRouteRef.current) {
        pendingNotificationResponseRef.current = null;
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

        const initialUrl = await Linking.getInitialURL();

        if (isNotificationBlockingAuthCallbackUrl(initialUrl)) {
          isNotificationBlockingAuthCallbackRouteRef.current = true;
          pendingNotificationResponseRef.current = null;
          return;
        }

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

    if (passwordRecoveryRouteFromUrl && isRecoveryAuthRoute) {
      handledPasswordRecoveryRouteRef.current = passwordRecoveryRouteFromUrl;
    }

    if (passwordRecoveryRouteFromUrl && !isRecoveryAuthRoute && !isHandledPasswordRecoveryReplay) {
      handledPasswordRecoveryRouteRef.current = passwordRecoveryRouteFromUrl;
      setTimeout(() => router.replace(passwordRecoveryRouteFromUrl), 0);
      return;
    }

    if (loggedIn) {
      if ((inAuthGroup && !isRecoveryAuthRoute) || isCallback) {
        setTimeout(() => router.navigate('/home'), 0);
      }
    } else {
      const inProtectedRoute = !!currentGroup && PROTECTED_ROUTE_GROUPS.includes(currentGroup);

      if (inProtectedRoute) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }
    }
  }, [
    checked,
    currentAuthRoute,
    currentGroup,
    inAuthGroup,
    isHandledPasswordRecoveryReplay,
    isCallback,
    isRecoveryAuthRoute,
    loggedIn,
    passwordRecoveryRouteFromUrl,
    router,
  ]);

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
