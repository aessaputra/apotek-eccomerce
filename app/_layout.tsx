// Import tamagui config to ensure TypeScript module augmentation is loaded
import '@/tamagui.config';

import { Fragment, useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
// Tamagui web CSS - loaded for web platform
import '@/tamagui-web.css';
import BottomSheetContents from '@/components/layouts/BottomSheetContents';
import BottomSheet from '@/components/elements/BottomSheet';
import { useTheme, useThemeName } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { loadFonts } from '@/utils/fonts';
import { loadImages } from '@/utils/images';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppSlice } from '@/slices';
import Provider, { AuthProvider } from '@/providers';

SplashScreen.preventAutoHideAsync();

function Router() {
  const theme = useTheme();
  const themeName = useThemeName();
  const isDark = themeName === 'dark';
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
        setTimeout(() => router.replace('/(main)/(tabs)'), 0);
      }
    } else {
      // Unauthenticated user on protected screens → redirect to login
      // Skip: google-auth (let token exchange complete)
      // Skip: index (handles its own declarative <Redirect>)
      const inMainGroup = currentGroup === '(main)';
      if (inMainGroup) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      }
    }
  }, [checked, loggedIn, segments, router]);

  // Get header background color for StatusBar consistency
  const headerBg = getThemeColor(theme, 'headerBackground', getThemeColor(theme, 'brandPrimary'));

  return (
    <Fragment>
      <Slot />
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={headerBg} translucent={false} />
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
