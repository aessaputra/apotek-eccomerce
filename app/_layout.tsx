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
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppSlice } from '@/slices';
import Provider, { AuthProvider } from '@/providers';

SplashScreen.preventAutoHideAsync();

function Router() {
  const theme = useTheme();
  const themeName = useThemeName();
  const isDark = themeName === 'dark';
  const { checked } = useAppSlice();
  const [assetsReady, setAssetsReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadImages(), loadFonts()]);
      setAssetsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (assetsReady && checked) {
      SplashScreen.hideAsync();
      setOpen(true);
    }
  }, [assetsReady, checked]);

  return (
    <Fragment>
      <Slot />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BottomSheet
        isOpen={isOpen}
        initialOpen
        backgroundStyle={{ backgroundColor: getThemeColor(theme, 'background', '#0f0f0f') }}>
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
